import { api } from '@/lib/api'

export interface AlcanceRol {
  rolCodigo: string
  tipoAlcance: 'GLOBAL' | 'UNIDAD' | 'PROCESO'
  unidadId: string | null
  procesoId: string | null
}

export interface UsuarioSesion {
  id: string
  email: string
  nombre: string
  esSuperAdmin: boolean
  permisos: string[]
  alcances: AlcanceRol[]
  debeCambiarPassword: boolean
}

interface RespuestaSesion {
  usuario: UsuarioSesion
  accessToken: string
  expiraEn: number
}

export const authApi = {
  async login(email: string, password: string): Promise<RespuestaSesion> {
    const { data } = await api.post<RespuestaSesion>('/auth/login', { email, password })
    return data
  },
  async refresh(): Promise<RespuestaSesion> {
    const { data } = await api.post<RespuestaSesion>('/auth/refresh', {})
    return data
  },
  async me(): Promise<UsuarioSesion> {
    const { data } = await api.get<UsuarioSesion>('/auth/me')
    return data
  },
  async logout(): Promise<void> {
    await api.post('/auth/logout', {})
  },
  async cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
    await api.post('/auth/cambiar-password', { passwordActual, passwordNueva })
  },
}
