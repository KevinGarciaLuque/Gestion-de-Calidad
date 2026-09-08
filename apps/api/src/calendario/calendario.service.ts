import { Injectable } from '@nestjs/common';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { PrismaService } from '../prisma/prisma.service';
import { periodoActual, PERIODOS_POR_ANIO, etiquetaPeriodo } from '../indicadores/periodos';

export interface EventoCalendario {
  fecha: string;
  tipo: 'AUDITORIA' | 'DOCUMENTO' | 'RIESGO' | 'ACCION' | 'HALLAZGO' | 'INDICADOR';
  titulo: string;
  ruta: string;
  nivel: 'INFO' | 'AVISO' | 'URGENTE';
  vencido: boolean;
}

@Injectable()
export class CalendarioService {
  constructor(private readonly prisma: PrismaService) {}

  async eventos(actor: UsuarioActual, desde: Date, hasta: Date): Promise<EventoCalendario[]> {
    const global = actor.esSuperAdmin || actor.permisos.includes(PERMISO.AUTOMATIZACIONES_CONFIGURAR);
    const ev: EventoCalendario[] = [];
    const ahora = Date.now();
    const enRango = (d: Date | null | undefined) => !!d && d >= desde && d <= hasta;
    const push = (e: Omit<EventoCalendario, 'vencido' | 'fecha'> & { fechaDate: Date }) => {
      const { fechaDate, ...resto } = e;
      ev.push({ ...resto, fecha: fechaDate.toISOString(), vencido: fechaDate.getTime() < ahora });
    };

    // Auditorías
    const auds = await this.prisma.auditoria.findMany({
      where: {
        fechaPlanificada: { gte: desde, lte: hasta },
        estado: { in: ['PLANIFICADA', 'EN_CURSO'] },
        ...(global ? {} : { OR: [{ auditorLiderId: actor.id }, { equipo: { some: { usuarioId: actor.id } } }] }),
      },
      select: { id: true, codigo: true, objetivo: true, fechaPlanificada: true },
    });
    for (const a of auds)
      push({ fechaDate: a.fechaPlanificada, tipo: 'AUDITORIA', titulo: `${a.codigo} — ${a.objetivo.slice(0, 60)}`, ruta: `/auditorias/${a.id}`, nivel: 'AVISO' });

    // Documentos (próxima revisión de la versión vigente)
    const docs = await this.prisma.documento.findMany({
      where: {
        archivadoAt: null,
        ...(global ? {} : { propietarioId: actor.id }),
        versiones: { some: { estado: 'VIGENTE', proximaRevisionAt: { gte: desde, lte: hasta } } },
      },
      select: { id: true, codigo: true, nombre: true, versiones: { where: { estado: 'VIGENTE' }, select: { proximaRevisionAt: true } } },
    });
    for (const d of docs) {
      const f = d.versiones[0]?.proximaRevisionAt;
      if (enRango(f)) push({ fechaDate: f!, tipo: 'DOCUMENTO', titulo: `Revisión: ${d.codigo} ${d.nombre}`, ruta: `/documentos/${d.id}`, nivel: 'AVISO' });
    }

    // Riesgos
    const riesgos = await this.prisma.riesgo.findMany({
      where: {
        estado: { not: 'CERRADO' },
        archivadoAt: null,
        fechaRevision: { gte: desde, lte: hasta },
        ...(global ? {} : { responsableId: actor.id }),
      },
      select: { id: true, codigo: true, descripcion: true, fechaRevision: true },
    });
    for (const r of riesgos)
      push({ fechaDate: r.fechaRevision!, tipo: 'RIESGO', titulo: `Revisión de riesgo: ${r.codigo}`, ruta: `/riesgos/${r.id}`, nivel: 'AVISO' });

    // Acciones
    const acciones = await this.prisma.accion.findMany({
      where: {
        fechaCompromiso: { gte: desde, lte: hasta },
        estado: { in: ['PENDIENTE', 'EN_CURSO', 'COMPLETADA'] },
        archivadoAt: null,
        ...(global ? {} : { OR: [{ responsableId: actor.id }, { colaboradores: { some: { usuarioId: actor.id } } }] }),
      },
      select: { id: true, codigo: true, descripcion: true, fechaCompromiso: true },
    });
    for (const a of acciones)
      push({ fechaDate: a.fechaCompromiso!, tipo: 'ACCION', titulo: `${a.codigo}: ${a.descripcion.slice(0, 60)}`, ruta: `/acciones/${a.id}`, nivel: 'AVISO' });

    // Hallazgos
    const hallazgos = await this.prisma.hallazgo.findMany({
      where: {
        fechaCompromiso: { gte: desde, lte: hasta },
        estado: { not: 'CERRADO' },
        archivadoAt: null,
        ...(global ? {} : { responsableId: actor.id }),
      },
      select: { id: true, codigo: true, descripcion: true, fechaCompromiso: true },
    });
    for (const h of hallazgos)
      push({ fechaDate: h.fechaCompromiso!, tipo: 'HALLAZGO', titulo: `${h.codigo}: ${h.descripcion.slice(0, 60)}`, ruta: `/hallazgos/${h.id}`, nivel: 'AVISO' });

    // Indicadores — fin del periodo de captura vigente
    const indicadores = await this.prisma.indicador.findMany({
      where: { activo: true, ...(global ? {} : { responsableCapturaId: actor.id }) },
      select: { id: true, codigo: true, nombre: true, frecuencia: true },
    });
    for (const ind of indicadores) {
      const { anio, periodo } = periodoActual(ind.frecuencia);
      const meses = 12 / PERIODOS_POR_ANIO[ind.frecuencia];
      const fin = new Date(anio, periodo * meses, 0); // último día del periodo
      if (enRango(fin))
        push({ fechaDate: fin, tipo: 'INDICADOR', titulo: `Captura: ${ind.codigo} (${etiquetaPeriodo(ind.frecuencia, anio, periodo)})`, ruta: `/indicadores/${ind.id}`, nivel: 'INFO' });
    }

    return ev.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
}
