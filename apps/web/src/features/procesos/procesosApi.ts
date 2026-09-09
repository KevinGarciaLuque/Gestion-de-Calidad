import { api } from '@/lib/api'
import type { Paginado } from '@/lib/tipos'
import type { EstadoSemaforo } from '@/app/theme'

export type TipoProceso = 'ESTRATEGICO' | 'MISIONAL' | 'APOYO'
export type EstadoProceso = 'BORRADOR' | 'VIGENTE' | 'ARCHIVADO'
export type EstadoVersion = 'BORRADOR' | 'EN_REVISION' | 'APROBADA' | 'OBSOLETA'
export type TipoRecurso =
  | 'PERSONAL'
  | 'TECNOLOGIA'
  | 'INFRAESTRUCTURA'
  | 'EQUIPO'
  | 'INFORMACION'
export type TipoRelacion = 'PROVEEDOR' | 'CLIENTE'

export const ETIQUETA_TIPO_PROCESO: Record<TipoProceso, string> = {
  ESTRATEGICO: 'Estratégicos',
  MISIONAL: 'Misionales',
  APOYO: 'De apoyo',
}
export const ETIQUETA_TIPO_RECURSO: Record<TipoRecurso, string> = {
  PERSONAL: 'Personal',
  TECNOLOGIA: 'Tecnología',
  INFRAESTRUCTURA: 'Infraestructura',
  EQUIPO: 'Equipos',
  INFORMACION: 'Información',
}

export interface Semaforo {
  estado: EstadoSemaforo
  motivos: string[]
}

export interface ProcesoResumen {
  id: string
  codigo: string
  nombre: string
  tipo: TipoProceso
  estado: EstadoProceso
  area: { id: string; nombre: string } | null
  responsable: { id: string; nombre: string } | null
  versionVigente: number | null
  enRevision: boolean
  tieneCambiosEnCurso: boolean
  semaforo: Semaforo
}

export interface EntradaFicha {
  proveedor: string
  insumo: string
  requisitos?: string
}
export interface ActividadFicha {
  orden: number
  actividad: string
  responsable?: string
  puntoControl?: string
}
export interface SalidaFicha {
  salida: string
  registro?: string
  cliente?: string
}
export interface RecursoFicha {
  tipo: TipoRecurso
  detalle: string
}

export interface VersionFicha {
  id: string
  numero: number
  estado: EstadoVersion
  alcance: string
  entradas: EntradaFicha[]
  actividades: ActividadFicha[]
  salidas: SalidaFicha[]
  recursos: RecursoFicha[]
  notas: string | null
  flujograma: string | null
  enviadaRevisionAt: string | null
  aprobadaAt: string | null
  comentarioRevision: string | null
}

export interface ProcesoDetalle {
  proceso: {
    id: string
    codigo: string
    nombre: string
    tipo: TipoProceso
    objetivo: string
    estado: EstadoProceso
    area: { id: string; nombre: string } | null
    responsable: { id: string; nombre: string; email: string } | null
    suplente: { id: string; nombre: string; email: string } | null
    ultimaAprobacionAt: string | null
    proximaRevisionAt: string | null
    semaforo: Semaforo
  }
  versionVigente: VersionFicha | null
  versionTrabajo: VersionFicha | null
  historial: {
    id: string
    numero: number
    estado: EstadoVersion
    propuestaPor: { id: string; nombre: string } | null
    enviadaRevisionAt: string | null
    aprobadaAt: string | null
    comentarioRevision: string | null
    creadoAt: string
  }[]
  relaciones: {
    id: string
    sentido: 'saliente' | 'entrante'
    tipo: TipoRelacion
    proceso: { id: string; codigo: string; nombre: string }
    descripcion: string | null
  }[]
  puede: { editar: boolean; revisar: boolean; aprobar: boolean; archivar: boolean }
}

export interface FichaPayload {
  alcance: string
  entradas: EntradaFicha[]
  actividades: ActividadFicha[]
  salidas: SalidaFicha[]
  recursos: RecursoFicha[]
  notas?: string
  flujograma?: string | null
}

export interface MapaConfig {
  entradas: string[]
  salidas: string[]
  franjaSuperior: string[]
  notaPie: string | null
  actualizadoAt: string
}

export const procesosApi = {
  async mapa(): Promise<{ tipo: TipoProceso; procesos: ProcesoResumen[] }[]> {
    const { data } = await api.get('/procesos/mapa')
    return data
  },
  async mapaConfig(): Promise<MapaConfig> {
    const { data } = await api.get('/procesos/mapa-config')
    return data
  },
  async guardarMapaConfig(payload: Partial<Omit<MapaConfig, 'actualizadoAt'>>): Promise<MapaConfig> {
    const { data } = await api.patch('/procesos/mapa-config', payload)
    return data
  },
  async listar(params: {
    q?: string
    tipo?: TipoProceso
    estado?: EstadoProceso
    pagina?: number
  }): Promise<Paginado<ProcesoResumen>> {
    const { data } = await api.get('/procesos', { params })
    return data
  },
  async obtener(id: string): Promise<ProcesoDetalle> {
    const { data } = await api.get(`/procesos/${id}`)
    return data
  },
  async crear(payload: {
    codigo: string
    nombre: string
    tipo: TipoProceso
    objetivo: string
    areaId?: string
    responsableId?: string
    suplenteId?: string
  }): Promise<ProcesoDetalle> {
    const { data } = await api.post('/procesos', payload)
    return data
  },
  async editar(
    id: string,
    payload: Partial<{
      nombre: string
      tipo: TipoProceso
      objetivo: string
      areaId: string | null
      responsableId: string | null
      suplenteId: string | null
    }>,
  ): Promise<ProcesoDetalle> {
    const { data } = await api.patch(`/procesos/${id}`, payload)
    return data
  },
  async guardarFicha(id: string, payload: FichaPayload): Promise<ProcesoDetalle> {
    const { data } = await api.put(`/procesos/${id}/ficha`, payload)
    return data
  },
  async enviarRevision(id: string): Promise<ProcesoDetalle> {
    const { data } = await api.post(`/procesos/${id}/enviar-revision`, {})
    return data
  },
  async devolver(id: string, comentario?: string): Promise<ProcesoDetalle> {
    const { data } = await api.post(`/procesos/${id}/devolver`, { comentario })
    return data
  },
  async aprobar(id: string, comentario?: string, mesesProximaRevision?: number): Promise<ProcesoDetalle> {
    const { data } = await api.post(`/procesos/${id}/aprobar`, { comentario, mesesProximaRevision })
    return data
  },
  async archivar(id: string, archivar: boolean): Promise<ProcesoDetalle> {
    const { data } = await api.post(`/procesos/${id}/${archivar ? 'archivar' : 'desarchivar'}`, {})
    return data
  },
  async agregarRelacion(
    id: string,
    payload: { destinoId: string; tipo: TipoRelacion; descripcion?: string },
  ): Promise<ProcesoDetalle> {
    const { data } = await api.post(`/procesos/${id}/relaciones`, payload)
    return data
  },
  async quitarRelacion(id: string, relacionId: string): Promise<ProcesoDetalle> {
    const { data } = await api.delete(`/procesos/${id}/relaciones/${relacionId}`)
    return data
  },
}
