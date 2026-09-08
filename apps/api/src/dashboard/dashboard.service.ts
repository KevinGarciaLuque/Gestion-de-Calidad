import { Injectable } from '@nestjs/common';
import type { CategoriaRiesgo, EstadoHallazgo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { periodoActual } from '../indicadores/periodos';

const DIA = 86_400_000;

export type NivelRadar = 'URGENTE' | 'AVISO' | 'INFO';

export interface AlertaRadar {
  nivel: NivelRadar;
  texto: string;
  ruta: string;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async resumen() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const inicioAnio = new Date(anio, 0, 1);

    const [indicadores, riesgos, hallazgos, acciones, documentos] = await Promise.all([
      this.indicadores(),
      this.riesgos(ahora),
      this.hallazgos(inicioAnio),
      this.acciones(ahora),
      this.documentos(ahora),
    ]);
    const [auditorias, mcc] = await Promise.all([this.auditorias(anio), this.mcc(inicioAnio)]);

    const radar = await this.radar(ahora);

    return {
      generadoAt: ahora.toISOString(),
      anio,
      indicadores,
      riesgos,
      auditorias,
      hallazgos,
      acciones,
      documentos,
      mcc,
      radar,
    };
  }

  // ── Indicadores ───────────────────────────────────────────────────────────
  private async indicadores() {
    const lista = await this.prisma.indicador.findMany({
      where: { activo: true, archivadoAt: null },
      select: {
        id: true,
        frecuencia: true,
        mediciones: {
          orderBy: [{ anio: 'desc' }, { periodo: 'desc' }],
          take: 3,
          select: { anio: true, periodo: true, semaforo: true },
        },
      },
    });

    let verde = 0;
    let amarillo = 0;
    let rojo = 0;
    let conMedicion = 0;
    let capturaPendiente = 0;

    for (const ind of lista) {
      const ultima = ind.mediciones[0];
      if (ultima) {
        conMedicion++;
        if (ultima.semaforo === 'VERDE') verde++;
        else if (ultima.semaforo === 'AMARILLO') amarillo++;
        else rojo++;
      }
      const actual = periodoActual(ind.frecuencia);
      const capturado = ind.mediciones.some((m) => m.anio === actual.anio && m.periodo === actual.periodo);
      if (!capturado) capturaPendiente++;
    }

    const cumplimientoPct = conMedicion ? Math.round((verde / conMedicion) * 100) : null;

    return {
      total: lista.length,
      conMedicion,
      dentroDeMeta: verde,
      fueraDeMeta: amarillo + rojo,
      cumplimientoPct,
      capturaPendiente,
      semaforo: { verde, amarillo, rojo },
    };
  }

  // ── Riesgos ───────────────────────────────────────────────────────────────
  private async riesgos(ahora: Date) {
    const lista = await this.prisma.riesgo.findMany({
      where: { archivadoAt: null, tipo: 'RIESGO' },
      select: {
        estado: true,
        categoriaInherente: true,
        categoriaResidual: true,
        responsableId: true,
        planTratamiento: true,
        fechaRevision: true,
      },
    });

    const porCategoria: Record<CategoriaRiesgo, number> = { BAJO: 0, MEDIO: 0, ALTO: 0, CRITICO: 0 };
    let criticos = 0;
    let criticosSinTratamiento = 0;
    let revisionVencida = 0;

    for (const r of lista) {
      const cat = r.categoriaResidual ?? r.categoriaInherente;
      porCategoria[cat]++;
      const esAltoOCritico = cat === 'ALTO' || cat === 'CRITICO';
      const abierto = r.estado !== 'CERRADO';
      if (esAltoOCritico && abierto) {
        criticos++;
        if (!r.responsableId || !r.planTratamiento) criticosSinTratamiento++;
      }
      if (abierto && r.fechaRevision && r.fechaRevision < ahora) revisionVencida++;
    }

    return { total: lista.length, criticos, criticosSinTratamiento, revisionVencida, porCategoria };
  }

  // ── Auditorías ────────────────────────────────────────────────────────────
  private async auditorias(anio: number) {
    const desde = new Date(anio, 0, 1);
    const hasta = new Date(anio + 1, 0, 1);
    const lista = await this.prisma.auditoria.findMany({
      where: { fechaPlanificada: { gte: desde, lt: hasta } },
      select: { estado: true },
    });

    const cuenta = (e: string) => lista.filter((a) => a.estado === e).length;
    const noCanceladas = lista.filter((a) => a.estado !== 'CANCELADA').length;
    const ejecutadas = lista.filter((a) =>
      ['EJECUTADA', 'INFORME_APROBADO', 'CERRADA'].includes(a.estado),
    ).length;

    return {
      delAnio: lista.length,
      planificadas: cuenta('PLANIFICADA'),
      enCurso: cuenta('EN_CURSO'),
      ejecutadas,
      cerradas: cuenta('CERRADA'),
      canceladas: cuenta('CANCELADA'),
      cumplimientoPrograma: noCanceladas ? Math.round((ejecutadas / noCanceladas) * 100) : null,
    };
  }

  // ── Hallazgos ─────────────────────────────────────────────────────────────
  private async hallazgos(inicioAnio: Date) {
    const lista = await this.prisma.hallazgo.findMany({
      where: { archivadoAt: null },
      select: { estado: true, fechaCompromiso: true, fechaCierre: true, clasificacion: true },
    });

    const ahora = new Date();
    const abiertosEstados: EstadoHallazgo[] = [
      'ABIERTO',
      'EN_ANALISIS',
      'PLAN_APROBADO',
      'EN_EJECUCION',
      'PENDIENTE_EFICACIA',
      'REABIERTO',
    ];
    const porEstado: Record<string, number> = {};
    let abiertos = 0;
    let vencidos = 0;
    let cerradosPeriodo = 0;
    let noConformidadesAbiertas = 0;

    for (const h of lista) {
      porEstado[h.estado] = (porEstado[h.estado] ?? 0) + 1;
      const abierto = abiertosEstados.includes(h.estado);
      if (abierto) {
        abiertos++;
        if (h.fechaCompromiso && h.fechaCompromiso < ahora) vencidos++;
        if (h.clasificacion === 'NO_CONFORMIDAD_MAYOR' || h.clasificacion === 'NO_CONFORMIDAD_MENOR')
          noConformidadesAbiertas++;
      }
      if (h.estado === 'CERRADO' && h.fechaCierre && h.fechaCierre >= inicioAnio) cerradosPeriodo++;
    }

    return { total: lista.length, abiertos, vencidos, noConformidadesAbiertas, cerradosPeriodo, porEstado };
  }

  // ── Acciones ──────────────────────────────────────────────────────────────
  private async acciones(ahora: Date) {
    const lista = await this.prisma.accion.findMany({
      where: { archivadoAt: null },
      select: { estado: true, fechaCompromiso: true },
    });

    const en7dias = new Date(ahora.getTime() + 7 * DIA);
    const porEstado: Record<string, number> = {};
    let abiertas = 0;
    let vencidas = 0;
    let porVencer = 0;
    let esperaVerificacion = 0;

    for (const a of lista) {
      porEstado[a.estado] = (porEstado[a.estado] ?? 0) + 1;
      if (a.estado === 'PENDIENTE' || a.estado === 'EN_CURSO') {
        abiertas++;
        if (a.fechaCompromiso && a.fechaCompromiso < ahora) vencidas++;
        else if (a.fechaCompromiso && a.fechaCompromiso <= en7dias) porVencer++;
      }
      if (a.estado === 'COMPLETADA') esperaVerificacion++;
    }

    return { total: lista.length, abiertas, vencidas, porVencer, esperaVerificacion, porEstado };
  }

  // ── Documentos ────────────────────────────────────────────────────────────
  private async documentos(ahora: Date) {
    const en30dias = new Date(ahora.getTime() + 30 * DIA);
    const vigentes = await this.prisma.documentoVersion.findMany({
      where: { estado: 'VIGENTE', documento: { archivadoAt: null } },
      select: { proximaRevisionAt: true },
    });

    let porRevisar30d = 0;
    let vencidos = 0;
    for (const v of vigentes) {
      if (!v.proximaRevisionAt) continue;
      if (v.proximaRevisionAt < ahora) vencidos++;
      else if (v.proximaRevisionAt <= en30dias) porRevisar30d++;
    }

    return { vigentes: vigentes.length, porRevisar30d, vencidos };
  }

  // ── MCC ───────────────────────────────────────────────────────────────────
  private async mcc(inicioAnio: Date) {
    const lista = await this.prisma.registroMCC.findMany({
      where: { archivadoAt: null },
      select: { estado: true, fechaCierre: true },
    });
    const cuenta = (estados: string[]) => lista.filter((m) => estados.includes(m.estado)).length;
    return {
      total: lista.length,
      nuevos: cuenta(['NUEVO', 'EN_REVISION']),
      enEjecucion: cuenta(['ACEPTADO', 'EN_EJECUCION', 'VERIFICACION']),
      cerrados: lista.filter((m) => m.estado === 'CERRADO' && m.fechaCierre && m.fechaCierre >= inicioAnio)
        .length,
    };
  }

  // ── Radar de calidad ──────────────────────────────────────────────────────
  private async radar(ahora: Date): Promise<AlertaRadar[]> {
    const alertas: AlertaRadar[] = [];

    // 1. Acciones vencidas acumuladas por proceso
    const accionesVencidas = await this.prisma.accion.findMany({
      where: {
        archivadoAt: null,
        estado: { in: ['PENDIENTE', 'EN_CURSO'] },
        fechaCompromiso: { lt: ahora },
        procesoId: { not: null },
      },
      select: { proceso: { select: { codigo: true, nombre: true } } },
    });
    for (const [nombre, n] of contarPor(accionesVencidas.map((a) => a.proceso?.nombre))) {
      if (n >= 2) alertas.push({ nivel: 'URGENTE', texto: `${nombre} acumula ${n} acciones vencidas`, ruta: '/acciones' });
    }

    // 2. Indicadores con varios periodos consecutivos fuera de meta
    const indicadores = await this.prisma.indicador.findMany({
      where: { activo: true, archivadoAt: null },
      select: {
        id: true,
        codigo: true,
        mediciones: {
          orderBy: [{ anio: 'desc' }, { periodo: 'desc' }],
          take: 4,
          select: { semaforo: true },
        },
      },
    });
    for (const ind of indicadores) {
      let racha = 0;
      for (const m of ind.mediciones) {
        if (m.semaforo === 'VERDE') break;
        racha++;
      }
      if (racha >= 2)
        alertas.push({
          nivel: 'AVISO',
          texto: `${ind.codigo} lleva ${racha} periodos fuera de meta`,
          ruta: `/indicadores/${ind.id}`,
        });
    }

    // 3. Riesgos alto/crítico sin tratamiento por proceso
    const riesgos = await this.prisma.riesgo.findMany({
      where: { archivadoAt: null, tipo: 'RIESGO', estado: { not: 'CERRADO' } },
      select: {
        categoriaInherente: true,
        categoriaResidual: true,
        responsableId: true,
        planTratamiento: true,
        proceso: { select: { nombre: true } },
      },
    });
    const riesgosCriticosSueltos = riesgos.filter((r) => {
      const cat = r.categoriaResidual ?? r.categoriaInherente;
      return (cat === 'ALTO' || cat === 'CRITICO') && (!r.responsableId || !r.planTratamiento);
    });
    for (const [nombre, n] of contarPor(riesgosCriticosSueltos.map((r) => r.proceso?.nombre))) {
      alertas.push({
        nivel: 'URGENTE',
        texto: `${nombre} tiene ${n} riesgo${n > 1 ? 's' : ''} alto/crítico sin tratamiento`,
        ruta: '/riesgos',
      });
    }

    // 4. Documentos cuya revisión vence en los próximos 7 días
    const en7dias = new Date(ahora.getTime() + 7 * DIA);
    const docsPorVencer = await this.prisma.documentoVersion.findMany({
      where: {
        estado: 'VIGENTE',
        documento: { archivadoAt: null },
        proximaRevisionAt: { gte: ahora, lte: en7dias },
      },
      select: { proximaRevisionAt: true, documento: { select: { id: true, codigo: true } } },
    });
    for (const v of docsPorVencer) {
      const dias = Math.max(0, Math.ceil((v.proximaRevisionAt!.getTime() - ahora.getTime()) / DIA));
      alertas.push({
        nivel: 'AVISO',
        texto: `El documento ${v.documento.codigo} vencerá en ${dias} día${dias === 1 ? '' : 's'}`,
        ruta: `/documentos/${v.documento.id}`,
      });
    }

    // 5. Un mismo requisito con hallazgos abiertos en varios procesos
    const hallazgosAbiertos = await this.prisma.hallazgo.findMany({
      where: { archivadoAt: null, estado: { notIn: ['CERRADO'] }, requisito: { not: null } },
      select: { requisito: true, procesoId: true },
    });
    const porRequisito = new Map<string, Set<string>>();
    for (const h of hallazgosAbiertos) {
      if (!h.requisito || !h.procesoId) continue;
      if (!porRequisito.has(h.requisito)) porRequisito.set(h.requisito, new Set());
      porRequisito.get(h.requisito)!.add(h.procesoId);
    }
    for (const [requisito, procesos] of porRequisito) {
      if (procesos.size >= 3)
        alertas.push({
          nivel: 'AVISO',
          texto: `El requisito "${requisito}" tiene hallazgos abiertos en ${procesos.size} procesos`,
          ruta: '/hallazgos',
        });
    }

    // 6. Auditorías planificadas que ya pasaron su fecha
    const auditoriasVencidas = await this.prisma.auditoria.count({
      where: { estado: 'PLANIFICADA', fechaPlanificada: { lt: ahora } },
    });
    if (auditoriasVencidas > 0)
      alertas.push({
        nivel: 'URGENTE',
        texto: `${auditoriasVencidas} auditoría${auditoriasVencidas === 1 ? '' : 's'} planificada${
          auditoriasVencidas === 1 ? '' : 's'
        } sin ejecutar`,
        ruta: '/auditorias',
      });

    const orden: Record<NivelRadar, number> = { URGENTE: 0, AVISO: 1, INFO: 2 };
    return alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel]).slice(0, 10);
  }
}

/** Cuenta ocurrencias por clave (ignora nulos), devuelto ordenado desc. */
function contarPor(valores: (string | null | undefined)[]): [string, number][] {
  const mapa = new Map<string, number>();
  for (const v of valores) {
    if (!v) continue;
    mapa.set(v, (mapa.get(v) ?? 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}
