import axios, { AxiosError } from 'axios'

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

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

/** Forma normalizada de los errores devueltos por la API. */
export interface ApiError {
  statusCode: number
  error: string
  message: string | string[]
  path?: string
}

export function mensajeDeError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiError | undefined
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message
    }
    if (err.code === 'ERR_NETWORK') return 'No se pudo conectar con el servidor.'
  }
  return 'Ocurrió un error inesperado.'
}
