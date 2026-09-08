import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { etiquetaPeriodo } from '../indicadores/periodos';

export interface ColumnaReporte {
  key: string;
  label: string;
}

export interface Reporte {
  tipo: string;
  titulo: string;
  descripcion: string;
  generadoAt: string;
  columnas: ColumnaReporte[];
  filas: Record<string, string | number>[];
}

interface DefinicionReporte {
  titulo: string;
  descripcion: string;
  generar: () => Promise<{ columnas: ColumnaReporte[]; filas: Record<string, string | number>[] }>;
}

const ETIQUETA_TIPO_PROCESO: Record<string, string> = {
  ESTRATEGICO: 'Estratégico',
  MISIONAL: 'Misional',
  APOYO: 'Apoyo',
};

@Injectable()
export class ReportesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
  ) {}

  private get definiciones(): Record<string, DefinicionReporte> {
    return {
      procesos: {
        titulo: 'Listado de procesos',
        descripcion: 'Inventario de procesos del SGC con su responsable, estado y próxima revisión.',
        generar: () => this.repProcesos(),
      },
      indicadores: {
        titulo: 'Matriz de indicadores',
        descripcion: 'Indicadores activos con meta, último resultado y semáforo.',
        generar: () => this.repIndicadores(),
      },
      riesgos: {
        titulo: 'Matriz de riesgos',
        descripcion: 'Riesgos y oportunidades por proceso, con nivel inherente y residual.',
        generar: () => this.repRiesgos(),
      },
      documentos: {
        titulo: 'Lista maestra de documentos',
        descripcion: 'Documentos con su versión vigente, fecha de vigencia y próxima revisión.',
        generar: () => this.repDocumentos(),
      },
      auditorias: {
        titulo: 'Programa anual de auditorías',
        descripcion: 'Auditorías planificadas y su estado de ejecución.',
        generar: () => this.repAuditorias(),
      },
      hallazgos: {
        titulo: 'Listado de hallazgos y no conformidades',
        descripcion: 'Hallazgos con su clasificación, responsable, compromiso y estado.',
        generar: () => this.repHallazgos(),
      },
      acciones: {
        titulo: 'Estado de acciones y planes de mejora',
        descripcion: 'Acciones CAPA con origen, avance, compromiso y estado.',
        generar: () => this.repAcciones(),
      },
    };
  }

  catalogo() {
    return Object.entries(this.definiciones).map(([tipo, d]) => ({
      tipo,
      titulo: d.titulo,
      descripcion: d.descripcion,
    }));
  }

  async generar(tipo: string): Promise<Reporte> {
    const def = this.definiciones[tipo];
    if (!def) throw new NotFoundException(`Reporte "${tipo}" no existe`);
    const { columnas, filas } = await def.generar();
    return {
      tipo,
      titulo: def.titulo,
      descripcion: def.descripcion,
      generadoAt: new Date().toISOString(),
      columnas,
      filas,
    };
  }

  /** Informe ejecutivo: KPIs consolidados + radar, para la vista imprimible. */
  async ejecutivo() {
    const resumen = await this.dashboard.resumen();
    const org = await this.prisma.unidadOrganizativa.findFirst({
      where: { tipo: 'HOSPITAL' },
      orderBy: { orden: 'asc' },
      select: { nombre: true },
    });
    return { organizacion: org?.nombre ?? 'Hospital', ...resumen };
  }

  toCsv(reporte: Reporte): string {
    const esc = (v: string | number) => {
      const s = String(v ?? '');
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const cabecera = reporte.columnas.map((c) => esc(c.label)).join(';');
    const cuerpo = reporte.filas
      .map((f) => reporte.columnas.map((c) => esc(f[c.key] ?? '')).join(';'))
      .join('\r\n');
    return `﻿${cabecera}\r\n${cuerpo}\r\n`;
  }

  // ── Generadores ───────────────────────────────────────────────────────────

  private async repProcesos() {
    const procesos = await this.prisma.proceso.findMany({
      orderBy: [{ tipo: 'asc' }, { codigo: 'asc' }],
      include: { area: { select: { nombre: true } }, responsable: { select: { nombre: true } } },
    });
    return {
      columnas: [
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'area', label: 'Área' },
        { key: 'responsable', label: 'Responsable' },
        { key: 'estado', label: 'Estado' },
        { key: 'ultimaAprobacion', label: 'Última aprobación' },
        { key: 'proximaRevision', label: 'Próxima revisión' },
      ],
      filas: procesos.map((p) => ({
        codigo: p.codigo,
        nombre: p.nombre,
        tipo: ETIQUETA_TIPO_PROCESO[p.tipo] ?? p.tipo,
        area: p.area?.nombre ?? '—',
        responsable: p.responsable?.nombre ?? 'Sin asignar',
        estado: p.estado,
        ultimaAprobacion: fecha(p.ultimaAprobacionAt),
        proximaRevision: fecha(p.proximaRevisionAt),
      })),
    };
  }

  private async repIndicadores() {
    const indicadores = await this.prisma.indicador.findMany({
      where: { archivadoAt: null },
      orderBy: { codigo: 'asc' },
      include: {
        proceso: { select: { codigo: true } },
        responsableCaptura: { select: { nombre: true } },
        mediciones: { orderBy: [{ anio: 'desc' }, { periodo: 'desc' }], take: 1 },
      },
    });
    return {
      columnas: [
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'proceso', label: 'Proceso' },
        { key: 'frecuencia', label: 'Frecuencia' },
        { key: 'meta', label: 'Meta' },
        { key: 'unidad', label: 'Unidad' },
        { key: 'ultimoPeriodo', label: 'Último periodo' },
        { key: 'ultimoValor', label: 'Último valor' },
        { key: 'semaforo', label: 'Semáforo' },
        { key: 'responsable', label: 'Responsable de captura' },
        { key: 'estado', label: 'Estado' },
      ],
      filas: indicadores.map((i) => {
        const m = i.mediciones[0];
        return {
          codigo: i.codigo,
          nombre: i.nombre,
          proceso: i.proceso?.codigo ?? '—',
          frecuencia: i.frecuencia,
          meta: i.meta,
          unidad: i.unidad,
          ultimoPeriodo: m ? etiquetaPeriodo(i.frecuencia, m.anio, m.periodo) : 'Sin medición',
          ultimoValor: m ? m.valor : '—',
          semaforo: m?.semaforo ?? '—',
          responsable: i.responsableCaptura?.nombre ?? 'Sin asignar',
          estado: i.activo ? 'Activo' : 'Inactivo',
        };
      }),
    };
  }

  private async repRiesgos() {
    const riesgos = await this.prisma.riesgo.findMany({
      where: { archivadoAt: null },
      orderBy: { codigo: 'asc' },
      include: { proceso: { select: { codigo: true } }, responsable: { select: { nombre: true } } },
    });
    return {
      columnas: [
        { key: 'codigo', label: 'Código' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'proceso', label: 'Proceso' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'nivelInherente', label: 'Nivel inherente' },
        { key: 'categoriaInherente', label: 'Categoría inherente' },
        { key: 'nivelResidual', label: 'Nivel residual' },
        { key: 'categoriaResidual', label: 'Categoría residual' },
        { key: 'estado', label: 'Estado' },
        { key: 'responsable', label: 'Responsable' },
        { key: 'fechaRevision', label: 'Próxima revisión' },
      ],
      filas: riesgos.map((r) => ({
        codigo: r.codigo,
        tipo: r.tipo,
        proceso: r.proceso?.codigo ?? '—',
        descripcion: r.descripcion,
        nivelInherente: r.nivelInherente,
        categoriaInherente: r.categoriaInherente,
        nivelResidual: r.nivelResidual ?? '—',
        categoriaResidual: r.categoriaResidual ?? '—',
        estado: r.estado,
        responsable: r.responsable?.nombre ?? 'Sin asignar',
        fechaRevision: fecha(r.fechaRevision),
      })),
    };
  }

  private async repDocumentos() {
    const documentos = await this.prisma.documento.findMany({
      where: { archivadoAt: null },
      orderBy: { codigo: 'asc' },
      include: {
        proceso: { select: { codigo: true } },
        area: { select: { nombre: true } },
        propietario: { select: { nombre: true } },
        versiones: { orderBy: { numero: 'desc' } },
      },
    });
    return {
      columnas: [
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'ambito', label: 'Proceso / Área' },
        { key: 'propietario', label: 'Propietario' },
        { key: 'version', label: 'Versión vigente' },
        { key: 'vigenciaDesde', label: 'Vigente desde' },
        { key: 'proximaRevision', label: 'Próxima revisión' },
        { key: 'estado', label: 'Estado' },
      ],
      filas: documentos.map((d) => {
        const vigente = d.versiones.find((v) => v.estado === 'VIGENTE');
        const trabajo = d.versiones.find((v) => v.estado === 'BORRADOR' || v.estado === 'EN_REVISION');
        return {
          codigo: d.codigo,
          nombre: d.nombre,
          tipo: d.tipo,
          ambito: d.proceso?.codigo ?? d.area?.nombre ?? 'Institucional',
          propietario: d.propietario?.nombre ?? 'Sin asignar',
          version: vigente ? `v${vigente.numero}` : '—',
          vigenciaDesde: fecha(vigente?.fechaVigenciaDesde),
          proximaRevision: fecha(vigente?.proximaRevisionAt),
          estado: vigente ? 'Vigente' : trabajo ? `En elaboración (${trabajo.estado})` : 'Sin versión',
        };
      }),
    };
  }

  private async repAuditorias() {
    const auditorias = await this.prisma.auditoria.findMany({
      orderBy: { fechaPlanificada: 'asc' },
      include: {
        proceso: { select: { codigo: true } },
        area: { select: { nombre: true } },
        auditorLider: { select: { nombre: true } },
        _count: { select: { hallazgos: true } },
      },
    });
    return {
      columnas: [
        { key: 'codigo', label: 'Código' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'ambito', label: 'Proceso / Área' },
        { key: 'lider', label: 'Auditor líder' },
        { key: 'fechaPlanificada', label: 'Fecha planificada' },
        { key: 'fechaEjecucion', label: 'Fecha de ejecución' },
        { key: 'estado', label: 'Estado' },
        { key: 'hallazgos', label: 'Hallazgos' },
      ],
      filas: auditorias.map((a) => ({
        codigo: a.codigo,
        tipo: a.tipo,
        ambito: a.proceso?.codigo ?? a.area?.nombre ?? '—',
        lider: a.auditorLider?.nombre ?? 'Sin asignar',
        fechaPlanificada: fecha(a.fechaPlanificada),
        fechaEjecucion: fecha(a.fechaFinReal ?? a.fechaInicioReal),
        estado: a.estado,
        hallazgos: a._count.hallazgos,
      })),
    };
  }

  private async repHallazgos() {
    const hallazgos = await this.prisma.hallazgo.findMany({
      where: { archivadoAt: null },
      orderBy: { codigo: 'asc' },
      include: {
        proceso: { select: { codigo: true } },
        responsable: { select: { nombre: true } },
      },
    });
    return {
      columnas: [
        { key: 'codigo', label: 'Código' },
        { key: 'origen', label: 'Origen' },
        { key: 'clasificacion', label: 'Clasificación' },
        { key: 'proceso', label: 'Proceso' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'responsable', label: 'Responsable' },
        { key: 'fechaCompromiso', label: 'Fecha compromiso' },
        { key: 'estado', label: 'Estado' },
      ],
      filas: hallazgos.map((h) => ({
        codigo: h.codigo,
        origen: h.origen,
        clasificacion: h.clasificacion,
        proceso: h.proceso?.codigo ?? '—',
        descripcion: h.descripcion,
        responsable: h.responsable?.nombre ?? 'Sin asignar',
        fechaCompromiso: fecha(h.fechaCompromiso),
        estado: h.estado,
      })),
    };
  }

  private async repAcciones() {
    const acciones = await this.prisma.accion.findMany({
      where: { archivadoAt: null },
      orderBy: { codigo: 'asc' },
      include: {
        proceso: { select: { codigo: true } },
        responsable: { select: { nombre: true } },
      },
    });
    return {
      columnas: [
        { key: 'codigo', label: 'Código' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'origen', label: 'Origen' },
        { key: 'proceso', label: 'Proceso' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'responsable', label: 'Responsable' },
        { key: 'avance', label: '% avance' },
        { key: 'fechaCompromiso', label: 'Fecha compromiso' },
        { key: 'estado', label: 'Estado' },
      ],
      filas: acciones.map((a) => ({
        codigo: a.codigo,
        tipo: a.tipo,
        origen: a.origen,
        proceso: a.proceso?.codigo ?? '—',
        descripcion: a.descripcion,
        responsable: a.responsable?.nombre ?? 'Sin asignar',
        avance: a.avance,
        fechaCompromiso: fecha(a.fechaCompromiso),
        estado: a.estado,
      })),
    };
  }
}

function fecha(d: Date | null | undefined): string {
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
