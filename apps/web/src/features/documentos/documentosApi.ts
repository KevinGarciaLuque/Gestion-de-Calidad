import { api, getAccessToken } from '@/lib/api'
import type { Paginado } from '@/lib/tipos'

export type TipoDocumento =
  | 'POLITICA'
  | 'MANUAL'
  | 'PROCEDIMIENTO'
  | 'PROTOCOLO'
  | 'INSTRUCTIVO'
  | 'FORMATO'
  | 'REGISTRO'
  | 'GUIA'
  | 'LISTA_MAESTRA'
  | 'EXTERNO'

export type EstadoVersionDoc = 'BORRADOR' | 'EN_REVISION' | 'VIGENTE' | 'OBSOLETA'

export const ETIQUETA_TIPO_DOC: Record<TipoDocumento, string> = {
  POLITICA: 'Política',
  MANUAL: 'Manual',
  PROCEDIMIENTO: 'Procedimiento',
  PROTOCOLO: 'Protocolo',
  INSTRUCTIVO: 'Instructivo',
  FORMATO: 'Formato',
  REGISTRO: 'Registro',
  GUIA: 'Guía',
  LISTA_MAESTRA: 'Listado maestro',
  EXTERNO: 'Documento externo',
}

export interface AlertaDoc {
  sinVigente: boolean
  revisionVencida: boolean
  revisionProxima: boolean
  enRevision: boolean
  sinArchivo: boolean
}

export interface ArchivoInfo {
  id: string
  nombreOriginal: string
  mimeType: string
  tamanoBytes: number
  hashSha256: string
  subidoAt: string
}

export interface VersionDoc {
  id: string
  numero: number
  estado: EstadoVersionDoc
  motivoCambio: string | null
  fechaEmision: string | null
  fechaVigenciaDesde: string | null
  proximaRevisionAt: string | null
  enviadaRevisionAt: string | null
  aprobadaAt: string | null
  comentarioRevision: string | null
  propuestaPor: { id: string; nombre: string } | null
  revisor: { id: string; nombre: string } | null
  aprobador: { id: string; nombre: string } | null
  archivo: ArchivoInfo | null
  creadoAt: string
}

export interface DocumentoFila {
  id: string
  codigo: string
  nombre: string
  tipo: TipoDocumento
  proceso: { id: string; codigo: string } | null
  area: { id: string; nombre: string } | null
  propietario: { id: string; nombre: string } | null
  restringido: boolean
  archivado: boolean
  versionVigente: number | null
  fechaVigenciaDesde: string | null
  proximaRevisionAt: string | null
  estadoTrabajo: EstadoVersionDoc | null
  alerta: AlertaDoc
}

export interface DocumentoDetalle {
  documento: {
    id: string
    codigo: string
    nombre: string
    tipo: TipoDocumento
    proceso: { id: string; codigo: string; nombre: string } | null
    area: { id: string; nombre: string } | null
    propietario: { id: string; nombre: string } | null
    restringido: boolean
    palabrasClave: string | null
    archivado: boolean
    alerta: AlertaDoc
  }
  versionVigente: VersionDoc | null
  versionTrabajo: VersionDoc | null
  historial: VersionDoc[]
  puede: { editar: boolean; revisar: boolean; aprobar: boolean; archivar: boolean }
}

export interface FilaListaMaestra {
  id: string
  codigo: string
  nombre: string
  tipo: TipoDocumento
  version: number
  proceso: { id: string; codigo: string } | null
  area: { id: string; nombre: string } | null
  propietario: { id: string; nombre: string } | null
  fechaVigenciaDesde: string | null
  proximaRevisionAt: string | null
  tieneArchivo: boolean
}

export const documentosApi = {
  listar: async (params: {
    q?: string
    tipo?: TipoDocumento
    procesoId?: string
    estado?: string
    soloConAlerta?: boolean
    pagina?: number
  }): Promise<Paginado<DocumentoFila>> => (await api.get('/documentos', { params })).data,
  listaMaestra: async (): Promise<FilaListaMaestra[]> => (await api.get('/documentos/lista-maestra')).data,
  obtener: async (id: string): Promise<DocumentoDetalle> => (await api.get(`/documentos/${id}`)).data,
  crear: async (payload: {
    codigo: string
    nombre: string
    tipo: TipoDocumento
    procesoId?: string
    areaId?: string
    propietarioId?: string
    palabrasClave?: string
  }): Promise<DocumentoDetalle> => (await api.post('/documentos', payload)).data,
  editar: async (id: string, payload: Record<string, unknown>): Promise<DocumentoDetalle> =>
    (await api.patch(`/documentos/${id}`, payload)).data,
  guardarVersion: async (
    id: string,
    payload: {
      motivoCambio?: string
      fechaEmision?: string
      mesesProximaRevision?: number
      revisorId?: string | null
      aprobadorId?: string | null
    },
  ): Promise<DocumentoDetalle> => (await api.put(`/documentos/${id}/version`, payload)).data,
  enviarRevision: async (id: string): Promise<DocumentoDetalle> =>
    (await api.post(`/documentos/${id}/enviar-revision`, {})).data,
  devolver: async (id: string, comentario?: string): Promise<DocumentoDetalle> =>
    (await api.post(`/documentos/${id}/devolver`, { comentario })).data,
  aprobar: async (id: string, comentario?: string): Promise<DocumentoDetalle> =>
    (await api.post(`/documentos/${id}/aprobar`, { comentario })).data,
  archivar: async (id: string, arch: boolean): Promise<DocumentoDetalle> =>
    (await api.post(`/documentos/${id}/${arch ? 'archivar' : 'desarchivar'}`, {})).data,
  subirArchivo: async (id: string, file: File): Promise<DocumentoDetalle> => {
    const fd = new FormData()
    fd.append('archivo', file)
    return (await api.post(`/documentos/${id}/archivo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
}

/** Descarga autenticada del archivo de una versión. */
export async function descargarArchivo(documentoId: string, versionId: string, nombre: string): Promise<void> {
  const base = api.defaults.baseURL ?? '/api'
  const res = await fetch(`${base}/documentos/${documentoId}/versiones/${versionId}/archivo`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
  })
  if (!res.ok) throw new Error('No se pudo descargar el archivo')
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

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
