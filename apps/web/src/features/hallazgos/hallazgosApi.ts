import { api, getAccessToken } from '@/lib/api'
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
export type MetodologiaCausa = 'CINCO_PORQUES' | 'ISHIKAWA' | 'LLUVIA_CAUSAS' | 'OTRO'

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
export const ETIQUETA_METODOLOGIA: Record<MetodologiaCausa, string> = {
  CINCO_PORQUES: '5 porqués',
  ISHIKAWA: 'Ishikawa (espina de pescado)',
  LLUVIA_CAUSAS: 'Lluvia de causas y validación',
  OTRO: 'Otra / narrativa',
}
export const ORDEN_ESTADOS: EstadoHallazgo[] = [
  'ABIERTO',
  'EN_ANALISIS',
  'PLAN_APROBADO',
  'EN_EJECUCION',
  'PENDIENTE_EFICACIA',
  'CERRADO',
]

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
  fechaCierre: string | null
  archivado: boolean
  alerta: { planVencido: boolean; sinResponsable: boolean; sinAnalisis: boolean }
}

export interface AnalisisCausa {
  id: string
  metodologia: MetodologiaCausa
  contenido: Record<string, unknown>
  causaInmediata: string | null
  causaContribuyente: string | null
  causaRaiz: string | null
  comentariosEquipo: string | null
  elaboradoAt: string | null
}

export interface EventoHallazgo {
  id: string
  fecha: string
  tipo: string
  detalle: string | null
  estadoNuevo: EstadoHallazgo | null
  actorNombre: string | null
}

export interface HallazgoDetalle {
  hallazgo: HallazgoFila & {
    requisito: string | null
    evidencia: string | null
    detectadoPor: { id: string; nombre: string } | null
    correccionInmediata: string | null
    planAccion: string | null
    validadoAt: string | null
    planAprobadoAt: string | null
    verificacionEficacia: string | null
    eficaciaConfirmada: boolean | null
    verificadoAt: string | null
    motivoReapertura: string | null
    creadoAt: string
  }
  analisis: AnalisisCausa | null
  eventos: EventoHallazgo[]
  puede: {
    editar: boolean
    gestionar: boolean
    validar: boolean
    aprobarPlan: boolean
    iniciarEjecucion: boolean
    completarAcciones: boolean
    verificarEficacia: boolean
    reabrir: boolean
  }
}

export interface Evidencia {
  id: string
  nombreOriginal: string
  mimeType: string
  tamanoBytes: number
  descripcion: string | null
  subidoAt: string
  subidoPor: { id: string; nombre: string } | null
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
  crear: async (payload: Record<string, unknown>): Promise<HallazgoDetalle> => (await api.post('/hallazgos', payload)).data,
  editar: async (id: string, payload: Record<string, unknown>): Promise<HallazgoDetalle> =>
    (await api.patch(`/hallazgos/${id}`, payload)).data,
  guardarAnalisis: async (
    id: string,
    payload: {
      metodologia: MetodologiaCausa
      contenido: Record<string, unknown>
      causaInmediata?: string
      causaContribuyente?: string
      causaRaiz?: string
      comentariosEquipo?: string
    },
  ): Promise<HallazgoDetalle> => (await api.put(`/hallazgos/${id}/analisis`, payload)).data,
  guardarPlan: async (id: string, planAccion: string): Promise<HallazgoDetalle> =>
    (await api.put(`/hallazgos/${id}/plan`, { planAccion })).data,
  comentar: async (id: string, texto: string): Promise<HallazgoDetalle> =>
    (await api.post(`/hallazgos/${id}/comentario`, { texto })).data,
  validar: async (id: string, payload: { correccionInmediata?: string; comentario?: string }): Promise<HallazgoDetalle> =>
    (await api.post(`/hallazgos/${id}/validar`, payload)).data,
  aprobarPlan: async (id: string, comentario?: string): Promise<HallazgoDetalle> =>
    (await api.post(`/hallazgos/${id}/aprobar-plan`, { comentario })).data,
  iniciarEjecucion: async (id: string): Promise<HallazgoDetalle> =>
    (await api.post(`/hallazgos/${id}/iniciar-ejecucion`, {})).data,
  completarAcciones: async (id: string, comentario?: string): Promise<HallazgoDetalle> =>
    (await api.post(`/hallazgos/${id}/completar-acciones`, { comentario })).data,
  verificarEficacia: async (
    id: string,
    payload: { eficaciaConfirmada: boolean; verificacionEficacia: string },
  ): Promise<HallazgoDetalle> => (await api.post(`/hallazgos/${id}/verificar-eficacia`, payload)).data,
  reabrir: async (id: string, motivo: string): Promise<HallazgoDetalle> =>
    (await api.post(`/hallazgos/${id}/reabrir`, { motivo })).data,
  archivar: async (id: string, arch: boolean): Promise<HallazgoDetalle> =>
    (await api.post(`/hallazgos/${id}/${arch ? 'archivar' : 'desarchivar'}`, {})).data,
  evidencias: async (id: string): Promise<Evidencia[]> => (await api.get(`/hallazgos/${id}/evidencias`)).data,
  subirEvidencia: async (id: string, file: File, descripcion?: string): Promise<Evidencia> => {
    const fd = new FormData()
    fd.append('archivo', file)
    if (descripcion) fd.append('descripcion', descripcion)
    return (await api.post(`/hallazgos/${id}/evidencias`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
  quitarEvidencia: async (id: string, evidenciaId: string): Promise<void> => {
    await api.delete(`/hallazgos/${id}/evidencias/${evidenciaId}`)
  },
}

export async function descargarEvidencia(hallazgoId: string, evidenciaId: string, nombre: string): Promise<void> {
  const base = api.defaults.baseURL ?? '/api'
  const res = await fetch(`${base}/hallazgos/${hallazgoId}/evidencias/${evidenciaId}/archivo`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
  })
  if (!res.ok) throw new Error('No se pudo descargar')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
