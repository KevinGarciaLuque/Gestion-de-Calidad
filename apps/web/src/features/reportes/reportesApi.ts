import { api, getAccessToken } from '@/lib/api'
import type { ResumenDashboard } from '@/features/dashboard/dashboardApi'

export interface ReporteMeta {
  tipo: string
  titulo: string
  descripcion: string
}

export interface ReporteDatos {
  tipo: string
  titulo: string
  descripcion: string
  generadoAt: string
  columnas: { key: string; label: string }[]
  filas: Record<string, string | number>[]
}

export type InformeEjecutivo = ResumenDashboard & { organizacion: string }

export const reportesApi = {
  catalogo: async (): Promise<ReporteMeta[]> => (await api.get('/reportes')).data,
  datos: async (tipo: string): Promise<ReporteDatos> => (await api.get(`/reportes/${tipo}`)).data,
  ejecutivo: async (): Promise<InformeEjecutivo> => (await api.get('/reportes/ejecutivo')).data,
}

export async function descargarReporteCsv(tipo: string, nombre: string): Promise<void> {
  const base = api.defaults.baseURL ?? '/api'
  const res = await fetch(`${base}/reportes/${tipo}?formato=csv`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
  })
  if (!res.ok) throw new Error('No se pudo generar el CSV')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
