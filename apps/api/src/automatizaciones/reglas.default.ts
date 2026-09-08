export interface DefinicionRegla {
  codigo: string;
  nombre: string;
  descripcion: string;
  orden: number;
  config: Record<string, unknown>;
}

/** Escalamiento por defecto para tareas vencidas. */
const ESCALAMIENTO_DEFAULT = [
  { dias: 1, a: 'responsable' },
  { dias: 3, a: 'jefatura' },
  { dias: 7, a: 'calidad' },
];

export const REGLAS_DEFAULT: DefinicionRegla[] = [
  {
    codigo: 'acciones.vencidas',
    nombre: 'Acciones vencidas',
    descripcion: 'Notifica al responsable cuando una acción supera su fecha compromiso y escala si sigue abierta.',
    orden: 1,
    config: { escalamiento: ESCALAMIENTO_DEFAULT, enviarCorreo: false },
  },
  {
    codigo: 'acciones.por_vencer',
    nombre: 'Acciones por vencer',
    descripcion: 'Recuerda al responsable X días antes de la fecha compromiso.',
    orden: 2,
    config: { diasAviso: [7, 3], enviarCorreo: false },
  },
  {
    codigo: 'acciones.espera_verificacion',
    nombre: 'Acciones completadas sin verificar',
    descripcion: 'Avisa a Calidad cuando una acción está completada y pendiente de verificación de eficacia.',
    orden: 3,
    config: { diasEspera: 3, enviarCorreo: false },
  },
  {
    codigo: 'hallazgos.plan_vencido',
    nombre: 'Hallazgos con compromiso vencido',
    descripcion: 'Notifica y escala cuando un hallazgo abierto pasa su fecha compromiso.',
    orden: 4,
    config: { escalamiento: ESCALAMIENTO_DEFAULT, enviarCorreo: false },
  },
  {
    codigo: 'hallazgos.sin_responsable',
    nombre: 'Hallazgos sin responsable',
    descripcion: 'Avisa a Calidad de hallazgos abiertos sin responsable de respuesta asignado.',
    orden: 5,
    config: { enviarCorreo: false },
  },
  {
    codigo: 'riesgos.revision_proxima',
    nombre: 'Revisión de riesgo próxima o vencida',
    descripcion: 'Recuerda al responsable X días antes de la fecha de revisión del riesgo y avisa si venció.',
    orden: 6,
    config: { diasAviso: [30, 15, 7], enviarCorreo: false },
  },
  {
    codigo: 'riesgos.critico_sin_tratamiento',
    nombre: 'Riesgo alto/crítico sin tratamiento',
    descripcion: 'Avisa a Calidad de riesgos de nivel alto o crítico sin responsable o plan de tratamiento.',
    orden: 7,
    config: { enviarCorreo: false },
  },
  {
    codigo: 'documentos.revision_proxima',
    nombre: 'Documento próximo a revisión',
    descripcion: 'Avisa al propietario 30/15/7 días antes de la próxima revisión del documento vigente.',
    orden: 8,
    config: { diasAviso: [30, 15, 7], enviarCorreo: false },
  },
  {
    codigo: 'documentos.vencidos',
    nombre: 'Documento vencido',
    descripcion: 'Avisa al propietario y a Calidad cuando la revisión del documento vigente ya venció.',
    orden: 9,
    config: { enviarCorreo: false },
  },
  {
    codigo: 'indicadores.captura_pendiente',
    nombre: 'Captura de indicador pendiente',
    descripcion: 'Recuerda al responsable de captura los periodos sin registrar del indicador.',
    orden: 10,
    config: { enviarCorreo: false },
  },
  {
    codigo: 'auditorias.proximas',
    nombre: 'Auditoría próxima o vencida',
    descripcion: 'Recuerda al equipo auditor X días antes de la fecha planificada.',
    orden: 11,
    config: { diasAviso: [15, 7, 1], enviarCorreo: false },
  },
];
