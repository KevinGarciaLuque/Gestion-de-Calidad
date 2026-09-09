/**
 * Crea ~5 procesos de demostración con su ficha y flujo de aprobación,
 * usando la API real (mismos endpoints que la aplicación).
 *
 * Uso:
 *   API_URL=https://gestion-de-calidad.up.railway.app/api \
 *   ADMIN_EMAIL=admin@tu-hospital.org ADMIN_PASS=Calidad360.2026 \
 *   node scripts/demo-procesos.mjs
 *
 * Es idempotente: si un proceso con ese código ya existe, lo omite.
 */
const API = process.env.API_URL ?? 'http://localhost:3000/api'
const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@calidad360.local'
const PASS = process.env.ADMIN_PASS ?? 'Admin.123456'

let TOKEN = ''
const req = async (path, method = 'GET', body) => {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const txt = await res.text()
  const data = txt ? JSON.parse(txt) : null
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${txt.slice(0, 300)}`)
  return data
}

const RECURSO = (tipo, detalle) => ({ tipo, detalle })

const PROCESOS = [
  {
    codigo: 'PR-EST-01',
    nombre: 'Gestión de Calidad',
    tipo: 'ESTRATEGICO',
    objetivo:
      'Planificar, mantener y mejorar el Sistema de Gestión de Calidad del hospital conforme a ISO 9001.',
    responsable: true,
    ficha: {
      alcance:
        'Aplica a todos los procesos del hospital: planificación del SGC, control documental, auditorías internas, gestión de riesgos, indicadores, no conformidades y mejora continua.',
      entradas: [
        { proveedor: 'Dirección', insumo: 'Política y objetivos de calidad', requisitos: 'Aprobados y comunicados' },
        { proveedor: 'Todos los procesos', insumo: 'Resultados de indicadores y hallazgos', requisitos: 'Datos completos y a tiempo' },
        { proveedor: 'Partes interesadas', insumo: 'Requisitos y expectativas', requisitos: 'Identificados y evaluados' },
      ],
      actividades: [
        { orden: 1, actividad: 'Planificar el SGC y el programa anual de auditorías', responsable: 'Gestor de Calidad', puntoControl: 'Programa aprobado por Dirección' },
        { orden: 2, actividad: 'Coordinar el control documental y la gestión de riesgos', responsable: 'Gestor de Calidad', puntoControl: 'Lista maestra actualizada' },
        { orden: 3, actividad: 'Consolidar indicadores y no conformidades', responsable: 'Analista de Calidad', puntoControl: 'Tablero mensual publicado' },
        { orden: 4, actividad: 'Preparar la revisión por la dirección', responsable: 'Gestor de Calidad', puntoControl: 'Acta de revisión firmada' },
      ],
      salidas: [
        { salida: 'Informe ejecutivo de calidad', registro: 'Informe trimestral', cliente: 'Dirección' },
        { salida: 'Planes de mejora', registro: 'Acciones CAPA', cliente: 'Responsables de proceso' },
      ],
      recursos: [
        RECURSO('PERSONAL', 'Gestor de Calidad, analista de calidad'),
        RECURSO('TECNOLOGIA', 'Calidad 360 Hospitalaria'),
        RECURSO('INFORMACION', 'Norma ISO 9001:2015, requisitos legales aplicables'),
      ],
      notas: 'Proceso dueño del SGC. Revisión anual o ante cambios normativos.',
    },
    estadoFinal: 'aprobado',
  },
  {
    codigo: 'PR-EST-02',
    nombre: 'Planificación Estratégica Institucional',
    tipo: 'ESTRATEGICO',
    objetivo:
      'Definir la dirección estratégica del hospital, sus objetivos y su despliegue a los procesos.',
    responsable: true,
    ficha: {
      alcance: 'Desde el análisis del contexto y las partes interesadas hasta el despliegue de objetivos y su seguimiento.',
      entradas: [
        { proveedor: 'Contexto de la organización', insumo: 'Análisis FODA y del entorno', requisitos: 'Actualizado anualmente' },
        { proveedor: 'Junta Directiva', insumo: 'Lineamientos institucionales', requisitos: 'Formalizados' },
      ],
      actividades: [
        { orden: 1, actividad: 'Analizar el contexto y las partes interesadas', responsable: 'Dirección', puntoControl: 'Matriz de partes interesadas' },
        { orden: 2, actividad: 'Definir objetivos estratégicos e indicadores', responsable: 'Dirección', puntoControl: 'Plan estratégico aprobado' },
        { orden: 3, actividad: 'Desplegar objetivos a los procesos', responsable: 'Gestor de Calidad', puntoControl: 'Objetivos por proceso' },
      ],
      salidas: [
        { salida: 'Plan estratégico', registro: 'Documento del plan', cliente: 'Todos los procesos' },
      ],
      recursos: [RECURSO('PERSONAL', 'Dirección y equipo directivo'), RECURSO('INFORMACION', 'Datos del entorno y desempeño histórico')],
      notas: '',
    },
    estadoFinal: 'en_revision',
  },
  {
    codigo: 'PR-MIS-03',
    nombre: 'Atención al Paciente Hospitalizado',
    tipo: 'MISIONAL',
    objetivo:
      'Brindar atención médica y de enfermería segura y oportuna al paciente durante su hospitalización, hasta el egreso.',
    responsable: true,
    ficha: {
      alcance:
        'Desde el ingreso del paciente a hospitalización hasta su egreso (alta, traslado o defunción), incluyendo valoración, plan de tratamiento, cuidados de enfermería, interconsultas y educación al alta.',
      entradas: [
        { proveedor: 'Urgencias / Consulta externa', insumo: 'Paciente con indicación de ingreso', requisitos: 'Orden de ingreso y valoración inicial' },
        { proveedor: 'Admisión', insumo: 'Registro y asignación de cama', requisitos: 'Expediente abierto' },
        { proveedor: 'Farmacia', insumo: 'Medicamentos e insumos', requisitos: 'Disponibles y verificados' },
        { proveedor: 'Laboratorio / Imagen', insumo: 'Resultados de apoyo diagnóstico', requisitos: 'Dentro del tiempo definido' },
      ],
      actividades: [
        { orden: 1, actividad: 'Recibir y valorar al paciente en la unidad', responsable: 'Médico tratante / Enfermería', puntoControl: 'Valoración registrada en 1 h' },
        { orden: 2, actividad: 'Elaborar y ejecutar el plan de tratamiento y cuidados', responsable: 'Médico tratante', puntoControl: 'Plan documentado y actualizado a diario' },
        { orden: 3, actividad: 'Administrar medicamentos con doble verificación', responsable: 'Enfermería', puntoControl: 'Registro de administración sin eventos' },
        { orden: 4, actividad: 'Gestionar interconsultas y estudios', responsable: 'Médico tratante', puntoControl: 'Respuesta de interconsulta < 24 h' },
        { orden: 5, actividad: 'Preparar el egreso y educar al paciente/familia', responsable: 'Médico tratante / Trabajo social', puntoControl: 'Resumen de egreso y cita de control' },
      ],
      salidas: [
        { salida: 'Paciente egresado con plan de continuidad', registro: 'Resumen de egreso', cliente: 'Paciente y familia' },
        { salida: 'Expediente clínico completo', registro: 'Historia clínica', cliente: 'Archivo clínico / auditoría' },
        { salida: 'Notificación de eventos e indicadores', registro: 'Reporte de indicadores', cliente: 'Gestión de Calidad' },
      ],
      recursos: [
        RECURSO('PERSONAL', 'Médicos, enfermería, personal de apoyo'),
        RECURSO('INFRAESTRUCTURA', 'Camas censables, estación de enfermería'),
        RECURSO('EQUIPO', 'Monitores, bombas de infusión, carro de paro'),
        RECURSO('INFORMACION', 'Guías de práctica clínica, expediente clínico'),
      ],
      notas: 'Proceso misional central. Indicadores: infección asociada a la atención, caídas, doble verificación de medicamentos.',
    },
    estadoFinal: 'aprobado',
  },
  {
    codigo: 'PR-MIS-02',
    nombre: 'Atención en el Servicio de Urgencias',
    tipo: 'MISIONAL',
    objetivo: 'Atender de forma oportuna y priorizada a los pacientes que acuden a urgencias, según su nivel de gravedad.',
    responsable: false, // sin responsable → semáforo rojo (ejemplo de proceso incompleto)
    ficha: {
      alcance: 'Desde la llegada del paciente y su clasificación (triage) hasta su egreso, ingreso u observación.',
      entradas: [
        { proveedor: 'Comunidad', insumo: 'Paciente que demanda atención', requisitos: 'Clasificación de triage' },
      ],
      actividades: [
        { orden: 1, actividad: 'Clasificar al paciente (triage)', responsable: 'Enfermería de triage', puntoControl: 'Tiempo de triage < 10 min' },
        { orden: 2, actividad: 'Atención médica según prioridad', responsable: 'Médico de urgencias', puntoControl: 'Tiempo de primera atención por nivel' },
      ],
      salidas: [{ salida: 'Paciente con destino definido', registro: 'Nota de urgencias', cliente: 'Hospitalización / paciente' }],
      recursos: [RECURSO('PERSONAL', 'Médicos y enfermería de urgencias'), RECURSO('EQUIPO', 'Equipo de reanimación')],
      notas: '',
    },
    estadoFinal: 'borrador',
  },
  {
    codigo: 'PR-APO-01',
    nombre: 'Gestión del Talento Humano',
    tipo: 'APOYO',
    objetivo:
      'Asegurar que el hospital cuente con personal competente, disponible y con las condiciones para desempeñar sus funciones.',
    responsable: true,
    ficha: {
      alcance: 'Desde la detección de necesidades de personal hasta la evaluación del desempeño y el plan de capacitación.',
      entradas: [
        { proveedor: 'Procesos misionales y de apoyo', insumo: 'Necesidades de personal y competencias', requisitos: 'Perfiles de puesto definidos' },
        { proveedor: 'Planificación estratégica', insumo: 'Presupuesto de plazas', requisitos: 'Aprobado' },
      ],
      actividades: [
        { orden: 1, actividad: 'Reclutar y seleccionar personal', responsable: 'Talento Humano', puntoControl: 'Verificación de perfil y credenciales' },
        { orden: 2, actividad: 'Inducir y capacitar', responsable: 'Talento Humano', puntoControl: 'Plan anual de capacitación cumplido' },
        { orden: 3, actividad: 'Evaluar competencias y desempeño', responsable: 'Jefaturas', puntoControl: 'Evaluación anual documentada' },
      ],
      salidas: [
        { salida: 'Personal contratado y competente', registro: 'Expediente laboral', cliente: 'Todos los procesos' },
        { salida: 'Plan de capacitación ejecutado', registro: 'Registros de capacitación', cliente: 'Gestión de Calidad' },
      ],
      recursos: [RECURSO('PERSONAL', 'Equipo de Talento Humano'), RECURSO('INFORMACION', 'Perfiles de puesto, matriz de competencias')],
      notas: '',
    },
    estadoFinal: 'aprobado',
  },
]

const RELACIONES = [
  // Talento Humano provee personal competente a Atención hospitalizado
  { origen: 'PR-APO-01', destino: 'PR-MIS-03', tipo: 'CLIENTE', descripcion: 'Provee personal competente y capacitado.' },
]

async function main() {
  const login = await req('/auth/login', 'POST', { email: EMAIL, password: PASS })
  TOKEN = login.accessToken
  const me = await req('/auth/me')
  console.log(`✓ sesión: ${me.email}`)

  const existentes = (await req('/procesos?porPagina=100')).datos ?? []
  const porCodigo = new Map(existentes.map((p) => [p.codigo, p]))

  for (const def of PROCESOS) {
    if (porCodigo.has(def.codigo)) {
      console.log(`= ${def.codigo} ya existe, se omite`)
      continue
    }
    const detalle = await req('/procesos', 'POST', {
      codigo: def.codigo,
      nombre: def.nombre,
      tipo: def.tipo,
      objetivo: def.objetivo,
      responsableId: def.responsable ? me.id : undefined,
    })
    const id = detalle.proceso.id
    await req(`/procesos/${id}/ficha`, 'PUT', def.ficha)

    if (def.estadoFinal === 'en_revision' || def.estadoFinal === 'aprobado') {
      await req(`/procesos/${id}/enviar-revision`, 'POST', {})
    }
    if (def.estadoFinal === 'aprobado') {
      await req(`/procesos/${id}/aprobar`, 'POST', { comentario: 'Aprobado (dato de demostración).', mesesProximaRevision: 12 })
    }
    porCodigo.set(def.codigo, { ...detalle.proceso, id })
    console.log(`✓ ${def.codigo} — ${def.nombre}  [${def.estadoFinal}]`)
  }

  for (const rel of RELACIONES) {
    const o = porCodigo.get(rel.origen)
    const d = porCodigo.get(rel.destino)
    if (!o || !d) continue
    try {
      await req(`/procesos/${o.id}/relaciones`, 'POST', { destinoId: d.id, tipo: rel.tipo, descripcion: rel.descripcion })
      console.log(`✓ relación ${rel.origen} → ${rel.destino} (${rel.tipo})`)
    } catch (e) {
      console.log(`= relación ${rel.origen} → ${rel.destino}: ${e.message.slice(0, 80)}`)
    }
  }

  console.log('\nListo. Abre "Mapa de procesos" en la aplicación.')
}

main().catch((e) => {
  console.error('\n✗', e.message)
  process.exit(1)
})
