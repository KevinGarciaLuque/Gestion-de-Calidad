import { api } from '@/lib/api'
import type { Paginado } from '@/lib/tipos'

export type OrigenHallazgo =
  | 'AUDITORIA'
  | 'INDICADOR'
  | 'QUEJA'
  | 'INCIDENTE'
  | 'INSPECCION'
  | 'REVISION_DIRECCION'
  | 'OTRO'
export type ClasificacionHallazgo =
  | 'NO_CONFORMIDAD_MAYOR'
  | 'NO_CONFORMIDAD_MENOR'
  | 'OBSERVACION'
  | 'OPORTUNIDAD_MEJORA'
export type EstadoHallazgo =
  | 'ABIERTO'
  | 'EN_ANALISIS'
  | 'PLAN_APROBADO'
  | 'EN_EJECUCION'
  | 'PENDIENTE_EFICACIA'
  | 'CERRADO'
  | 'REABIERTO'
export type PrioridadHallazgo = 'BAJA' | 'MEDIA' | 'ALTA'

export const ETIQUETA_ORIGEN: Record<OrigenHallazgo, string> = {
  AUDITORIA: 'Auditoría',
  INDICADOR: 'Indicador',
  QUEJA: 'Queja / reclamo',
  INCIDENTE: 'Incidente',
  INSPECCION: 'Inspección',
  REVISION_DIRECCION: 'Revisión por la dirección',
  OTRO: 'Otro',
}
export const ETIQUETA_CLASIFICACION: Record<ClasificacionHallazgo, string> = {
  NO_CONFORMIDAD_MAYOR: 'No conformidad mayor',
  NO_CONFORMIDAD_MENOR: 'No conformidad menor',
  OBSERVACION: 'Observación',
  OPORTUNIDAD_MEJORA: 'Oportunidad de mejora',
}
export const ETIQUETA_ESTADO_HALLAZGO: Record<EstadoHallazgo, string> = {
  ABIERTO: 'Abierto',
  EN_ANALISIS: 'En análisis',
  PLAN_APROBADO: 'Plan aprobado',
  EN_EJECUCION: 'En ejecución',
  PENDIENTE_EFICACIA: 'Pendiente de eficacia',
  CERRADO: 'Cerrado',
  REABIERTO: 'Reabierto',
}

export interface HallazgoFila {
  id: string
  codigo: string
  origen: OrigenHallazgo
  descripcion: string
  clasificacion: ClasificacionHallazgo
  estado: EstadoHallazgo
  prioridad: PrioridadHallazgo
  proceso: { id: string; codigo: string } | null
  area: { id: string; nombre: string } | null
  responsable: { id: string; nombre: string } | null
  auditoria: { id: string; codigo: string } | null
  fechaDeteccion: string
  fechaCompromiso: string | null
  archivado: boolean
  alerta: { planVencido: boolean; sinResponsable: boolean }
}

export interface HallazgoDetalle {
  hallazgo: HallazgoFila & {
    requisito: string | null
    evidencia: string | null
    detectadoPor: { id: string; nombre: string } | null
    creadoAt: string
  }
  puede: { editar: boolean; cerrar: boolean }
}

export const hallazgosApi = {
  listar: async (params: {
    q?: string
    origen?: OrigenHallazgo
    clasificacion?: ClasificacionHallazgo
    estado?: EstadoHallazgo
    procesoId?: string
    auditoriaId?: string
    abiertos?: boolean
    pagina?: number
  }): Promise<Paginado<HallazgoFila>> => (await api.get('/hallazgos', { params })).data,
  obtener: async (id: string): Promise<HallazgoDetalle> => (await api.get(`/hallazgos/${id}`)).data,
  crear: async (payload: {
    origen: OrigenHallazgo
    procesoId?: string
    areaId?: string
    descripcion: string
    clasificacion: ClasificacionHallazgo
    requisito?: string
    evidencia?: string
    responsableId?: string
    fechaCompromiso?: string
    prioridad?: PrioridadHallazgo
  }): Promise<HallazgoDetalle> => (await api.post('/hallazgos', payload)).data,
  editar: async (id: string, payload: Record<string, unknown>): Promise<HallazgoDetalle> =>
    (await api.patch(`/hallazgos/${id}`, payload)).data,
}
