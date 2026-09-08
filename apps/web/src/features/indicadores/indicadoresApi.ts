import { api } from '@/lib/api'
import type { Paginado } from '@/lib/tipos'

export type Frecuencia = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'
export type Sentido = 'CRECIENTE' | 'DECRECIENTE'
export type SemaforoMedicion = 'VERDE' | 'AMARILLO' | 'ROJO'
export type Tendencia = 'MEJORA' | 'DETERIORO' | 'ESTABLE' | 'SIN_DATO'

export const ETIQUETA_FRECUENCIA: Record<Frecuencia, string> = {
  MENSUAL: 'Mensual',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
}

export interface AlertaIndicador {
  capturaPendiente: boolean
  periodosVencidos: number
  fueraDeMeta: boolean
  reincidente: boolean
  requierenAnalisis: number
  ultimoSemaforo: SemaforoMedicion | null
  ultimoValor: number | null
  ultimoPeriodo: string | null
}

export interface IndicadorFila {
  id: string
  codigo: string
  nombre: string
  unidad: string
  frecuencia: Frecuencia
  meta: number
  sentido: Sentido
  activo: boolean
  proceso: { id: string; codigo: string; nombre: string }
  responsableCaptura: { id: string; nombre: string } | null
  alerta: AlertaIndicador
}

export interface DefinicionIndicador {
  id: string
  codigo: string
  nombre: string
  objetivo: string
  proceso: { id: string; codigo: string; nombre: string }
  formula: string
  usaNumeradorDenominador: boolean
  expresarPorcentaje: boolean
  unidad: string
  fuenteDatos: string | null
  frecuencia: Frecuencia
  sentido: Sentido
  meta: number
  umbralAmarillo: number | null
  responsableCaptura: { id: string; nombre: string } | null
  responsableAnalisis: { id: string; nombre: string } | null
  activo: boolean
}

export interface Medicion {
  id: string
  anio: number
  periodo: number
  etiqueta: string
  numerador: number | null
  denominador: number | null
  valor: number
  semaforo: SemaforoMedicion
  tendencia: Tendencia
  analisis: string | null
  planAccion: string | null
  evidenciaUrl: string | null
  requiereAnalisis: boolean
  capturadoAt: string
  analizadoAt: string | null
}

export interface IndicadorDetalle {
  indicador: DefinicionIndicador
  mediciones: Medicion[]
  alerta: AlertaIndicador
  periodosDisponibles: { anio: number; periodo: number; etiqueta: string }[]
  puede: { editar: boolean; capturar: boolean; analizar: boolean; archivar: boolean }
}

export interface Consolidado {
  anio: number
  total: number
  resumen: {
    verde: number
    amarillo: number
    rojo: number
    sinDato: number
    cumplimiento: number | null
  }
  porProceso: {
    proceso: { id: string; codigo: string; nombre: string }
    verde: number
    amarillo: number
    rojo: number
    sinDato: number
  }[]
}

export interface CrearIndicadorPayload {
  codigo: string
  nombre: string
  objetivo: string
  procesoId: string
  formula: string
  usaNumeradorDenominador: boolean
  expresarPorcentaje: boolean
  unidad: string
  fuenteDatos?: string
  frecuencia: Frecuencia
  sentido: Sentido
  meta: number
  umbralAmarillo?: number | null
  responsableCapturaId?: string | null
  responsableAnalisisId?: string | null
}

export const indicadoresApi = {
  async listar(params: {
    q?: string
    procesoId?: string
    frecuencia?: Frecuencia
    soloConAlerta?: boolean
    pagina?: number
  }): Promise<Paginado<IndicadorFila>> {
    const { data } = await api.get('/indicadores', { params })
    return data
  },
  async obtener(id: string): Promise<IndicadorDetalle> {
    const { data } = await api.get(`/indicadores/${id}`)
    return data
  },
  async consolidado(anio: number, procesoId?: string): Promise<Consolidado> {
    const { data } = await api.get('/indicadores/consolidado', { params: { anio, procesoId } })
    return data
  },
  async crear(payload: CrearIndicadorPayload): Promise<IndicadorDetalle> {
    const { data } = await api.post('/indicadores', payload)
    return data
  },
  async editar(id: string, payload: Partial<CrearIndicadorPayload>): Promise<IndicadorDetalle> {
    const { data } = await api.patch(`/indicadores/${id}`, payload)
    return data
  },
  async archivar(id: string, archivar: boolean): Promise<IndicadorDetalle> {
    const { data } = await api.post(`/indicadores/${id}/${archivar ? 'archivar' : 'desarchivar'}`, {})
    return data
  },
  async registrarMedicion(
    id: string,
    payload: {
      anio: number
      periodo: number
      numerador?: number | null
      denominador?: number | null
      valor?: number | null
      analisis?: string
      planAccion?: string
      evidenciaUrl?: string
    },
  ): Promise<IndicadorDetalle> {
    const { data } = await api.post(`/indicadores/${id}/mediciones`, payload)
    return data
  },
  async analizarMedicion(
    id: string,
    medicionId: string,
    payload: { analisis: string; planAccion?: string },
  ): Promise<IndicadorDetalle> {
    const { data } = await api.patch(`/indicadores/${id}/mediciones/${medicionId}/analisis`, payload)
    return data
  },
  async eliminarMedicion(id: string, medicionId: string): Promise<IndicadorDetalle> {
    const { data } = await api.delete(`/indicadores/${id}/mediciones/${medicionId}`)
    return data
  },
}
