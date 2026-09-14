import { api, getAccessToken } from '@/lib/api'

export interface RespaldoInfo {
  nombre: string
  tamanoBytes: number
  creadoAt: string
}

export const respaldosApi = {
  listar: async (): Promise<RespaldoInfo[]> => (await api.get('/respaldos')).data,
  crear: async (): Promise<RespaldoInfo> => (await api.post('/respaldos', {})).data,
}

export async function descargarRespaldo(nombre: string): Promise<void> {
  const base = api.defaults.baseURL ?? '/api'
  const res = await fetch(`${base}/respaldos/${encodeURIComponent(nombre)}/archivo`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
  })
  if (!res.ok) throw new Error('No se pudo descargar el respaldo')
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
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
