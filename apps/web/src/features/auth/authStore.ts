import { create } from 'zustand'
import { setAccessToken } from '@/lib/api'

export interface UsuarioSesion {
  id: string
  email: string
  nombre: string
  /** Permisos efectivos (ej. "usuarios.crear"). Se llenan en Fase 1. */
  permisos: string[]
  /** Roles asignados. Se llenan en Fase 1. */
  roles: string[]
}

interface AuthState {
  usuario: UsuarioSesion | null
  cargando: boolean
  setSesion: (usuario: UsuarioSesion, accessToken: string) => void
  limpiarSesion: () => void
  setCargando: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  cargando: true,
  setSesion: (usuario, accessToken) => {
    setAccessToken(accessToken)
    set({ usuario, cargando: false })
  },
  limpiarSesion: () => {
    setAccessToken(null)
    set({ usuario: null, cargando: false })
  },
  setCargando: (v) => set({ cargando: v }),
}))
