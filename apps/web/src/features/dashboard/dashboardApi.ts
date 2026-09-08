import { api } from '@/lib/api'

export type NivelRadar = 'URGENTE' | 'AVISO' | 'INFO'

export interface AlertaRadar {
  nivel: NivelRadar
  texto: string
  ruta: string
}

export interface ResumenDashboard {
  generadoAt: string
  anio: number
  indicadores: {
    total: number
    conMedicion: number
    dentroDeMeta: number
    fueraDeMeta: number
    cumplimientoPct: number | null
    capturaPendiente: number
    semaforo: { verde: number; amarillo: number; rojo: number }
  }
  riesgos: {
    total: number
    criticos: number
    criticosSinTratamiento: number
    revisionVencida: number
    porCategoria: Record<'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO', number>
  }
  auditorias: {
    delAnio: number
    planificadas: number
    enCurso: number
    ejecutadas: number
    cerradas: number
    canceladas: number
    cumplimientoPrograma: number | null
  }
  hallazgos: {
    total: number
    abiertos: number
    vencidos: number
    noConformidadesAbiertas: number
    cerradosPeriodo: number
    porEstado: Record<string, number>
  }
  acciones: {
    total: number
    abiertas: number
    vencidas: number
    porVencer: number
    esperaVerificacion: number
    porEstado: Record<string, number>
  }
  documentos: { vigentes: number; porRevisar30d: number; vencidos: number }
  mcc: { total: number; nuevos: number; enEjecucion: number; cerrados: number }
  radar: AlertaRadar[]
}

export const dashboardApi = {
  resumen: async (): Promise<ResumenDashboard> => (await api.get('/dashboard')).data,
}
