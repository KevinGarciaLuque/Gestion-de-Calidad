import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

/**
 * Cliente HTTP para la API de Calidad 360.
 * `withCredentials` permite enviar/recibir la cookie del refresh token.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let accessToken: string | null = null
export function setAccessToken(token: string | null): void {
  accessToken = token
}
export function getAccessToken(): string | null {
  return accessToken
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// ── Refresco automático de sesión ante un 401 ───────────────────────────────
type Reintentable = InternalAxiosRequestConfig & { _reintento?: boolean }

let refrescando: Promise<string | null> | null = null

/** Callbacks para que la app reaccione a un refresh exitoso o a la expiración. */
let onRefrescado: ((token: string) => void) | null = null
let onSesionExpirada: (() => void) | null = null
export function configurarAuthEvents(opts: {
  onRefrescado?: (token: string) => void
  onSesionExpirada?: () => void
}): void {
  onRefrescado = opts.onRefrescado ?? null
  onSesionExpirada = opts.onSesionExpirada ?? null
}

async function refrescarSesion(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ accessToken: string }>(
      `${api.defaults.baseURL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    setAccessToken(data.accessToken)
    onRefrescado?.(data.accessToken)
    return data.accessToken
  } catch {
    setAccessToken(null)
    onSesionExpirada?.()
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as Reintentable | undefined
    const url = original?.url ?? ''
    const esRutaAuth = url.includes('/auth/login') || url.includes('/auth/refresh')

    if (error.response?.status === 401 && original && !original._reintento && !esRutaAuth) {
      original._reintento = true
      refrescando ??= refrescarSesion().finally(() => {
        refrescando = null
      })
      const nuevo = await refrescando
      if (nuevo) {
        original.headers.Authorization = `Bearer ${nuevo}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)

// ── Utilidades ─────────────────────────────────────────────────────────────
export interface ApiError {
  statusCode: number
  error: string
  message: string | string[]
  path?: string
}

export function mensajeDeError(err: unknown, porDefecto = 'Ocurrió un error inesperado.'): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiError | undefined
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(' · ') : data.message
    }
    if (err.code === 'ERR_NETWORK') return 'No se pudo conectar con el servidor.'
  }
  return porDefecto
}
