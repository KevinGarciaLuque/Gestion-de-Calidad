import { api } from '@/lib/api'
import type { Paginado } from '@/lib/tipos'

export type TipoAuditoria = 'INTERNA' | 'EXTERNA' | 'SEGUIMIENTO'
export type EstadoAuditoria =
  | 'PLANIFICADA'
  | 'EN_CURSO'
  | 'EJECUTADA'
  | 'INFORME_APROBADO'
  | 'CERRADA'
  | 'CANCELADA'
export type ResultadoItem = 'PENDIENTE' | 'CUMPLE' | 'NO_CUMPLE' | 'OBSERVACION' | 'NO_APLICA'

export const ETIQUETA_ESTADO_AUD: Record<EstadoAuditoria, string> = {
  PLANIFICADA: 'Planificada',
  EN_CURSO: 'En curso',
  EJECUTADA: 'Ejecutada',
  INFORME_APROBADO: 'Informe aprobado',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
}
export const ETIQUETA_RESULTADO: Record<ResultadoItem, string> = {
  PENDIENTE: 'Pendiente',
  CUMPLE: 'Cumple',
  NO_CUMPLE: 'No cumple',
  OBSERVACION: 'Observación',
  NO_APLICA: 'No aplica',
}

export interface AuditoriaResumen {
  id: string
  codigo: string
  tipo: TipoAuditoria
  estado: EstadoAuditoria
  objetivo: string
  proceso: { id: string; codigo: string; nombre: string } | null
  area: { id: string; nombre: string } | null
  auditorLider: { id: string; nombre: string } | null
  fechaPlanificada: string
  fechaFinReal: string | null
  programa: { id: string; anio: number; nombre: string } | null
  totalItems: number
  cumplimiento: number | null
  hallazgosAbiertos: number
  vencida: boolean
}

export interface ItemChecklist {
  id: string
  orden: number
  criterio: string
  proceso: { id: string; codigo: string } | null
  resultado: ResultadoItem
  notas: string | null
  hallazgos: { id: string; codigo: string; clasificacion: string }[]
}

export interface AuditoriaDetalle {
  auditoria: AuditoriaResumen & {
    alcance: string
    criterios: string
    equipo: { id: string; nombre: string }[]
    fechaInicioReal: string | null
    reprogramaciones: { fechaAnterior: string; fechaNueva: string; motivo: string; fecha: string }[]
    informeResumen: string | null
    informeConclusiones: string | null
    informeAprobadoAt: string | null
    creadoAt: string
  }
  checklist: ItemChecklist[]
  hallazgos: {
    id: string
    codigo: string
    clasificacion: string
    estado: string
    descripcion: string
    responsable: { id: string; nombre: string } | null
  }[]
  resumen: {
    total: number
    PENDIENTE: number
    CUMPLE: number
    NO_CUMPLE: number
    OBSERVACION: number
    NO_APLICA: number
    cumplimiento: number | null
    hallazgos: { mayores: number; menores: number; observaciones: number; oportunidades: number }
  }
  puede: {
    planificar: boolean
    ejecutar: boolean
    aprobarInforme: boolean
    cerrar: boolean
    crearHallazgo: boolean
  }
}

export interface ProgramaResp {
  anio: number
  programa: { id: string; anio: number; nombre: string; objetivo: string | null; estado: string; aprobadoAt: string | null } | null
  auditorias: AuditoriaResumen[]
  puedeGestionar: boolean
}

export const auditoriasApi = {
  programa: async (anio: number): Promise<ProgramaResp> => (await api.get(`/auditorias/programa/${anio}`)).data,
  crearPrograma: async (payload: { anio: number; nombre: string; objetivo?: string }): Promise<ProgramaResp> =>
    (await api.post('/auditorias/programa', payload)).data,
  aprobarPrograma: async (id: string): Promise<ProgramaResp> => (await api.post(`/auditorias/programa/${id}/aprobar`, {})).data,
  listar: async (params: { q?: string; anio?: number; estado?: EstadoAuditoria; procesoId?: string; pagina?: number }): Promise<Paginado<AuditoriaResumen>> =>
    (await api.get('/auditorias', { params })).data,
  obtener: async (id: string): Promise<AuditoriaDetalle> => (await api.get(`/auditorias/${id}`)).data,
  crear: async (payload: {
    codigo: string
    programaId?: string
    tipo: TipoAuditoria
    procesoId?: string
    areaId?: string
    objetivo: string
    alcance: string
    criterios: string
    auditorLiderId?: string
    equipoIds?: string[]
    fechaPlanificada: string
  }): Promise<AuditoriaDetalle> => (await api.post('/auditorias', payload)).data,
  editar: async (id: string, payload: Record<string, unknown>): Promise<AuditoriaDetalle> =>
    (await api.patch(`/auditorias/${id}`, payload)).data,
  reprogramar: async (id: string, fechaNueva: string, motivo: string): Promise<AuditoriaDetalle> =>
    (await api.post(`/auditorias/${id}/reprogramar`, { fechaNueva, motivo })).data,
  cancelar: async (id: string, motivo: string): Promise<AuditoriaDetalle> =>
    (await api.post(`/auditorias/${id}/cancelar`, { motivo })).data,
  agregarItem: async (id: string, criterio: string, procesoId?: string): Promise<AuditoriaDetalle> =>
    (await api.post(`/auditorias/${id}/items`, { criterio, procesoId })).data,
  quitarItem: async (id: string, itemId: string): Promise<AuditoriaDetalle> =>
    (await api.delete(`/auditorias/${id}/items/${itemId}`)).data,
  iniciar: async (id: string): Promise<AuditoriaDetalle> => (await api.post(`/auditorias/${id}/iniciar`, {})).data,
  resultado: async (id: string, itemId: string, resultado: ResultadoItem, notas?: string): Promise<AuditoriaDetalle> =>
    (await api.patch(`/auditorias/${id}/items/${itemId}/resultado`, { resultado, notas })).data,
  finalizar: async (id: string): Promise<AuditoriaDetalle> => (await api.post(`/auditorias/${id}/finalizar`, {})).data,
  generarHallazgo: async (
    id: string,
    itemId: string,
    payload: { clasificacion: string; descripcion?: string; requisito?: string; responsableId?: string; fechaCompromiso?: string; prioridad?: string },
  ): Promise<AuditoriaDetalle> => (await api.post(`/auditorias/${id}/items/${itemId}/hallazgo`, payload)).data,
  editarInforme: async (id: string, payload: { resumen?: string; conclusiones?: string }): Promise<AuditoriaDetalle> =>
    (await api.put(`/auditorias/${id}/informe`, payload)).data,
  aprobarInforme: async (id: string): Promise<AuditoriaDetalle> => (await api.post(`/auditorias/${id}/informe/aprobar`, {})).data,
  cerrar: async (id: string): Promise<AuditoriaDetalle> => (await api.post(`/auditorias/${id}/cerrar`, {})).data,
}
