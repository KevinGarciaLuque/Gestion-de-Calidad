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

  // Indicadores
  { codigo: 'indicadores.ver', modulo: 'indicadores', descripcion: 'Ver indicadores y sus resultados' },
  { codigo: 'indicadores.crear', modulo: 'indicadores', descripcion: 'Crear indicadores' },
  { codigo: 'indicadores.editar', modulo: 'indicadores', descripcion: 'Editar la definición de indicadores' },
  { codigo: 'indicadores.capturar', modulo: 'indicadores', descripcion: 'Registrar mediciones por periodo' },
  { codigo: 'indicadores.analizar', modulo: 'indicadores', descripcion: 'Registrar análisis de resultados fuera de meta' },
  { codigo: 'indicadores.archivar', modulo: 'indicadores', descripcion: 'Archivar indicadores' },

  // Control documental
  { codigo: 'documentos.ver', modulo: 'documentos', descripcion: 'Ver documentos y descargar archivos' },
  { codigo: 'documentos.crear', modulo: 'documentos', descripcion: 'Crear documentos' },
  { codigo: 'documentos.editar', modulo: 'documentos', descripcion: 'Editar borradores y subir archivos' },
  { codigo: 'documentos.revisar', modulo: 'documentos', descripcion: 'Revisar y devolver documentos' },
  { codigo: 'documentos.aprobar', modulo: 'documentos', descripcion: 'Aprobar y publicar versiones' },
  { codigo: 'documentos.archivar', modulo: 'documentos', descripcion: 'Archivar documentos' },

  // Auditorías
  { codigo: 'auditorias.ver', modulo: 'auditorias', descripcion: 'Ver el programa y las auditorías' },
  { codigo: 'auditorias.planificar', modulo: 'auditorias', descripcion: 'Crear el programa y planificar auditorías' },
  { codigo: 'auditorias.ejecutar', modulo: 'auditorias', descripcion: 'Ejecutar el checklist y generar hallazgos' },
  { codigo: 'auditorias.aprobar_informe', modulo: 'auditorias', descripcion: 'Aprobar el informe de auditoría' },
  { codigo: 'auditorias.cerrar', modulo: 'auditorias', descripcion: 'Cerrar o cancelar auditorías' },

  // Hallazgos
  { codigo: 'hallazgos.ver', modulo: 'hallazgos', descripcion: 'Ver hallazgos y no conformidades' },
  { codigo: 'hallazgos.crear', modulo: 'hallazgos', descripcion: 'Registrar hallazgos' },
  { codigo: 'hallazgos.editar', modulo: 'hallazgos', descripcion: 'Editar y dar seguimiento a hallazgos' },
  { codigo: 'hallazgos.cerrar', modulo: 'hallazgos', descripcion: 'Verificar eficacia y cerrar hallazgos' },

  // Acciones / planes de mejora
  { codigo: 'acciones.ver', modulo: 'acciones', descripcion: 'Ver acciones y planes de mejora' },
  { codigo: 'acciones.crear', modulo: 'acciones', descripcion: 'Crear acciones' },
  { codigo: 'acciones.editar', modulo: 'acciones', descripcion: 'Actualizar avance, evidencia y datos de la acción' },
  { codigo: 'acciones.verificar', modulo: 'acciones', descripcion: 'Verificar eficacia y cerrar acciones' },

  // Mejora continua (MCC)
  { codigo: 'mcc.ver', modulo: 'mcc', descripcion: 'Ver registros de mejora continua' },
  { codigo: 'mcc.crear', modulo: 'mcc', descripcion: 'Proponer registros de mejora continua' },
  { codigo: 'mcc.gestionar', modulo: 'mcc', descripcion: 'Clasificar, aceptar/rechazar y cerrar registros MCC' },

  // Riesgos
  { codigo: 'riesgos.ver', modulo: 'riesgos', descripcion: 'Ver riesgos y oportunidades' },
  { codigo: 'riesgos.crear', modulo: 'riesgos', descripcion: 'Registrar riesgos y oportunidades' },
  { codigo: 'riesgos.editar', modulo: 'riesgos', descripcion: 'Evaluar, tratar y revisar riesgos' },
  { codigo: 'riesgos.cerrar', modulo: 'riesgos', descripcion: 'Cerrar o reabrir riesgos' },
  { codigo: 'riesgos.configurar', modulo: 'riesgos', descripcion: 'Configurar la matriz de evaluación' },
  { codigo: 'riesgos.archivar', modulo: 'riesgos', descripcion: 'Archivar riesgos' },

  // Automatizaciones
  { codigo: 'automatizaciones.configurar', modulo: 'automatizaciones', descripcion: 'Configurar las reglas del motor de automatizaciones' },

  // Tablero
  { codigo: 'dashboard.ver', modulo: 'dashboard', descripcion: 'Ver el panel de calidad' },

  // Reportes
  { codigo: 'reportes.ver', modulo: 'reportes', descripcion: 'Generar y descargar reportes del SGC' },
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
  INDICADORES_VER: 'indicadores.ver',
  INDICADORES_CREAR: 'indicadores.crear',
  INDICADORES_EDITAR: 'indicadores.editar',
  INDICADORES_CAPTURAR: 'indicadores.capturar',
  INDICADORES_ANALIZAR: 'indicadores.analizar',
  INDICADORES_ARCHIVAR: 'indicadores.archivar',
  DOCUMENTOS_VER: 'documentos.ver',
  DOCUMENTOS_CREAR: 'documentos.crear',
  DOCUMENTOS_EDITAR: 'documentos.editar',
  DOCUMENTOS_REVISAR: 'documentos.revisar',
  DOCUMENTOS_APROBAR: 'documentos.aprobar',
  DOCUMENTOS_ARCHIVAR: 'documentos.archivar',
  AUDITORIAS_VER: 'auditorias.ver',
  AUDITORIAS_PLANIFICAR: 'auditorias.planificar',
  AUDITORIAS_EJECUTAR: 'auditorias.ejecutar',
  AUDITORIAS_APROBAR_INFORME: 'auditorias.aprobar_informe',
  AUDITORIAS_CERRAR: 'auditorias.cerrar',
  HALLAZGOS_VER: 'hallazgos.ver',
  HALLAZGOS_CREAR: 'hallazgos.crear',
  HALLAZGOS_EDITAR: 'hallazgos.editar',
  HALLAZGOS_CERRAR: 'hallazgos.cerrar',
  ACCIONES_VER: 'acciones.ver',
  ACCIONES_CREAR: 'acciones.crear',
  ACCIONES_EDITAR: 'acciones.editar',
  ACCIONES_VERIFICAR: 'acciones.verificar',
  MCC_VER: 'mcc.ver',
  MCC_CREAR: 'mcc.crear',
  MCC_GESTIONAR: 'mcc.gestionar',
  AUTOMATIZACIONES_CONFIGURAR: 'automatizaciones.configurar',
  RIESGOS_VER: 'riesgos.ver',
  RIESGOS_CREAR: 'riesgos.crear',
  RIESGOS_EDITAR: 'riesgos.editar',
  RIESGOS_CERRAR: 'riesgos.cerrar',
  RIESGOS_CONFIGURAR: 'riesgos.configurar',
  RIESGOS_ARCHIVAR: 'riesgos.archivar',
  DASHBOARD_VER: 'dashboard.ver',
  REPORTES_VER: 'reportes.ver',
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
    PERMISO.INDICADORES_VER,
    PERMISO.INDICADORES_CREAR,
    PERMISO.INDICADORES_EDITAR,
    PERMISO.INDICADORES_CAPTURAR,
    PERMISO.INDICADORES_ANALIZAR,
    PERMISO.INDICADORES_ARCHIVAR,
    PERMISO.DOCUMENTOS_VER,
    PERMISO.DOCUMENTOS_CREAR,
    PERMISO.DOCUMENTOS_EDITAR,
    PERMISO.DOCUMENTOS_REVISAR,
    PERMISO.DOCUMENTOS_APROBAR,
    PERMISO.DOCUMENTOS_ARCHIVAR,
    PERMISO.AUDITORIAS_VER,
    PERMISO.AUDITORIAS_PLANIFICAR,
    PERMISO.AUDITORIAS_EJECUTAR,
    PERMISO.AUDITORIAS_APROBAR_INFORME,
    PERMISO.AUDITORIAS_CERRAR,
    PERMISO.HALLAZGOS_VER,
    PERMISO.HALLAZGOS_CREAR,
    PERMISO.HALLAZGOS_EDITAR,
    PERMISO.HALLAZGOS_CERRAR,
    PERMISO.ACCIONES_VER,
    PERMISO.ACCIONES_CREAR,
    PERMISO.ACCIONES_EDITAR,
    PERMISO.ACCIONES_VERIFICAR,
    PERMISO.MCC_VER,
    PERMISO.MCC_CREAR,
    PERMISO.MCC_GESTIONAR,
    PERMISO.AUTOMATIZACIONES_CONFIGURAR,
    PERMISO.RIESGOS_VER,
    PERMISO.RIESGOS_CREAR,
    PERMISO.RIESGOS_EDITAR,
    PERMISO.RIESGOS_CERRAR,
    PERMISO.RIESGOS_CONFIGURAR,
    PERMISO.RIESGOS_ARCHIVAR,
    PERMISO.DASHBOARD_VER,
    PERMISO.REPORTES_VER,
  ],
  [ROL.RESP_PROCESO]: [
    PERMISO.ORGANIZACION_VER,
    PERMISO.PROCESOS_VER,
    PERMISO.PROCESOS_EDITAR,
    PERMISO.INDICADORES_VER,
    PERMISO.INDICADORES_CAPTURAR,
    PERMISO.INDICADORES_ANALIZAR,
    PERMISO.DOCUMENTOS_VER,
    PERMISO.DOCUMENTOS_CREAR,
    PERMISO.DOCUMENTOS_EDITAR,
    PERMISO.AUDITORIAS_VER,
    PERMISO.HALLAZGOS_VER,
    PERMISO.HALLAZGOS_EDITAR,
    PERMISO.ACCIONES_VER,
    PERMISO.ACCIONES_CREAR,
    PERMISO.ACCIONES_EDITAR,
    PERMISO.MCC_VER,
    PERMISO.MCC_CREAR,
    PERMISO.RIESGOS_VER,
    PERMISO.RIESGOS_CREAR,
    PERMISO.RIESGOS_EDITAR,
    PERMISO.DASHBOARD_VER,
    PERMISO.REPORTES_VER,
  ],
  [ROL.AUDITOR_INTERNO]: [
    PERMISO.ORGANIZACION_VER,
    PERMISO.BITACORA_VER,
    PERMISO.PROCESOS_VER,
    PERMISO.INDICADORES_VER,
    PERMISO.DOCUMENTOS_VER,
    PERMISO.AUDITORIAS_VER,
    PERMISO.AUDITORIAS_PLANIFICAR,
    PERMISO.AUDITORIAS_EJECUTAR,
    PERMISO.HALLAZGOS_VER,
    PERMISO.HALLAZGOS_CREAR,
    PERMISO.ACCIONES_VER,
    PERMISO.MCC_VER,
    PERMISO.RIESGOS_VER,
    PERMISO.DASHBOARD_VER,
    PERMISO.REPORTES_VER,
  ],
  [ROL.DIRECCION]: [
    PERMISO.ORGANIZACION_VER,
    PERMISO.BITACORA_VER,
    PERMISO.PROCESOS_VER,
    PERMISO.INDICADORES_VER,
    PERMISO.DOCUMENTOS_VER,
    PERMISO.AUDITORIAS_VER,
    PERMISO.HALLAZGOS_VER,
    PERMISO.ACCIONES_VER,
    PERMISO.MCC_VER,
    PERMISO.RIESGOS_VER,
    PERMISO.DASHBOARD_VER,
    PERMISO.REPORTES_VER,
  ],
  [ROL.COLABORADOR]: [
    PERMISO.DOCUMENTOS_VER,
    PERMISO.ACCIONES_VER,
    PERMISO.MCC_VER,
    PERMISO.MCC_CREAR,
    PERMISO.DASHBOARD_VER,
  ],
  [ROL.CONSULTA_EXTERNO]: [
    PERMISO.PROCESOS_VER,
    PERMISO.INDICADORES_VER,
    PERMISO.DOCUMENTOS_VER,
    PERMISO.AUDITORIAS_VER,
    PERMISO.HALLAZGOS_VER,
    PERMISO.ACCIONES_VER,
    PERMISO.MCC_VER,
    PERMISO.RIESGOS_VER,
    PERMISO.DASHBOARD_VER,
    PERMISO.REPORTES_VER,
  ],
};
