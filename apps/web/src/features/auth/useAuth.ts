import { useAuthStore } from './authStore'

export function useAuth() {
  const usuario = useAuthStore((s) => s.usuario)
  const cargando = useAuthStore((s) => s.cargando)

  const puede = (permiso: string): boolean =>
    !!usuario && (usuario.esSuperAdmin || usuario.permisos.includes(permiso))

  return {
    usuario,
    cargando,
    autenticado: usuario !== null,
    puede,
    puedeAlguno: (...permisos: string[]) => permisos.some(puede),
    tieneRol: (rol: string) => usuario?.alcances.some((a) => a.rolCodigo === rol) ?? false,
  }
}
