import { api } from '@/lib/api'
import type { Paginado } from '@/lib/tipos'

export type OrigenMCC = 'COLABORADOR' | 'AREA' | 'ENCUESTA' | 'INDICADOR' | 'AUDITORIA' | 'COMITE' | 'OTRO'
export type EstadoMCC =
  | 'NUEVO'
  | 'EN_REVISION'
  | 'ACEPTADO'
  | 'NO_PROCEDE'
  | 'EN_EJECUCION'
  | 'VERIFICACION'
  | 'CERRADO'

export const ETIQUETA_ORIGEN_MCC: Record<OrigenMCC, string> = {
  COLABORADOR: 'Colaborador',
  AREA: 'Área / servicio',
  ENCUESTA: 'Encuesta de satisfacción',
  INDICADOR: 'Indicador',
  AUDITORIA: 'Auditoría',
  COMITE: 'Comité',
  OTRO: 'Otro',
}
export const ETIQUETA_ESTADO_MCC: Record<EstadoMCC, string> = {
  NUEVO: 'Nuevo',
  EN_REVISION: 'En revisión',
  ACEPTADO: 'Aceptado',
  NO_PROCEDE: 'No procede',
  EN_EJECUCION: 'En ejecución',
  VERIFICACION: 'Verificación',
  CERRADO: 'Cerrado',
}
export const ORDEN_ESTADOS_MCC: EstadoMCC[] = ['NUEVO', 'ACEPTADO', 'EN_EJECUCION', 'VERIFICACION', 'CERRADO']

export interface MccFila {
  id: string
  codigo: string
  titulo: string
  origen: OrigenMCC
  estado: EstadoMCC
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | null
  impacto: string | null
  area: { id: string; nombre: string } | null
  propuestoPor: { id: string; nombre: string } | null
  accionesTotal: number
  accionesCerradas: number
  creadoAt: string
  fechaCierre: string | null
  archivado: boolean
}

export interface MccDetalle {
  registro: MccFila & {
    descripcion: string
    origenDetalle: string | null
    decisionJustificacion: string | null
    evaluacionResultado: string | null
    aprendizaje: string | null
    gestionadoPor: { id: string; nombre: string } | null
  }
  eventos: { id: string; fecha: string; tipo: string; detalle: string | null; estadoNuevo: EstadoMCC | null; actorNombre: string | null }[]
  acciones: { id: string; codigo: string; descripcion: string; estado: string; avance: number; responsable: { nombre: string } | null }[]
  puede: { editar: boolean; gestionar: boolean; crearAccion: boolean }
}

export const mccApi = {
  listar: async (params: { q?: string; origen?: OrigenMCC; estado?: EstadoMCC; mios?: boolean; pagina?: number }): Promise<Paginado<MccFila>> =>
    (await api.get('/mcc', { params })).data,
  obtener: async (id: string): Promise<MccDetalle> => (await api.get(`/mcc/${id}`)).data,
  crear: async (payload: { titulo: string; descripcion: string; origen: OrigenMCC; origenDetalle?: string; areaId?: string }): Promise<MccDetalle> =>
    (await api.post('/mcc', payload)).data,
  editar: async (id: string, payload: Record<string, unknown>): Promise<MccDetalle> => (await api.patch(`/mcc/${id}`, payload)).data,
  decidir: async (id: string, payload: { procede: boolean; justificacion: string; impacto?: string; prioridad?: string }): Promise<MccDetalle> =>
    (await api.post(`/mcc/${id}/decidir`, payload)).data,
  iniciarEjecucion: async (id: string): Promise<MccDetalle> => (await api.post(`/mcc/${id}/iniciar-ejecucion`, {})).data,
  verificacion: async (id: string): Promise<MccDetalle> => (await api.post(`/mcc/${id}/verificacion`, {})).data,
  cerrar: async (id: string, payload: { evaluacionResultado: string; aprendizaje?: string }): Promise<MccDetalle> =>
    (await api.post(`/mcc/${id}/cerrar`, payload)).data,
  comentar: async (id: string, texto: string): Promise<MccDetalle> => (await api.post(`/mcc/${id}/comentario`, { texto })).data,
}
