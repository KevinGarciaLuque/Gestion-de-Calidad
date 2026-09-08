import type { TipoAlcance } from '@prisma/client';

export interface AlcanceRol {
  rolCodigo: string;
  tipoAlcance: TipoAlcance;
  unidadId: string | null;
  procesoId: string | null;
  /** Permisos que aporta este rol (para verificaciones sensibles al alcance). */
  permisos: string[];
}

export interface AmbitoPermiso {
  /** El usuario tiene el permiso con alcance global (o es super admin). */
  global: boolean;
  /** Unidades organizativas donde tiene el permiso (sin expandir descendientes). */
  unidadIds: string[];
  /** Procesos concretos donde tiene el permiso. */
  procesoIds: string[];
}

/** Devuelve en qué ámbitos el usuario tiene un permiso dado. */
export function ambitoDe(usuario: UsuarioActual, permiso: string): AmbitoPermiso {
  if (usuario.esSuperAdmin) {
    return { global: true, unidadIds: [], procesoIds: [] };
  }
  const ambito: AmbitoPermiso = { global: false, unidadIds: [], procesoIds: [] };
  for (const a of usuario.alcances) {
    if (!a.permisos.includes(permiso)) continue;
    if (a.tipoAlcance === 'GLOBAL') ambito.global = true;
    else if (a.tipoAlcance === 'UNIDAD' && a.unidadId) ambito.unidadIds.push(a.unidadId);
    else if (a.tipoAlcance === 'PROCESO' && a.procesoId) ambito.procesoIds.push(a.procesoId);
  }
  return ambito;
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
