import type { TipoAlcance } from '@prisma/client';

export interface AlcanceRol {
  rolCodigo: string;
  tipoAlcance: TipoAlcance;
  unidadId: string | null;
  procesoId: string | null;
}

/** Usuario autenticado, adjuntado a `request.user` por la estrategia JWT. */
export interface UsuarioActual {
  id: string;
  email: string;
  nombre: string;
  esSuperAdmin: boolean;
  /** Permisos efectivos (unión de los permisos de todos sus roles vigentes). */
  permisos: string[];
  /** Asignaciones rol + alcance vigentes. */
  alcances: AlcanceRol[];
  debeCambiarPassword: boolean;
}

/** ¿El usuario tiene el permiso indicado? El Super Administrador tiene todos. */
export function tienePermiso(usuario: UsuarioActual, permiso: string): boolean {
  return usuario.esSuperAdmin || usuario.permisos.includes(permiso);
}
