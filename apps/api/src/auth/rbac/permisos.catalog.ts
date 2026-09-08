/**
 * Catálogo de roles y permisos del sistema.
 * Fuente única: lo usa el seed para poblar la base y el código para referenciar
 * permisos de forma tipada en los guards.
 */

export interface DefinicionPermiso {
  codigo: string;
  modulo: string;
  descripcion: string;
}

export interface DefinicionRol {
  codigo: string;
  nombre: string;
  descripcion: string;
  esSistema: boolean;
  orden: number;
}

// ── Permisos ────────────────────────────────────────────────────────────────
export const PERMISOS: DefinicionPermiso[] = [
  // Administración de usuarios
  { codigo: 'usuarios.ver', modulo: 'usuarios', descripcion: 'Ver usuarios' },
  { codigo: 'usuarios.crear', modulo: 'usuarios', descripcion: 'Crear usuarios' },
  { codigo: 'usuarios.editar', modulo: 'usuarios', descripcion: 'Editar usuarios' },
  { codigo: 'usuarios.activar', modulo: 'usuarios', descripcion: 'Activar / desactivar usuarios' },
  { codigo: 'usuarios.asignar_roles', modulo: 'usuarios', descripcion: 'Asignar roles y alcance' },
  { codigo: 'usuarios.resetear_password', modulo: 'usuarios', descripcion: 'Restablecer contraseñas' },

  // Roles y permisos
  { codigo: 'roles.ver', modulo: 'roles', descripcion: 'Ver roles y permisos' },
  { codigo: 'roles.crear', modulo: 'roles', descripcion: 'Crear roles' },
  { codigo: 'roles.editar', modulo: 'roles', descripcion: 'Editar roles' },
  { codigo: 'roles.eliminar', modulo: 'roles', descripcion: 'Eliminar roles' },
  { codigo: 'roles.asignar_permisos', modulo: 'roles', descripcion: 'Asignar permisos a roles' },

  // Estructura organizacional
  { codigo: 'organizacion.ver', modulo: 'organizacion', descripcion: 'Ver la estructura organizacional' },
  { codigo: 'organizacion.crear', modulo: 'organizacion', descripcion: 'Crear unidades organizativas' },
  { codigo: 'organizacion.editar', modulo: 'organizacion', descripcion: 'Editar unidades organizativas' },
  { codigo: 'organizacion.activar', modulo: 'organizacion', descripcion: 'Activar / desactivar unidades' },

  // Bitácora
  { codigo: 'bitacora.ver', modulo: 'bitacora', descripcion: 'Consultar la bitácora del sistema' },

  // Procesos
  { codigo: 'procesos.ver', modulo: 'procesos', descripcion: 'Ver el mapa y las fichas de procesos' },
  { codigo: 'procesos.crear', modulo: 'procesos', descripcion: 'Crear procesos' },
  { codigo: 'procesos.editar', modulo: 'procesos', descripcion: 'Editar la identificación y la ficha (borrador)' },
  { codigo: 'procesos.revisar', modulo: 'procesos', descripcion: 'Revisar y devolver cambios de procesos' },
  { codigo: 'procesos.aprobar', modulo: 'procesos', descripcion: 'Aprobar y publicar versiones de procesos' },
  { codigo: 'procesos.archivar', modulo: 'procesos', descripcion: 'Archivar procesos' },

  // Tablero
  { codigo: 'dashboard.ver', modulo: 'dashboard', descripcion: 'Ver el panel de calidad' },
];

/** Objeto de acceso tipado: PERMISO.USUARIOS_CREAR === 'usuarios.crear'. */
export const PERMISO = {
  USUARIOS_VER: 'usuarios.ver',
  USUARIOS_CREAR: 'usuarios.crear',
  USUARIOS_EDITAR: 'usuarios.editar',
  USUARIOS_ACTIVAR: 'usuarios.activar',
  USUARIOS_ASIGNAR_ROLES: 'usuarios.asignar_roles',
  USUARIOS_RESETEAR_PASSWORD: 'usuarios.resetear_password',
  ROLES_VER: 'roles.ver',
  ROLES_CREAR: 'roles.crear',
  ROLES_EDITAR: 'roles.editar',
  ROLES_ELIMINAR: 'roles.eliminar',
  ROLES_ASIGNAR_PERMISOS: 'roles.asignar_permisos',
  ORGANIZACION_VER: 'organizacion.ver',
  ORGANIZACION_CREAR: 'organizacion.crear',
  ORGANIZACION_EDITAR: 'organizacion.editar',
  ORGANIZACION_ACTIVAR: 'organizacion.activar',
  BITACORA_VER: 'bitacora.ver',
  PROCESOS_VER: 'procesos.ver',
  PROCESOS_CREAR: 'procesos.crear',
  PROCESOS_EDITAR: 'procesos.editar',
  PROCESOS_REVISAR: 'procesos.revisar',
  PROCESOS_APROBAR: 'procesos.aprobar',
  PROCESOS_ARCHIVAR: 'procesos.archivar',
  DASHBOARD_VER: 'dashboard.ver',
} as const;

// ── Roles ───────────────────────────────────────────────────────────────────
export const ROL = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  GESTOR_CALIDAD: 'GESTOR_CALIDAD',
  RESP_PROCESO: 'RESP_PROCESO',
  AUDITOR_INTERNO: 'AUDITOR_INTERNO',
  DIRECCION: 'DIRECCION',
  COLABORADOR: 'COLABORADOR',
  CONSULTA_EXTERNO: 'CONSULTA_EXTERNO',
} as const;

export const ROLES: DefinicionRol[] = [
  {
    codigo: ROL.SUPER_ADMIN,
    nombre: 'Super Administrador',
    descripcion: 'Configuración técnica total: usuarios, roles, catálogos, parámetros y respaldos.',
    esSistema: true,
    orden: 1,
  },
  {
    codigo: ROL.GESTOR_CALIDAD,
    nombre: 'Administrador / Gestor de Calidad',
    descripcion: 'Dueño funcional del SGC: opera todos los módulos en todas las áreas.',
    esSistema: true,
    orden: 2,
  },
  {
    codigo: ROL.RESP_PROCESO,
    nombre: 'Responsable de Proceso',
    descripcion: 'Gestiona la información de su proceso / área (alcance restringido).',
    esSistema: true,
    orden: 3,
  },
  {
    codigo: ROL.AUDITOR_INTERNO,
    nombre: 'Auditor Interno',
    descripcion: 'Programa de auditoría, listas de verificación, evidencias y hallazgos.',
    esSistema: true,
    orden: 4,
  },
  {
    codigo: ROL.DIRECCION,
    nombre: 'Dirección / Gerencia',
    descripcion: 'Consulta de tableros, tendencias y acciones críticas.',
    esSistema: true,
    orden: 5,
  },
  {
    codigo: ROL.COLABORADOR,
    nombre: 'Colaborador',
    descripcion: 'Reporta incidentes, participa en encuestas y carga evidencias autorizadas.',
    esSistema: true,
    orden: 6,
  },
  {
    codigo: ROL.CONSULTA_EXTERNO,
    nombre: 'Consulta / Auditor Externo',
    descripcion: 'Acceso de solo lectura y temporal a información seleccionada.',
    esSistema: true,
    orden: 7,
  },
];

/** Permisos por rol. SUPER_ADMIN recibe todos automáticamente en el seed. */
export const ROL_PERMISOS: Record<string, string[]> = {
  [ROL.GESTOR_CALIDAD]: [
    PERMISO.USUARIOS_VER,
    PERMISO.ROLES_VER,
    PERMISO.ORGANIZACION_VER,
    PERMISO.ORGANIZACION_CREAR,
    PERMISO.ORGANIZACION_EDITAR,
    PERMISO.ORGANIZACION_ACTIVAR,
    PERMISO.BITACORA_VER,
    PERMISO.PROCESOS_VER,
    PERMISO.PROCESOS_CREAR,
    PERMISO.PROCESOS_EDITAR,
    PERMISO.PROCESOS_REVISAR,
    PERMISO.PROCESOS_APROBAR,
    PERMISO.PROCESOS_ARCHIVAR,
    PERMISO.DASHBOARD_VER,
  ],
  [ROL.RESP_PROCESO]: [
    PERMISO.ORGANIZACION_VER,
    PERMISO.PROCESOS_VER,
    PERMISO.PROCESOS_EDITAR,
    PERMISO.DASHBOARD_VER,
  ],
  [ROL.AUDITOR_INTERNO]: [
    PERMISO.ORGANIZACION_VER,
    PERMISO.BITACORA_VER,
    PERMISO.PROCESOS_VER,
    PERMISO.DASHBOARD_VER,
  ],
  [ROL.DIRECCION]: [
    PERMISO.ORGANIZACION_VER,
    PERMISO.BITACORA_VER,
    PERMISO.PROCESOS_VER,
    PERMISO.DASHBOARD_VER,
  ],
  [ROL.COLABORADOR]: [PERMISO.DASHBOARD_VER],
  [ROL.CONSULTA_EXTERNO]: [PERMISO.PROCESOS_VER, PERMISO.DASHBOARD_VER],
};
