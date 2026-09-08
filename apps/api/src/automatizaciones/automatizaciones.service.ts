import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ReglaAutomatizacion } from '@prisma/client';
import { ROL } from '../auth/rbac/permisos.catalog';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { etiquetaPeriodo, periodoActual, periodosHasta } from '../indicadores/periodos';

const DIA = 86_400_000;
const dias = (ms: number) => Math.floor(ms / DIA);

interface Escala {
  dias: number;
  a: 'responsable' | 'jefatura' | 'calidad';
}

@Injectable()
export class AutomatizacionesService {
  private readonly logger = new Logger(AutomatizacionesService.name);
  private ejecutando = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly noti: NotificacionesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM, { name: 'motor-automatizaciones' })
  async cronDiario() {
    await this.ejecutar(false);
  }

  async reglas() {
    return this.prisma.reglaAutomatizacion.findMany({ orderBy: { orden: 'asc' } });
  }

  async ultimaEjecucion() {
    return this.prisma.ejecucionMotor.findFirst({ orderBy: { inicio: 'desc' } });
  }

  async configurar(codigo: string, data: { activa?: boolean; config?: Record<string, unknown> }) {
    return this.prisma.reglaAutomatizacion.update({
      where: { codigo },
      data: { activa: data.activa, config: data.config as never },
    });
  }

  async ejecutar(manual: boolean): Promise<{ notificaciones: number; detalle: Record<string, number> }> {
    if (this.ejecutando) {
      this.logger.warn('El motor ya está en ejecución; se omite.');
      return { notificaciones: 0, detalle: {} };
    }
    this.ejecutando = true;
    const registro = await this.prisma.ejecucionMotor.create({ data: { manual } });
    const detalle: Record<string, number> = {};
    let total = 0;

    try {
      const reglas = await this.prisma.reglaAutomatizacion.findMany({ where: { activa: true } });
      const calidad = await this.usuariosCalidad();

      for (const r of reglas) {
        try {
          const n = await this.correrRegla(r, calidad);
          detalle[r.codigo] = n;
          total += n;
        } catch (e) {
          this.logger.error(`Regla ${r.codigo} falló: ${(e as Error).message}`);
        }
      }
    } finally {
      await this.prisma.ejecucionMotor.update({
        where: { id: registro.id },
        data: { fin: new Date(), notificaciones: total, detalle: detalle as never },
      });
      this.ejecutando = false;
    }
    this.logger.log(`Motor ejecutado: ${total} notificación(es). ${JSON.stringify(detalle)}`);
    return { notificaciones: total, detalle };
  }

  // ── Reglas ────────────────────────────────────────────────────────────────

  private async correrRegla(r: ReglaAutomatizacion, calidad: string[]): Promise<number> {
    const cfg = (r.config ?? {}) as Record<string, unknown>;
    switch (r.codigo) {
      case 'acciones.vencidas':
        return this.accionesVencidas((cfg.escalamiento as Escala[]) ?? [], calidad, !!cfg.enviarCorreo);
      case 'acciones.por_vencer':
        return this.porVencer('accion', (cfg.diasAviso as number[]) ?? [7, 3], !!cfg.enviarCorreo);
      case 'acciones.espera_verificacion':
        return this.accionesEsperaVerificacion((cfg.diasEspera as number) ?? 3, calidad);
      case 'hallazgos.plan_vencido':
        return this.hallazgosPlanVencido((cfg.escalamiento as Escala[]) ?? [], calidad, !!cfg.enviarCorreo);
      case 'hallazgos.sin_responsable':
        return this.hallazgosSinResponsable(calidad);
      case 'riesgos.revision_proxima':
        return this.riesgosRevision((cfg.diasAviso as number[]) ?? [30, 15, 7], calidad);
      case 'riesgos.critico_sin_tratamiento':
        return this.riesgosCriticos(calidad);
      case 'documentos.revision_proxima':
        return this.documentosRevision((cfg.diasAviso as number[]) ?? [30, 15, 7]);
      case 'documentos.vencidos':
        return this.documentosVencidos(calidad);
      case 'indicadores.captura_pendiente':
        return this.indicadoresCaptura();
      case 'auditorias.proximas':
        return this.auditoriasProximas((cfg.diasAviso as number[]) ?? [15, 7, 1]);
      default:
        return 0;
    }
  }

  private async accionesVencidas(escala: Escala[], calidad: string[], correo: boolean) {
    const hoy = Date.now();
    const acciones = await this.prisma.accion.findMany({
      where: { fechaCompromiso: { lt: new Date() }, estado: { in: ['PENDIENTE', 'EN_CURSO'] }, archivadoAt: null },
      include: { proceso: { select: { responsableId: true } } },
    });
    let c = 0;
    for (const a of acciones) {
      const d = dias(hoy - a.fechaCompromiso!.getTime());
      // Solo se dispara el paso de escalamiento más alto que ya aplica: cada
      // nivel inferior fue notificado en su día y no debe repetirse.
      const paso = [...escala].sort((x, y) => y.dias - x.dias).find((p) => d >= p.dias);
      if (!paso) continue;
      const sufijo =
        paso.a === 'jefatura'
          ? ' Escalado a la jefatura del proceso.'
          : paso.a === 'calidad'
            ? ' Escalado a Gestión de Calidad.'
            : '';
      const base = {
        titulo: 'Acción vencida',
        mensaje: `La acción ${a.codigo} lleva ${d} día(s) vencida.${sufijo}`,
        entidad: 'Accion',
        entidadId: a.id,
        ruta: `/acciones/${a.id}`,
        nivel: 'URGENTE' as const,
        correo,
        claveDedup: `accion:${a.id}:venc:d${paso.dias}`,
      };
      if (paso.a === 'responsable' && a.responsableId) c += await this.noti.notificar(a.responsableId, base);
      else if (paso.a === 'jefatura' && a.proceso?.responsableId) c += await this.noti.notificar(a.proceso.responsableId, base);
      else if (paso.a === 'calidad') c += await this.noti.notificarVarios(calidad, base);
    }
    return c;
  }

  private async porVencer(_e: 'accion', diasAviso: number[], correo: boolean) {
    const acciones = await this.prisma.accion.findMany({
      where: { fechaCompromiso: { gte: new Date() }, estado: { in: ['PENDIENTE', 'EN_CURSO'] }, archivadoAt: null, responsableId: { not: null } },
    });
    let c = 0;
    const orden = [...diasAviso].sort((x, y) => y - x);
    for (const a of acciones) {
      const restante = Math.ceil((a.fechaCompromiso!.getTime() - Date.now()) / DIA);
      for (const d of orden) {
        if (restante <= d) {
          c += await this.noti.notificar(a.responsableId!, {
            titulo: 'Acción por vencer',
            mensaje: `La acción ${a.codigo} vence en ${restante} día(s).`,
            entidad: 'Accion', entidadId: a.id, ruta: `/acciones/${a.id}`, nivel: 'AVISO', correo,
            claveDedup: `accion:${a.id}:prev:${d}`,
          });
          break;
        }
      }
    }
    return c;
  }

  private async accionesEsperaVerificacion(diasEspera: number, calidad: string[]) {
    const limite = new Date(Date.now() - diasEspera * DIA);
    const acciones = await this.prisma.accion.findMany({
      where: { estado: 'COMPLETADA', archivadoAt: null, actualizadoAt: { lt: limite } },
    });
    let c = 0;
    for (const a of acciones) {
      c += await this.noti.notificarVarios(calidad, {
        titulo: 'Acción pendiente de verificación',
        mensaje: `La acción ${a.codigo} está completada y espera verificación de eficacia.`,
        entidad: 'Accion', entidadId: a.id, ruta: `/acciones/${a.id}`, nivel: 'AVISO',
        claveDedup: `accion:${a.id}:verif`,
      });
    }
    return c;
  }

  private async hallazgosPlanVencido(escala: Escala[], calidad: string[], correo: boolean) {
    const hoy = Date.now();
    const hallazgos = await this.prisma.hallazgo.findMany({
      where: { fechaCompromiso: { lt: new Date() }, estado: { notIn: ['CERRADO'] }, archivadoAt: null },
      include: { proceso: { select: { responsableId: true } } },
    });
    let c = 0;
    for (const h of hallazgos) {
      const d = dias(hoy - h.fechaCompromiso!.getTime());
      const paso = [...escala].sort((x, y) => y.dias - x.dias).find((p) => d >= p.dias);
      if (!paso) continue;
      const sufijo =
        paso.a === 'jefatura'
          ? ' Escalado a la jefatura del proceso.'
          : paso.a === 'calidad'
            ? ' Escalado a Gestión de Calidad.'
            : '';
      const base = {
        titulo: 'Hallazgo con compromiso vencido',
        mensaje: `El hallazgo ${h.codigo} lleva ${d} día(s) sin cerrarse tras su fecha compromiso.${sufijo}`,
        entidad: 'Hallazgo', entidadId: h.id, ruta: `/hallazgos/${h.id}`, nivel: 'URGENTE' as const, correo,
        claveDedup: `hallazgo:${h.id}:venc:d${paso.dias}`,
      };
      if (paso.a === 'responsable' && h.responsableId) c += await this.noti.notificar(h.responsableId, base);
      else if (paso.a === 'jefatura' && h.proceso?.responsableId) c += await this.noti.notificar(h.proceso.responsableId, base);
      else if (paso.a === 'calidad') c += await this.noti.notificarVarios(calidad, base);
    }
    return c;
  }

  private async hallazgosSinResponsable(calidad: string[]) {
    const limite = new Date(Date.now() - 2 * DIA);
    const hallazgos = await this.prisma.hallazgo.findMany({
      where: { responsableId: null, estado: { in: ['ABIERTO', 'REABIERTO'] }, archivadoAt: null, creadoAt: { lt: limite } },
    });
    let c = 0;
    for (const h of hallazgos) {
      c += await this.noti.notificarVarios(calidad, {
        titulo: 'Hallazgo sin responsable',
        mensaje: `El hallazgo ${h.codigo} no tiene responsable de respuesta asignado.`,
        entidad: 'Hallazgo', entidadId: h.id, ruta: `/hallazgos/${h.id}`, nivel: 'AVISO',
        claveDedup: `hallazgo:${h.id}:sinresp`,
      });
    }
    return c;
  }

  private async riesgosRevision(diasAviso: number[], calidad: string[]) {
    const riesgos = await this.prisma.riesgo.findMany({
      where: { estado: { not: 'CERRADO' }, archivadoAt: null, fechaRevision: { not: null } },
    });
    let c = 0;
    const orden = [...diasAviso].sort((x, y) => y - x);
    for (const r of riesgos) {
      const rest = Math.ceil((r.fechaRevision!.getTime() - Date.now()) / DIA);
      if (rest < 0) {
        const dests = [...calidad, ...(r.responsableId ? [r.responsableId] : [])];
        c += await this.noti.notificarVarios(dests, {
          titulo: 'Revisión de riesgo vencida',
          mensaje: `El riesgo ${r.codigo} tenía revisión programada hace ${Math.abs(rest)} día(s).`,
          entidad: 'Riesgo', entidadId: r.id, ruta: `/riesgos/${r.id}`, nivel: 'URGENTE',
          claveDedup: `riesgo:${r.id}:rev:vencida`,
        });
        continue;
      }
      for (const d of orden) {
        if (rest <= d && r.responsableId) {
          c += await this.noti.notificar(r.responsableId, {
            titulo: 'Revisión de riesgo próxima',
            mensaje: `El riesgo ${r.codigo} debe revisarse en ${rest} día(s).`,
            entidad: 'Riesgo', entidadId: r.id, ruta: `/riesgos/${r.id}`, nivel: 'AVISO',
            claveDedup: `riesgo:${r.id}:rev:${d}`,
          });
          break;
        }
      }
    }
    return c;
  }

  private async riesgosCriticos(calidad: string[]) {
    const riesgos = await this.prisma.riesgo.findMany({
      where: {
        estado: { notIn: ['CERRADO'] },
        archivadoAt: null,
        OR: [
          { categoriaResidual: { in: ['ALTO', 'CRITICO'] } },
          { categoriaResidual: null, categoriaInherente: { in: ['ALTO', 'CRITICO'] } },
        ],
      },
    });
    let c = 0;
    for (const r of riesgos) {
      if (r.responsableId && r.planTratamiento) continue;
      c += await this.noti.notificarVarios(calidad, {
        titulo: 'Riesgo alto/crítico sin tratamiento',
        mensaje: `El riesgo ${r.codigo} es de nivel alto/crítico y no tiene ${!r.responsableId ? 'responsable' : 'plan de tratamiento'}.`,
        entidad: 'Riesgo', entidadId: r.id, ruta: `/riesgos/${r.id}`, nivel: 'URGENTE',
        claveDedup: `riesgo:${r.id}:tratamiento`,
      });
    }
    return c;
  }

  private async documentosRevision(diasAviso: number[]) {
    const docs = await this.prisma.documento.findMany({
      where: { archivadoAt: null, propietarioId: { not: null } },
      include: { versiones: { where: { estado: 'VIGENTE' }, select: { proximaRevisionAt: true } } },
    });
    let c = 0;
    const orden = [...diasAviso].sort((x, y) => y - x);
    for (const d of docs) {
      const prox = d.versiones[0]?.proximaRevisionAt;
      if (!prox) continue;
      const rest = Math.ceil((prox.getTime() - Date.now()) / DIA);
      if (rest < 0) continue;
      for (const umbral of orden) {
        if (rest <= umbral) {
          c += await this.noti.notificar(d.propietarioId!, {
            titulo: 'Documento próximo a revisión',
            mensaje: `El documento ${d.codigo} debe revisarse en ${rest} día(s).`,
            entidad: 'Documento', entidadId: d.id, ruta: `/documentos/${d.id}`, nivel: 'AVISO',
            claveDedup: `doc:${d.id}:rev:${umbral}`,
          });
          break;
        }
      }
    }
    return c;
  }

  private async documentosVencidos(calidad: string[]) {
    const mes = new Date().toISOString().slice(0, 7);
    const docs = await this.prisma.documento.findMany({
      where: { archivadoAt: null },
      include: { versiones: { where: { estado: 'VIGENTE' }, select: { proximaRevisionAt: true } } },
    });
    let c = 0;
    for (const d of docs) {
      const prox = d.versiones[0]?.proximaRevisionAt;
      if (!prox || prox.getTime() >= Date.now()) continue;
      const dests = [...calidad, ...(d.propietarioId ? [d.propietarioId] : [])];
      c += await this.noti.notificarVarios(dests, {
        titulo: 'Documento vencido',
        mensaje: `La revisión del documento ${d.codigo} está vencida.`,
        entidad: 'Documento', entidadId: d.id, ruta: `/documentos/${d.id}`, nivel: 'URGENTE',
        claveDedup: `doc:${d.id}:vencido:${mes}`,
      });
    }
    return c;
  }

  private async indicadoresCaptura() {
    const indicadores = await this.prisma.indicador.findMany({
      where: { activo: true, responsableCapturaId: { not: null } },
      include: { mediciones: { select: { anio: true, periodo: true } } },
    });
    let c = 0;
    const anio = new Date().getFullYear();
    for (const ind of indicadores) {
      const capturados = new Set(ind.mediciones.map((m) => `${m.anio}-${m.periodo}`));
      const actual = periodoActual(ind.frecuencia);
      const esperados = periodosHasta(ind.frecuencia, anio);
      const faltantes = esperados.filter((p) => !capturados.has(`${p.anio}-${p.periodo}`));
      // Notifica solo el periodo vigente y el inmediato anterior si falta.
      for (const p of faltantes.filter((f) => f.anio === actual.anio && f.periodo >= actual.periodo - 1)) {
        c += await this.noti.notificar(ind.responsableCapturaId!, {
          titulo: 'Captura de indicador pendiente',
          mensaje: `Falta capturar ${ind.codigo} — ${etiquetaPeriodo(ind.frecuencia, p.anio, p.periodo)}.`,
          entidad: 'Indicador', entidadId: ind.id, ruta: `/indicadores/${ind.id}`, nivel: 'AVISO',
          claveDedup: `ind:${ind.id}:cap:${p.anio}-${p.periodo}`,
        });
      }
    }
    return c;
  }

  private async auditoriasProximas(diasAviso: number[]) {
    const auds = await this.prisma.auditoria.findMany({
      where: { estado: { in: ['PLANIFICADA', 'EN_CURSO'] } },
      include: { equipo: { select: { usuarioId: true } } },
    });
    let c = 0;
    const orden = [...diasAviso].sort((x, y) => y - x);
    for (const a of auds) {
      const dests = [...(a.auditorLiderId ? [a.auditorLiderId] : []), ...a.equipo.map((e) => e.usuarioId)];
      if (!dests.length) continue;
      const rest = Math.ceil((a.fechaPlanificada.getTime() - Date.now()) / DIA);
      if (rest < 0) {
        c += await this.noti.notificarVarios(dests, {
          titulo: 'Auditoría vencida sin ejecutar',
          mensaje: `La auditoría ${a.codigo} estaba planificada hace ${Math.abs(rest)} día(s).`,
          entidad: 'Auditoria', entidadId: a.id, ruta: `/auditorias/${a.id}`, nivel: 'URGENTE',
          claveDedup: `aud:${a.id}:vencida`,
        });
        continue;
      }
      for (const d of orden) {
        if (rest <= d) {
          c += await this.noti.notificarVarios(dests, {
            titulo: 'Auditoría próxima',
            mensaje: `La auditoría ${a.codigo} está planificada en ${rest} día(s).`,
            entidad: 'Auditoria', entidadId: a.id, ruta: `/auditorias/${a.id}`, nivel: 'AVISO',
            claveDedup: `aud:${a.id}:prox:${d}`,
          });
          break;
        }
      }
    }
    return c;
  }

  // ── Auxiliares ────────────────────────────────────────────────────────────

  private async usuariosCalidad(): Promise<string[]> {
    const roles = await this.prisma.usuarioRol.findMany({
      where: { rolCodigo: { in: [ROL.GESTOR_CALIDAD, ROL.SUPER_ADMIN] }, OR: [{ expiraAt: null }, { expiraAt: { gt: new Date() } }] },
      select: { usuarioId: true },
    });
    return [...new Set(roles.map((r) => r.usuarioId))];
  }
}
