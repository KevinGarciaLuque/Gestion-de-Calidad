import { api } from '@/lib/api'

export interface ReglaAutomatizacion {
  codigo: string
  nombre: string
  descripcion: string
  activa: boolean
  config: Record<string, unknown>
  orden: number
  actualizadoAt: string
}

export interface EjecucionMotor {
  id: string
  inicio: string
  fin: string | null
  notificaciones: number
  detalle: Record<string, number>
  manual: boolean
}

export const automatizacionesApi = {
  reglas: async (): Promise<ReglaAutomatizacion[]> => (await api.get('/automatizaciones/reglas')).data,
  estado: async (): Promise<EjecucionMotor | null> => (await api.get('/automatizaciones/estado')).data,
  configurar: async (
    codigo: string,
    data: { activa?: boolean; config?: Record<string, unknown> },
  ): Promise<ReglaAutomatizacion> => (await api.patch(`/automatizaciones/reglas/${codigo}`, data)).data,
  ejecutar: async (): Promise<{ notificaciones: number; detalle: Record<string, number> }> =>
    (await api.post('/automatizaciones/ejecutar', {})).data,
}
