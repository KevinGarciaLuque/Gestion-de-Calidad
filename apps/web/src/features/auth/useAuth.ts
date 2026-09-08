import { useAuthStore } from './authStore'

export function useAuth() {
  const usuario = useAuthStore((s) => s.usuario)
  const cargando = useAuthStore((s) => s.cargando)

  return {
    usuario,
    cargando,
    autenticado: usuario !== null,
    /** ¿El usuario tiene este permiso? (En Fase 0 siempre false salvo sesión simulada.) */
    puede: (permiso: string) => usuario?.permisos.includes(permiso) ?? false,
    tieneRol: (rol: string) => usuario?.roles.includes(rol) ?? false,
  }
}
