import { api } from '@/lib/api'
import type { Paginado } from '@/lib/tipos'

export type TipoRiesgo = 'RIESGO' | 'OPORTUNIDAD'
export type CategoriaRiesgo = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
export type EficaciaControl = 'NO_EVALUADA' | 'INEFICAZ' | 'PARCIAL' | 'EFICAZ'
export type EstadoRiesgo =
  | 'IDENTIFICADO'
  | 'EN_TRATAMIENTO'
  | 'MONITOREADO'
  | 'CERRADO'
  | 'MATERIALIZADO'

export const ETIQUETA_CATEGORIA: Record<CategoriaRiesgo, string> = {
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
  CRITICO: 'Crítico',
}
export const ETIQUETA_CATEGORIA_OPORTUNIDAD: Record<CategoriaRiesgo, string> = {
  BAJO: 'Baja',
  MEDIO: 'Media',
  ALTO: 'Alta',
  CRITICO: 'Muy alta',
}
export const ETIQUETA_ESTADO: Record<EstadoRiesgo, string> = {
  IDENTIFICADO: 'Identificado',
  EN_TRATAMIENTO: 'En tratamiento',
  MONITOREADO: 'En monitoreo',
  CERRADO: 'Cerrado',
  MATERIALIZADO: 'Materializado',
}
export const ETIQUETA_EFICACIA: Record<EficaciaControl, string> = {
  NO_EVALUADA: 'No evaluada',
  INEFICAZ: 'Ineficaz',
  PARCIAL: 'Parcial',
  EFICAZ: 'Eficaz',
}

export interface AlertaRiesgo {
  revisionVencida: boolean
  revisionProxima: boolean
  planVencido: boolean
  faltaTratamiento: boolean
  requiereReevaluacion: boolean
  sinResidual: boolean
}

export interface RiesgoFila {
  id: string
  codigo: string
  tipo: TipoRiesgo
  descripcion: string
  estado: EstadoRiesgo
  proceso: { id: string; codigo: string; nombre: string }
  responsable: { id: string; nombre: string } | null
  nivelInherente: number
  categoriaInherente: CategoriaRiesgo
  nivelResidual: number | null
  categoriaResidual: CategoriaRiesgo | null
  categoriaEfectiva: CategoriaRiesgo
  fechaRevision: string | null
  archivado: boolean
  alerta: AlertaRiesgo
}

export interface NivelEscala {
  valor: number
  etiqueta: string
  descripcion?: string
}

export interface Matriz {
  id: number
  escalaProbabilidad: NivelEscala[]
  escalaImpacto: NivelEscala[]
  umbralMedio: number
  umbralAlto: number
  umbralCritico: number
  mesesRevisionDefault: number
}

export interface RiesgoDetalle {
  riesgo: RiesgoFila & {
    causa: string | null
    consecuencia: string | null
    probabilidadInherente: number
    impactoInherente: number
    probabilidadResidual: number | null
    impactoResidual: number | null
    controles: string | null
    eficaciaControl: EficaciaControl
    planTratamiento: string | null
    fechaCompromiso: string | null
    ultimaRevisionAt: string | null
    creadoAt: string
    mesesRevisionDefault: number
  }
  revisiones: {
    id: string
    fecha: string
    comentario: string | null
    probabilidad: number | null
    impacto: number | null
    nivel: number | null
    categoria: CategoriaRiesgo | null
    esResidual: boolean
    revisadoPor: { id: string; nombre: string } | null
  }[]
  matriz: {
    escalaProbabilidad: NivelEscala[]
    escalaImpacto: NivelEscala[]
    umbrales: { umbralMedio: number; umbralAlto: number; umbralCritico: number }
  }
  puede: { editar: boolean; cerrar: boolean; archivar: boolean }
}

export interface CeldaCalor {
  probabilidad: number
  impacto: number
  nivel: number
  categoria: CategoriaRiesgo
  riesgos: { id: string; codigo: string; descripcion: string }[]
}

export interface MapaCalor {
  escalaProbabilidad: NivelEscala[]
  escalaImpacto: NivelEscala[]
  umbrales: { umbralMedio: number; umbralAlto: number; umbralCritico: number }
  nivelMaximo: number
  celdas: CeldaCalor[][]
  total: number
}

export interface RiesgoTransversal {
  descripcion: string
  procesos: {
    riesgoId: string
    codigo: string
    proceso: { id: string; codigo: string; nombre: string }
    categoria: CategoriaRiesgo
  }[]
}

export const riesgosApi = {
  matriz: async (): Promise<Matriz> => (await api.get('/riesgos/matriz')).data,
  configurarMatriz: async (payload: Omit<Matriz, 'id'>): Promise<Matriz> =>
    (await api.patch('/riesgos/matriz', payload)).data,
  listar: async (params: {
    q?: string
    procesoId?: string
    tipo?: TipoRiesgo
    categoria?: CategoriaRiesgo
    estado?: EstadoRiesgo
    soloConAlerta?: boolean
    pagina?: number
  }): Promise<Paginado<RiesgoFila>> => (await api.get('/riesgos', { params })).data,
  mapaCalor: async (tipo: TipoRiesgo = 'RIESGO'): Promise<MapaCalor> =>
    (await api.get('/riesgos/mapa-calor', { params: { tipo } })).data,
  transversales: async (): Promise<RiesgoTransversal[]> => (await api.get('/riesgos/transversales')).data,
  obtener: async (id: string): Promise<RiesgoDetalle> => (await api.get(`/riesgos/${id}`)).data,
  crear: async (payload: {
    codigo: string
    tipo: TipoRiesgo
    procesoId: string
    descripcion: string
    causa?: string
    consecuencia?: string
    probabilidadInherente: number
    impactoInherente: number
  }): Promise<RiesgoDetalle> => (await api.post('/riesgos', payload)).data,
  editar: async (id: string, payload: Record<string, unknown>): Promise<RiesgoDetalle> =>
    (await api.patch(`/riesgos/${id}`, payload)).data,
  reevaluar: async (
    id: string,
    payload: { probabilidadResidual: number; impactoResidual: number; comentario?: string; mesesProximaRevision?: number },
  ): Promise<RiesgoDetalle> => (await api.post(`/riesgos/${id}/reevaluar`, payload)).data,
  revisar: async (id: string, payload: { comentario?: string; mesesProximaRevision?: number }): Promise<RiesgoDetalle> =>
    (await api.post(`/riesgos/${id}/revisar`, payload)).data,
  solicitarReevaluacion: async (id: string): Promise<RiesgoDetalle> =>
    (await api.post(`/riesgos/${id}/solicitar-reevaluacion`, {})).data,
  cerrar: async (id: string, comentario: string): Promise<RiesgoDetalle> =>
    (await api.post(`/riesgos/${id}/cerrar`, { comentario })).data,
  reabrir: async (id: string): Promise<RiesgoDetalle> => (await api.post(`/riesgos/${id}/reabrir`, {})).data,
  archivar: async (id: string, arch: boolean): Promise<RiesgoDetalle> =>
    (await api.post(`/riesgos/${id}/${arch ? 'archivar' : 'desarchivar'}`, {})).data,
}
