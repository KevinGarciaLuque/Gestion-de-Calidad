import { api, getAccessToken } from '@/lib/api'
import type { Paginado } from '@/lib/tipos'

export type TipoAccion = 'CORRECCION' | 'ACCION_CORRECTIVA' | 'TRATAMIENTO_RIESGO' | 'MEJORA'
export type OrigenAccion = 'HALLAZGO' | 'RIESGO' | 'INDICADOR' | 'AUDITORIA' | 'COMITE' | 'MCC' | 'OTRO'
export type EstadoAccion = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA' | 'VERIFICADA' | 'CANCELADA'
export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA'

export const ETIQUETA_TIPO_ACCION: Record<TipoAccion, string> = {
  CORRECCION: 'Corrección',
  ACCION_CORRECTIVA: 'Acción correctiva',
  TRATAMIENTO_RIESGO: 'Tratamiento de riesgo',
  MEJORA: 'Mejora',
}
export const ETIQUETA_ESTADO_ACCION: Record<EstadoAccion, string> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  COMPLETADA: 'Completada',
  VERIFICADA: 'Verificada',
  CANCELADA: 'Cancelada',
}
export const ETIQUETA_ORIGEN_ACCION: Record<OrigenAccion, string> = {
  HALLAZGO: 'Hallazgo / no conformidad',
  RIESGO: 'Riesgo',
  INDICADOR: 'Indicador fuera de meta',
  AUDITORIA: 'Auditoría',
  COMITE: 'Comité',
  MCC: 'Mejora continua',
  OTRO: 'Otro',
}

export interface Origen {
  tipo: string
  ref: string | null
  id: string | null
  ruta: string | null
}

export interface AccionFila {
  id: string
  codigo: string
  tipo: TipoAccion
  descripcion: string
  estado: EstadoAccion
  prioridad: Prioridad
  avance: number
  responsable: { id: string; nombre: string } | null
  proceso: { id: string; codigo: string } | null
  origen: Origen
  fechaCompromiso: string | null
  fechaCierre: string | null
  archivado: boolean
  alerta: { vencida: boolean; proxima: boolean; sinResponsable: boolean; esperaVerificacion: boolean }
}

export interface AccionDetalle {
  accion: AccionFila & {
    resultadoEsperado: string | null
    colaboradores: { id: string; nombre: string }[]
    fechaInicio: string | null
    evidenciaRequerida: string | null
    verificacionEficacia: string | null
    eficaz: boolean | null
    verificadoPor: { id: string; nombre: string } | null
    verificadoAt: string | null
    creadoAt: string
  }
  avances: {
    id: string
    fecha: string
    avance: number
    comentario: string | null
    estadoNuevo: EstadoAccion | null
    por: { id: string; nombre: string } | null
  }[]
  puede: { editar: boolean; verificar: boolean }
}

export const accionesApi = {
  listar: async (params: {
    q?: string
    tipo?: TipoAccion
    estado?: EstadoAccion
    origen?: OrigenAccion
    hallazgoId?: string
    riesgoId?: string
    mccId?: string
    mias?: boolean
    abiertas?: boolean
    vencidas?: boolean
    pagina?: number
  }): Promise<Paginado<AccionFila>> => (await api.get('/acciones', { params })).data,
  obtener: async (id: string): Promise<AccionDetalle> => (await api.get(`/acciones/${id}`)).data,
  crear: async (payload: {
    tipo: TipoAccion
    descripcion: string
    resultadoEsperado?: string
    origen: OrigenAccion
    origenLibre?: string
    hallazgoId?: string
    riesgoId?: string
    medicionId?: string
    procesoId?: string
    mccId?: string
    responsableId?: string
    fechaInicio?: string
    fechaCompromiso?: string
    prioridad?: Prioridad
    evidenciaRequerida?: string
    colaboradoresIds?: string[]
  }): Promise<AccionDetalle> => (await api.post('/acciones', payload)).data,
  editar: async (id: string, payload: Record<string, unknown>): Promise<AccionDetalle> =>
    (await api.patch(`/acciones/${id}`, payload)).data,
  avance: async (id: string, avance: number, comentario?: string): Promise<AccionDetalle> =>
    (await api.post(`/acciones/${id}/avance`, { avance, comentario })).data,
  verificar: async (id: string, eficaz: boolean, verificacionEficacia: string): Promise<AccionDetalle> =>
    (await api.post(`/acciones/${id}/verificar`, { eficaz, verificacionEficacia })).data,
  cancelar: async (id: string, motivo: string): Promise<AccionDetalle> =>
    (await api.post(`/acciones/${id}/cancelar`, { motivo })).data,
  archivar: async (id: string, arch: boolean): Promise<AccionDetalle> =>
    (await api.post(`/acciones/${id}/${arch ? 'archivar' : 'desarchivar'}`, {})).data,
  evidencias: async (id: string) => (await api.get(`/acciones/${id}/evidencias`)).data,
  subirEvidencia: async (id: string, file: File) => {
    const fd = new FormData()
    fd.append('archivo', file)
    return (await api.post(`/acciones/${id}/evidencias`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
  quitarEvidencia: async (id: string, evidenciaId: string) => {
    await api.delete(`/acciones/${id}/evidencias/${evidenciaId}`)
  },
}

export async function descargarEvidenciaAccion(accionId: string, evidenciaId: string, nombre: string): Promise<void> {
  const base = api.defaults.baseURL ?? '/api'
  const res = await fetch(`${base}/acciones/${accionId}/evidencias/${evidenciaId}/archivo`, {
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
