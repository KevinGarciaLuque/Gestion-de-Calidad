import { create } from 'zustand'
import { setAccessToken } from '@/lib/api'
import { authApi, type UsuarioSesion } from './authApi'

interface AuthState {
  usuario: UsuarioSesion | null
  cargando: boolean
  setSesion: (usuario: UsuarioSesion, accessToken: string) => void
  setUsuario: (usuario: UsuarioSesion) => void
  limpiarSesion: () => void
  bootstrap: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  cargando: true,

  setSesion: (usuario, accessToken) => {
    setAccessToken(accessToken)
    set({ usuario, cargando: false })
  },

  setUsuario: (usuario) => set({ usuario }),

  limpiarSesion: () => {
    setAccessToken(null)
    set({ usuario: null, cargando: false })
  },

  bootstrap: async () => {
    try {
      const { usuario, accessToken } = await authApi.refresh()
      setAccessToken(accessToken)
      set({ usuario, cargando: false })
    } catch {
      setAccessToken(null)
      set({ usuario: null, cargando: false })
    }
  },

  cerrarSesion: async () => {
    try {
      await authApi.logout()
    } catch {
      // ignorar: cerramos igual en el cliente
    }
    setAccessToken(null)
    set({ usuario: null })
  },
}))
