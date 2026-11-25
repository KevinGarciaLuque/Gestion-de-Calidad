import { api, getAccessToken } from '@/lib/api'
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
  | 'SIN_ESTADO'

export type TipoRegistroMCC =
  | 'NO_CONFORMIDAD'
  | 'SALIDA_NO_CONFORME'
  | 'ENTRADA_NO_CONFORME'
  | 'QUEJA'
  | 'FELICITACION'
  | 'SUGERENCIA'
  | 'OTRO'
export type EstatusControl = 'ABIERTO' | 'EN_SEGUIMIENTO' | 'CERRADO' | 'DESESTIMADO' | 'SIN_ESTADO'
export type SituacionAcyp = 'PENDIENTE' | 'SEGUIMIENTO' | 'COMPLETADA' | 'VENCIDA' | null
export type SituacionPlazo = 'CERRADO' | 'VENCIDO' | 'POR_VENCER' | 'EN_PLAZO' | 'SIN_FECHA' | 'NO_APLICA'
export type FasePHVA = 'PLANIFICAR' | 'HACER' | 'VERIFICAR' | 'ACTUAR'

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
  SIN_ESTADO: 'Sin estado (histórico)',
}
export const ORDEN_ESTADOS_MCC: EstadoMCC[] = ['NUEVO', 'ACEPTADO', 'EN_EJECUCION', 'VERIFICACION', 'CERRADO']

export const ETIQUETA_TIPO: Record<TipoRegistroMCC | 'SIN_CLASIFICAR', string> = {
  NO_CONFORMIDAD: 'No conformidad',
  SALIDA_NO_CONFORME: 'Salida no conforme',
  ENTRADA_NO_CONFORME: 'Entrada no conforme',
  QUEJA: 'Queja',
  FELICITACION: 'Felicitación',
  SUGERENCIA: 'Sugerencia',
  OTRO: 'Otro',
  SIN_CLASIFICAR: 'Sin clasificar',
}
export const COLOR_TIPO: Record<TipoRegistroMCC | 'SIN_CLASIFICAR', string> = {
  NO_CONFORMIDAD: '#cf1322',
  SALIDA_NO_CONFORME: '#d4380d',
  ENTRADA_NO_CONFORME: '#d48806',
  QUEJA: '#722ed1',
  FELICITACION: '#389e0d',
  SUGERENCIA: '#0958d9',
  OTRO: '#8c8c8c',
  SIN_CLASIFICAR: '#1d3a52',
}

export const ETIQUETA_ESTATUS: Record<EstatusControl, string> = {
  ABIERTO: 'Abierto',
  EN_SEGUIMIENTO: 'En seguimiento',
  CERRADO: 'Cerrado',
  DESESTIMADO: 'Desestimado / rechazado',
  SIN_ESTADO: 'Sin estado (histórico)',
}
export const COLOR_ESTATUS: Record<EstatusControl, string> = {
  ABIERTO: '#cf1322',
  EN_SEGUIMIENTO: '#d48806',
  CERRADO: '#389e0d',
  DESESTIMADO: '#8c8c8c',
  SIN_ESTADO: '#bfbfbf',
}
export const TAG_ESTATUS: Record<EstatusControl, string> = {
  ABIERTO: 'error',
  EN_SEGUIMIENTO: 'warning',
  CERRADO: 'success',
  DESESTIMADO: 'default',
  SIN_ESTADO: 'default',
}

export const ETIQUETA_PHVA: Record<FasePHVA, string> = {
  PLANIFICAR: 'Planificar',
  HACER: 'Hacer',
  VERIFICAR: 'Verificar',
  ACTUAR: 'Actuar',
}

export interface MccFila {
  id: string
  codigo: string
  codigoTipo: string | null
  tipoRegistro: TipoRegistroMCC | null
  titulo: string
  origen: OrigenMCC
  estado: EstadoMCC
  estatus: EstatusControl
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | null
  impacto: string | null
  area: { id: string; nombre: string } | null
  areaResponsable: string | null
  macroproceso: string | null
  propuestoPor: { id: string; nombre: string } | null
  accionesTotal: number
  accionesCerradas: number
  fechaRecepcion: string | null
  creadoAt: string
  fechaCierre: string | null
  archivado: boolean
}

export interface DatosControl {
  gestorCalidad: string | null
  usuarioEncuentra: string | null
  areaReporta: string | null
  fuente: string | null
  fuenteSecundaria: string | null
  numeroExpediente: string | null
  turno: string | null
  procesoAfectado: string | null
  subproceso: string | null
  procedimiento: string | null
  subrogado: string | null
  dondeImpacto: string | null
  causaRaiz: string | null
  porques: string[] | null
  requiereAcyp: boolean
  acypCodigo: string | null
  compromisosAdquiridos: number | null
  compromisosCumplidos: number | null
  cumplimiento: number | null
  escalamiento: string | null
  tieneCostos: boolean
  costoCalidad: number | null
  phva: FasePHVA | null
  logros: string | null
  leanDefecto: string | null
  leanRetrabajo: string | null
  leanEspera: string | null
  leanMovimiento: string | null
  responsableNombre: string | null
  fechaNotificacion: string | null
  fechaCompromisoRespuesta: string | null
  fechaLimite: string | null
  validacionCalidad: string | null
  notaEvidencia: string | null
  importadoAt: string | null
  acyp: SituacionAcyp
  plazo: { situacion: SituacionPlazo; dias: number | null }
}

export interface MccDetalle {
  registro: MccFila & {
    descripcion: string
    origenDetalle: string | null
    decisionJustificacion: string | null
    evaluacionResultado: string | null
    aprendizaje: string | null
    gestionadoPor: { id: string; nombre: string } | null
    control: DatosControl
  }
  eventos: { id: string; fecha: string; tipo: string; detalle: string | null; estadoNuevo: EstadoMCC | null; actorNombre: string | null }[]
  acciones: { id: string; codigo: string; descripcion: string; estado: string; avance: number; responsable: { nombre: string } | null }[]
  puede: { editar: boolean; gestionar: boolean; crearAccion: boolean }
}

/** Filtros compartidos por el tablero y la tabla de Control ACyP. */
export interface FiltrosControl {
  desde?: string
  hasta?: string
  macroproceso?: string
  area?: string
  mes?: number
  tipo?: TipoRegistroMCC
}

interface Conteo {
  total: number
  abiertos: number
  seguimiento: number
  cerrados: number
  desestimados: number
  sinEstado: number
  vencidos: number
}

export interface TableroMCC {
  generadoAt: string
  ultimaActualizacion: string | null
  safetyClock: { dias: number | null; desde: string | null }
  kpis: {
    total: number
    costoTotal: number
    porcentajeCierre: number
    cerrados: number
    baseCierre: number
    abiertos: number
    seguimiento: number
    vencidos: number
    porVencer: number
  }
  matrizEstado: { estatus: EstatusControl; cantidad: number; porcentaje: number }[]
  acyp: { pendientes: number; seguimiento: number; completadas: number; vencidas: number; total: number }
  porTipo: (Conteo & { tipo: TipoRegistroMCC | 'SIN_CLASIFICAR'; porcentaje: number; porcentajeCierre: number })[]
  porArea: { area: string; macroproceso: string | null; total: number; porcentaje: number; cerrados: number; abiertos: number; otros: number }[]
  consolidado: (Conteo & {
    macroproceso: string
    area: string
    codigos: { id: string; codigo: string }[]
    acypPendientes: number
    acypCompletadas: number
    acypVencidas: number
    porcentajeCierre: number
  })[]
}

export interface FilaControl {
  id: string
  codigo: string
  codigoTipo: string | null
  tipoRegistro: TipoRegistroMCC | null
  titulo: string
  descripcion: string
  estatus: EstatusControl
  estado: EstadoMCC
  fechaRecepcion: string
  macroproceso: string | null
  areaResponsable: string | null
  responsableNombre: string | null
  fechaLimite: string | null
  fechaCierre: string | null
  acypCodigo: string | null
  acyp: SituacionAcyp
  cumplimiento: number | null
  plazo: { situacion: SituacionPlazo; dias: number | null }
  tieneEvidencia: boolean
  critico: boolean
}

export interface CatalogosMCC {
  macroprocesos: string[]
  areas: string[]
  fuentes: string[]
  fuentesSecundarias: string[]
  responsables: string[]
  gestores: string[]
  impactos: string[]
  dondeImpacto: string[]
  escalamientos: string[]
  areasReporta: string[]
}

export interface ResultadoImportacion {
  simulacion: boolean
  filasLeidas: number
  validas: number
  nuevos: number
  actualizados: number
  errores: { fila: number; mensaje: string }[]
  advertencias: { fila: number; mensaje: string }[]
  totalAdvertencias: number
  columnasReconocidas: string[]
  columnasIgnoradas: string[]
  muestra: {
    fila: number
    codigo: string | null
    codigoTipo: string | null
    tipoRegistro: TipoRegistroMCC | null
    estatus: EstatusControl
    fechaRecepcion: string | null
    macroproceso: string | null
    areaResponsable: string | null
    titulo: string
    costoCalidad: number | null
  }[]
}

export type EvidenciaMCC = {
  id: string
  nombreOriginal: string
  tamanoBytes: number
  subidoAt: string
  subidoPor: { nombre: string } | null
}

export const mccApi = {
  listar: async (params: { q?: string; origen?: OrigenMCC; estado?: EstadoMCC; mios?: boolean; pagina?: number }): Promise<Paginado<MccFila>> =>
    (await api.get('/mcc', { params })).data,
  obtener: async (id: string): Promise<MccDetalle> => (await api.get(`/mcc/${id}`)).data,
  crear: async (payload: Record<string, unknown>): Promise<MccDetalle> => (await api.post('/mcc', payload)).data,
  editar: async (id: string, payload: Record<string, unknown>): Promise<MccDetalle> => (await api.patch(`/mcc/${id}`, payload)).data,
  decidir: async (id: string, payload: { procede: boolean; justificacion: string; impacto?: string; prioridad?: string }): Promise<MccDetalle> =>
    (await api.post(`/mcc/${id}/decidir`, payload)).data,
  iniciarEjecucion: async (id: string): Promise<MccDetalle> => (await api.post(`/mcc/${id}/iniciar-ejecucion`, {})).data,
  verificacion: async (id: string): Promise<MccDetalle> => (await api.post(`/mcc/${id}/verificacion`, {})).data,
  cerrar: async (id: string, payload: { evaluacionResultado: string; aprendizaje?: string }): Promise<MccDetalle> =>
    (await api.post(`/mcc/${id}/cerrar`, payload)).data,
  comentar: async (id: string, texto: string): Promise<MccDetalle> => (await api.post(`/mcc/${id}/comentario`, { texto })).data,

  // Control MCC
  tablero: async (f: FiltrosControl): Promise<TableroMCC> => (await api.get('/mcc/control/tablero', { params: f })).data,
  control: async (
    params: FiltrosControl & { q?: string; estatus?: EstatusControl; situacion?: string; pagina?: number; porPagina?: number },
  ): Promise<Paginado<FilaControl>> => (await api.get('/mcc/control/registros', { params })).data,
  catalogos: async (): Promise<CatalogosMCC> => (await api.get('/mcc/control/catalogos')).data,
  edicionRapida: async (id: string, payload: Record<string, unknown>) => (await api.patch(`/mcc/control/${id}`, payload)).data,
  importar: async (archivo: File, simular: boolean): Promise<ResultadoImportacion> => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    return (await api.post('/mcc/control/importar', fd, { params: { simular: String(simular) }, headers: { 'Content-Type': 'multipart/form-data' } })).data
  },

  // Evidencias
  evidencias: async (id: string): Promise<EvidenciaMCC[]> => (await api.get(`/mcc/${id}/evidencias`)).data,
  subirEvidencia: async (id: string, file: File) => {
    const fd = new FormData()
    fd.append('archivo', file)
    return (await api.post(`/mcc/${id}/evidencias`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
  quitarEvidencia: async (id: string, evidenciaId: string) => {
    await api.delete(`/mcc/${id}/evidencias/${evidenciaId}`)
  },
  descargarEvidencia: async (id: string, evidenciaId: string, nombre: string) => {
    const base = api.defaults.baseURL ?? '/api'
    const res = await fetch(`${base}/mcc/${id}/evidencias/${evidenciaId}/archivo`, {
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
    })
    if (!res.ok) throw new Error('No se pudo descargar')
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}

export const lempiras = (n: number) =>
  `L. ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
