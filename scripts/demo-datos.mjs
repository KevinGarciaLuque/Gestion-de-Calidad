/**
 * Puebla TODOS los módulos con datos de demostración, usando la API real
 * (los mismos endpoints que la aplicación), para recorrer el flujo de cada uno.
 *
 * Requiere que ya existan los procesos de `scripts/demo-procesos.mjs`.
 *
 * Uso:
 *   API_URL=https://gestion-de-calidad.up.railway.app/api \
 *   ADMIN_EMAIL=admin@tu-hospital.org ADMIN_PASS=Calidad360.2026 \
 *   node scripts/demo-datos.mjs
 *
 * Es tolerante a re-ejecución: los pasos que fallan (p. ej. "ya existe") se
 * registran y el script continúa.
 */
const API = process.env.API_URL ?? 'http://localhost:3000/api'
const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@calidad360.local'
const PASS = process.env.ADMIN_PASS ?? 'Admin.123456'

let TOKEN = ''
const req = async (path, method = 'GET', body, isForm = false) => {
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}),
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  })
  const txt = await res.text()
  const data = txt ? (() => { try { return JSON.parse(txt) } catch { return txt } })() : null
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${String(txt).slice(0, 200)}`)
  return data
}

const iso = (dias) => new Date(Date.now() + dias * 86_400_000).toISOString()
let ok = 0
let skip = 0
const step = async (label, fn) => {
  try {
    await fn()
    ok++
    console.log('  ✓', label)
  } catch (e) {
    skip++
    console.log('  =', label, '—', e.message.slice(0, 120))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const login = await req('/auth/login', 'POST', { email: EMAIL, password: PASS })
  TOKEN = login.accessToken
  const me = await req('/auth/me')
  console.log(`Sesión: ${me.email}\n`)

  const mapa = await req('/procesos/mapa')
  const todos = mapa.flatMap((c) => c.procesos)
  const proc = (cod) => todos.find((p) => p.codigo === cod)
  const misional = proc('PR-MIS-03') ?? proc('PR-MIS-01')
  const estrategico = proc('PR-EST-01')
  const apoyo = proc('PR-APO-01')
  if (!misional || !estrategico || !apoyo) {
    throw new Error('Faltan procesos base. Corre primero: node scripts/demo-procesos.mjs')
  }
  const anio = new Date().getFullYear()
  const periodoMes = new Date().getMonth() + 1 // periodo mensual vigente

  // ── INDICADORES ────────────────────────────────────────────────────────────
  console.log('INDICADORES')
  const indicadores = [
    {
      codigo: 'IND-MIS-01',
      nombre: 'Cumplimiento de doble verificación de medicamentos de alto riesgo',
      objetivo: 'Asegurar la doble verificación en la administración de medicamentos de alto riesgo.',
      procesoId: misional.id,
      formula: 'Administraciones con doble verificación ÷ Total de administraciones de alto riesgo × 100',
      usaNumeradorDenominador: true,
      expresarPorcentaje: true,
      unidad: '%',
      frecuencia: 'MENSUAL',
      sentido: 'CRECIENTE',
      meta: 95,
      umbralAmarillo: 90,
      // num/den por mes (abr..ago): mezcla verde/amarillo/rojo
      mediciones: [
        { p: periodoMes - 5, num: 182, den: 200 }, // 91%  amarillo
        { p: periodoMes - 4, num: 176, den: 200 }, // 88%  rojo
        { p: periodoMes - 3, num: 190, den: 200 }, // 95%  verde
        { p: periodoMes - 2, num: 187, den: 200 }, // 93.5 amarillo
        { p: periodoMes - 1, num: 193, den: 200 }, // 96.5 verde (último → en meta)
      ],
      analizar: periodoMes - 4, // el mes rojo se analiza
    },
    {
      codigo: 'IND-MIS-02',
      nombre: 'Tasa de caídas de pacientes hospitalizados',
      objetivo: 'Reducir la ocurrencia de caídas de pacientes durante la hospitalización.',
      procesoId: misional.id,
      formula: 'Número de caídas ÷ Total de egresos × 100',
      usaNumeradorDenominador: true,
      expresarPorcentaje: true,
      unidad: '%',
      frecuencia: 'MENSUAL',
      sentido: 'DECRECIENTE',
      meta: 1,
      umbralAmarillo: 2,
      mediciones: [
        { p: periodoMes - 3, num: 3, den: 210 }, // 1.43 amarillo
        { p: periodoMes - 2, num: 2, den: 205 }, // 0.98 verde
        { p: periodoMes - 1, num: 5, den: 198 }, // 2.53 rojo
      ],
      analizar: periodoMes - 1,
    },
    {
      codigo: 'IND-EST-01',
      nombre: 'Cumplimiento del programa anual de auditorías',
      objetivo: 'Ejecutar las auditorías planificadas en el programa anual.',
      procesoId: estrategico.id,
      formula: 'Auditorías ejecutadas ÷ Auditorías planificadas × 100',
      usaNumeradorDenominador: true,
      expresarPorcentaje: true,
      unidad: '%',
      frecuencia: 'TRIMESTRAL',
      sentido: 'CRECIENTE',
      meta: 100,
      umbralAmarillo: 80,
      mediciones: [
        { p: 1, num: 1, den: 3 }, // 33 rojo
        { p: 2, num: 3, den: 3 }, // 100 verde (último → en meta)
      ],
    },
  ]

  const indId = {}
  for (const ind of indicadores) {
    await step(`crear ${ind.codigo}`, async () => {
      const { mediciones, analizar, ...body } = ind
      try {
        const r = await req('/indicadores', 'POST', {
          ...body,
          responsableCapturaId: me.id,
          responsableAnalisisId: me.id,
        })
        indId[ind.codigo] = r.indicador?.id ?? r.id
      } catch (e) {
        const existente = ((await req(`/indicadores?q=${ind.codigo}`)).datos ?? []).find((x) => x.codigo === ind.codigo)
        if (!existente) throw e
        indId[ind.codigo] = existente.id
        throw new Error('ya existe')
      }
    })
    const id = indId[ind.codigo]
    if (!id) continue
    for (const m of ind.mediciones) {
      if (m.p < 1) continue
      await step(`  medición ${ind.codigo} periodo ${m.p}`, () =>
        req(`/indicadores/${id}/mediciones`, 'POST', {
          anio,
          periodo: m.p,
          numerador: m.num,
          denominador: m.den,
        }),
      )
    }
    if (ind.analizar && ind.analizar >= 1) {
      await step(`  analizar ${ind.codigo} periodo ${ind.analizar}`, async () => {
        const det = await req(`/indicadores/${id}`)
        const med = (det.mediciones ?? det.indicador?.mediciones ?? []).find((x) => x.periodo === ind.analizar)
        if (!med) throw new Error('medición no encontrada')
        await req(`/indicadores/${id}/mediciones/${med.id}/analisis`, 'PATCH', {
          analisis:
            'Se identificó rotación de personal nuevo sin inducción completa en el turno nocturno; la verificación se registró de forma diferida.',
          planAccion: 'Reforzar inducción y checklist de turno. Auditar registro diario durante 1 mes.',
        })
      })
    }
  }

  // ── RIESGOS ────────────────────────────────────────────────────────────────
  console.log('\nRIESGOS')
  const riesgos = [
    {
      codigo: 'R-MIS-01',
      tipo: 'RIESGO',
      procesoId: misional.id,
      descripcion: 'Error en la administración de medicamentos de alto riesgo',
      causa: 'Prescripción poco legible, interrupciones durante la preparación, falta de doble verificación.',
      consecuencia: 'Evento adverso grave o centinela en el paciente.',
      probabilidadInherente: 3,
      impactoInherente: 5,
      tratamiento: {
        controles: 'Protocolo de medicamentos de alto riesgo; etiquetado diferenciado; doble verificación.',
        eficaciaControl: 'PARCIAL',
        planTratamiento: 'Implementar prescripción electrónica y doble verificación con lector de código de barras.',
        responsableId: me.id,
        fechaCompromiso: iso(60),
      },
      residual: { prob: 2, imp: 5, comentario: 'Tras reforzar controles y capacitación.' },
    },
    {
      codigo: 'R-MIS-02',
      tipo: 'RIESGO',
      procesoId: misional.id,
      descripcion: 'Infección asociada a la atención en salud',
      causa: 'Baja adherencia a higiene de manos; sobreocupación de camas.',
      consecuencia: 'Aumento de estancia, morbimortalidad y costos.',
      probabilidadInherente: 3,
      impactoInherente: 4,
      // sin tratamiento ni responsable → ejemplo de riesgo alto que no se puede cerrar
    },
    {
      codigo: 'R-APO-01',
      tipo: 'RIESGO',
      procesoId: apoyo.id,
      descripcion: 'Rotación alta del personal de enfermería',
      causa: 'Cargas de trabajo, remuneración y oportunidades externas.',
      consecuencia: 'Pérdida de competencias, sobrecarga y riesgo para la seguridad del paciente.',
      probabilidadInherente: 4,
      impactoInherente: 3,
      tratamiento: {
        controles: 'Encuesta de clima; plan de retención.',
        eficaciaControl: 'INEFICAZ',
        planTratamiento: 'Programa de bienestar, plan de carrera y ajuste de dotación por turno.',
        responsableId: me.id,
        fechaCompromiso: iso(90),
      },
    },
    {
      codigo: 'O-EST-01',
      tipo: 'OPORTUNIDAD',
      procesoId: estrategico.id,
      descripcion: 'Oportunidad de obtener acreditación de calidad internacional',
      causa: 'Madurez creciente del SGC y respaldo de la dirección.',
      consecuencia: 'Mejora reputacional, acceso a convenios y financiamiento.',
      probabilidadInherente: 3,
      impactoInherente: 4,
    },
  ]

  const riesgoId = {}
  for (const r of riesgos) {
    await step(`crear ${r.codigo}`, async () => {
      const { tratamiento, residual, ...body } = r
      try {
        const resp = await req('/riesgos', 'POST', body)
        riesgoId[r.codigo] = resp.riesgo?.id ?? resp.id
      } catch (e) {
        const existente = ((await req(`/riesgos?q=${r.codigo}`)).datos ?? []).find((x) => x.codigo === r.codigo)
        if (!existente) throw e
        riesgoId[r.codigo] = existente.id
        throw new Error('ya existe')
      }
    })
    const id = riesgoId[r.codigo]
    if (!id) continue
    if (r.tratamiento) {
      await step(`  tratamiento ${r.codigo}`, () => req(`/riesgos/${id}`, 'PATCH', r.tratamiento))
    }
    if (r.residual) {
      await step(`  reevaluar ${r.codigo}`, () =>
        req(`/riesgos/${id}/reevaluar`, 'POST', {
          probabilidadResidual: r.residual.prob,
          impactoResidual: r.residual.imp,
          comentario: r.residual.comentario,
        }),
      )
    }
  }

  // ── DOCUMENTOS ─────────────────────────────────────────────────────────────
  console.log('\nDOCUMENTOS')
  const docs = [
    {
      codigo: 'PR-MIS-03-01',
      nombre: 'Procedimiento de administración segura de medicamentos',
      tipo: 'PROCEDIMIENTO',
      procesoId: misional.id,
      palabrasClave: 'medicamentos, doble verificación, seguridad del paciente',
      aprobar: true,
    },
    {
      codigo: 'FR-MIS-03-01',
      nombre: 'Formato de conciliación de medicamentos al ingreso',
      tipo: 'FORMATO',
      procesoId: misional.id,
      palabrasClave: 'conciliación, ingreso',
      aprobar: false, // queda en borrador
    },
    {
      codigo: 'MC-01',
      nombre: 'Manual de Calidad',
      tipo: 'MANUAL',
      procesoId: estrategico.id,
      palabrasClave: 'SGC, alcance, política',
      aprobar: false,
    },
  ]

  for (const d of docs) {
    await step(`crear ${d.codigo}`, async () => {
      const { aprobar, ...body } = d
      const resp = await req('/documentos', 'POST', { ...body, propietarioId: me.id })
      const id = resp.documento?.id ?? resp.id
      const verId =
        resp.versionTrabajo?.id ??
        resp.documento?.versiones?.[0]?.id ??
        (await req(`/documentos/${id}`)).versionTrabajo?.id
      await req(`/documentos/${id}/version`, 'PUT', {
        motivoCambio: 'Emisión inicial.',
        mesesProximaRevision: 12,
      })
      if (aprobar) {
        // Sube un archivo de texto de ejemplo
        const fd = new FormData()
        fd.append(
          'archivo',
          new Blob(
            [`${d.nombre}\n\nDocumento de ejemplo generado para la demostración del sistema.\n`],
            { type: 'text/plain' },
          ),
          `${d.codigo}.txt`,
        )
        await req(`/documentos/${id}/archivo`, 'POST', fd, true)
        await req(`/documentos/${id}/enviar-revision`, 'POST', {})
        await req(`/documentos/${id}/aprobar`, 'POST', { comentario: 'Aprobado (demostración).' })
        void verId
      }
    })
  }

  // ── AUDITORÍAS ─────────────────────────────────────────────────────────────
  console.log('\nAUDITORÍAS')
  let programaId
  await step(`programa ${anio}`, async () => {
    try {
      const p = await req('/auditorias/programa', 'POST', {
        anio,
        nombre: `Programa anual de auditorías internas ${anio}`,
        objetivo: 'Verificar la conformidad y eficacia del SGC en los procesos priorizados.',
      })
      programaId = p.id ?? p.programa?.id
    } catch {
      const p = await req(`/auditorias/programa/${anio}`)
      programaId = p.id ?? p.programa?.id
    }
    if (programaId) await req(`/auditorias/programa/${programaId}/aprobar`, 'POST', {}).catch(() => {})
  })

  const listaAud = (await req('/auditorias')).datos ?? []
  const audPorCodigo = (cod) => listaAud.find((a) => a.codigo === cod)

  const hallazgosGen = []
  await step('AUD-2026-01 (ejecutada + informe)', async () => {
    const items = [
      { criterio: '¿Se aplica la doble verificación en medicamentos de alto riesgo?', resultado: 'NO_CUMPLE',
        notas: 'En 2 de 8 registros revisados no consta la segunda firma.' },
      { criterio: '¿El etiquetado diferenciado está disponible y en uso?', resultado: 'CUMPLE' },
      { criterio: '¿El personal conoce el listado de medicamentos de alto riesgo?', resultado: 'OBSERVACION',
        notas: 'Personal nuevo del turno nocturno no lo identifica con claridad.' },
      { criterio: '¿Los carros de medicación se mantienen cerrados y controlados?', resultado: 'CUMPLE' },
    ]

    let id = audPorCodigo('AUD-2026-01')?.id
    if (!id) {
      const a = await req('/auditorias', 'POST', {
        codigo: 'AUD-2026-01',
        programaId,
        tipo: 'INTERNA',
        procesoId: misional.id,
        objetivo: 'Evaluar la seguridad en la administración de medicamentos.',
        alcance: 'Servicio de hospitalización, turnos diurno y nocturno.',
        criterios: 'ISO 9001:2015 cláusula 8.5; procedimiento PR-MIS-03-01; metas de seguridad del paciente.',
        auditorLiderId: me.id,
        fechaPlanificada: iso(-20),
      })
      id = a.auditoria?.id ?? a.id
    }

    let det = await req(`/auditorias/${id}`)
    let checklist = det.checklist ?? det.items ?? det.auditoria?.items ?? []
    if (checklist.length === 0) {
      for (const it of items) await req(`/auditorias/${id}/items`, 'POST', { criterio: it.criterio })
      det = await req(`/auditorias/${id}`)
      checklist = det.checklist ?? det.items ?? []
    }
    const estado = det.auditoria?.estado ?? det.estado
    if (estado === 'PLANIFICADA') await req(`/auditorias/${id}/iniciar`, 'POST', {})

    for (let i = 0; i < items.length && i < checklist.length; i++) {
      const itemId = checklist[i].id
      await req(`/auditorias/${id}/items/${itemId}/resultado`, 'PATCH', {
        resultado: items[i].resultado,
        notas: items[i].notas,
      }).catch(() => {})
      if (items[i].resultado === 'NO_CUMPLE' || items[i].resultado === 'OBSERVACION') {
        await req(`/auditorias/${id}/items/${itemId}/hallazgo`, 'POST', {
          clasificacion: items[i].resultado === 'NO_CUMPLE' ? 'NO_CONFORMIDAD_MENOR' : 'OBSERVACION',
          descripcion: items[i].notas,
          requisito: '8.5.1',
          responsableId: me.id,
          fechaCompromiso: iso(45),
          prioridad: items[i].resultado === 'NO_CUMPLE' ? 'ALTA' : 'MEDIA',
        }).catch(() => {}) // ya generado
      }
    }
    await req(`/auditorias/${id}/finalizar`, 'POST', {}).catch(() => {})
    await req(`/auditorias/${id}/informe`, 'PUT', {
      resumen: 'Se auditó el proceso de administración de medicamentos. Se detectó 1 no conformidad menor y 1 observación.',
      conclusiones: 'El proceso es conforme en lo general; se requiere reforzar la doble verificación y la inducción del personal nuevo.',
    }).catch(() => {})
    await req(`/auditorias/${id}/informe/aprobar`, 'POST', {}).catch(() => {})

    // Recuperar los hallazgos de esta auditoría (fuente única de verdad)
    const hs = ((await req(`/hallazgos?auditoriaId=${id}&porPagina=50`)).datos ?? []).sort((a, b) =>
      a.codigo.localeCompare(b.codigo),
    )
    hallazgosGen.push(...hs.map((x) => x.id))
    console.log(`     (${hallazgosGen.length} hallazgos de auditoría)`)
  })

  await step('AUD-2026-02 (planificada, futura)', () => {
    if (audPorCodigo('AUD-2026-02')) throw new Error('ya existe')
    return req('/auditorias', 'POST', {
      codigo: 'AUD-2026-02',
      programaId,
      tipo: 'INTERNA',
      procesoId: apoyo.id,
      objetivo: 'Evaluar la gestión de competencias del personal.',
      alcance: 'Reclutamiento, inducción y evaluación de desempeño.',
      criterios: 'ISO 9001:2015 cláusula 7.2 y 7.3.',
      auditorLiderId: me.id,
      fechaPlanificada: iso(40),
    })
  })

  // ── HALLAZGOS ──────────────────────────────────────────────────────────────
  console.log('\nHALLAZGOS')
  const DESC_QUEJA = 'Familiar reporta demora mayor a 40 minutos en la entrega de medicación de la noche.'
  // Limpieza: archivar quejas duplicadas de corridas anteriores, dejar solo 1
  const quejasPrev = ((await req('/hallazgos?origen=QUEJA&porPagina=50')).datos ?? []).filter(
    (h) => h.descripcion === DESC_QUEJA && !h.archivado,
  )
  for (const h of quejasPrev.slice(1)) {
    await step(`archivar queja duplicada ${h.codigo}`, () => req(`/hallazgos/${h.id}/archivar`, 'POST', {}))
  }
  await step('H (queja) — abierto', async () => {
    if (quejasPrev.length > 0) throw new Error('ya existe')
    await req('/hallazgos', 'POST', {
      origen: 'QUEJA',
      procesoId: misional.id,
      descripcion: DESC_QUEJA,
      clasificacion: 'OBSERVACION',
      requisito: '8.5.1',
      responsableId: me.id,
      fechaCompromiso: iso(30),
      prioridad: 'MEDIA',
    })
  })

  // Primer hallazgo de auditoría → ciclo completo hasta CERRADO
  const hCiclo = hallazgosGen[0]
  if (hCiclo) {
    await step('H (auditoría) — ciclo completo → cerrado', async () => {
      await req(`/hallazgos/${hCiclo}/validar`, 'POST', {
        correccionInmediata: 'Se recordó al personal la obligación de la segunda firma; auditoría diaria del registro por 2 semanas.',
      })
      await req(`/hallazgos/${hCiclo}/analisis`, 'PUT', {
        metodologia: 'CINCO_PORQUES',
        contenido: {
          problema: 'No se registra la doble verificación en medicamentos de alto riesgo',
          porques: [
            { pregunta: '¿Por qué no se registra la segunda firma?', respuesta: 'El segundo profesional no siempre está disponible en el momento.' },
            { pregunta: '¿Por qué no está disponible?', respuesta: 'La dotación nocturna es ajustada y hay picos de demanda.' },
            { pregunta: '¿Por qué la dotación es ajustada?', respuesta: 'El cálculo de personal no consideró la carga real del turno.' },
            { pregunta: '¿Por qué no se consideró?', respuesta: 'No hay un estándar de dotación por complejidad y turno.' },
          ],
        },
        causaInmediata: 'Ausencia de un segundo verificador en el momento de la administración.',
        causaRaiz: 'Falta de un estándar de dotación de enfermería por complejidad y turno.',
        comentariosEquipo: 'Analizado con jefatura de enfermería y seguridad del paciente.',
      })
      await req(`/hallazgos/${hCiclo}/plan`, 'PUT', {
        planAccion:
          '1. Definir estándar de dotación por turno.\n2. Ajustar rol de turno nocturno.\n3. Capacitar y auditar el registro de doble verificación.',
      })
      await req(`/hallazgos/${hCiclo}/aprobar-plan`, 'POST', {})
      await req(`/hallazgos/${hCiclo}/iniciar-ejecucion`, 'POST', {})
      // acción ligada, llevada a verificada
      const acc = await req('/acciones', 'POST', {
        tipo: 'ACCION_CORRECTIVA',
        descripcion: 'Definir e implementar el estándar de dotación de enfermería por turno y complejidad.',
        resultadoEsperado: 'Registro de doble verificación ≥ 98% durante 2 meses seguidos.',
        origen: 'HALLAZGO',
        hallazgoId: hCiclo,
        responsableId: me.id,
        fechaCompromiso: iso(20),
        prioridad: 'ALTA',
      })
      const accId = acc.accion?.id ?? acc.id
      await req(`/acciones/${accId}/avance`, 'POST', { avance: 100, comentario: 'Estándar publicado y rol ajustado.' })
      await req(`/acciones/${accId}/verificar`, 'POST', {
        eficaz: true,
        verificacionEficacia: 'El registro de doble verificación subió a 98,5% en el último mes.',
      })
      await req(`/hallazgos/${hCiclo}/completar-acciones`, 'POST', {})
      await req(`/hallazgos/${hCiclo}/verificar-eficacia`, 'POST', {
        eficaciaConfirmada: true,
        verificacionEficacia: 'Indicador IND-MIS-01 en meta durante el periodo posterior. Auditoría de seguimiento sin hallazgos.',
      })
    })
  }

  // Segundo hallazgo de auditoría → se queda EN ANÁLISIS
  const hAnalisis = hallazgosGen[1]
  if (hAnalisis) {
    await step('H (auditoría) — validado, en análisis', async () => {
      await req(`/hallazgos/${hAnalisis}/validar`, 'POST', {
        correccionInmediata: 'Se entregó el listado de medicamentos de alto riesgo impreso a cada estación.',
      })
      await req(`/hallazgos/${hAnalisis}/analisis`, 'PUT', {
        metodologia: 'ISHIKAWA',
        contenido: {
          categorias: {
            Personas: ['Personal nuevo sin inducción completa'],
            Métodos: ['La inducción no incluye evaluación práctica'],
            'Medio ambiente': ['Alta rotación en el turno nocturno'],
          },
        },
        causaInmediata: 'Personal de reciente ingreso no identifica el listado.',
      })
    })
  }

  // ── ACCIONES sueltas (desde riesgo y desde indicador) ──────────────────────
  console.log('\nACCIONES')
  const accionesPrev = (await req('/acciones?porPagina=100')).datos ?? []
  const accExiste = (desc) => accionesPrev.some((a) => a.descripcion === desc && !a.archivado)
  // Limpieza de duplicados de corridas anteriores
  for (const desc of [
    'Diseñar el programa de bienestar y plan de carrera para enfermería.',
    'Instalar barandas y señalización de riesgo de caídas en las habitaciones del ala norte.',
  ]) {
    const dups = accionesPrev.filter((a) => a.descripcion === desc && !a.archivado)
    for (const a of dups.slice(1)) await step(`archivar acción duplicada ${a.codigo}`, () => req(`/acciones/${a.id}/archivar`, 'POST', {}))
  }

  if (riesgoId['R-APO-01']) {
    await step('acción desde riesgo R-APO-01 (en curso 50%)', async () => {
      const desc = 'Diseñar el programa de bienestar y plan de carrera para enfermería.'
      if (accExiste(desc)) throw new Error('ya existe')
      const a = await req('/acciones', 'POST', {
        tipo: 'TRATAMIENTO_RIESGO', descripcion: desc, origen: 'RIESGO', riesgoId: riesgoId['R-APO-01'],
        responsableId: me.id, fechaCompromiso: iso(75), prioridad: 'MEDIA',
      })
      const id = a.accion?.id ?? a.id
      await req(`/acciones/${id}/avance`, 'POST', { avance: 50, comentario: 'Propuesta de bienestar lista; en revisión con Dirección.' })
    })
  }
  if (indId['IND-MIS-02']) {
    await step('acción desde indicador IND-MIS-02 (vencida)', async () => {
      const desc = 'Instalar barandas y señalización de riesgo de caídas en las habitaciones del ala norte.'
      if (accExiste(desc)) throw new Error('ya existe')
      const det = await req(`/indicadores/${indId['IND-MIS-02']}`)
      const med = (det.mediciones ?? det.indicador?.mediciones ?? [])[0]
      await req('/acciones', 'POST', {
        tipo: 'MEJORA', descripcion: desc, origen: 'INDICADOR', medicionId: med?.id, procesoId: misional.id,
        responsableId: me.id, fechaCompromiso: iso(-5), prioridad: 'ALTA',
      })
    })
  }

  // ── MEJORA CONTINUA (MCC) ─────────────────────────────────────────────────
  console.log('\nMEJORA CONTINUA (MCC)')
  const mccPrev = (await req('/mcc?porPagina=100')).datos ?? []
  const mccPorTitulo = (t) => mccPrev.find((m) => m.titulo === t && !m.archivado)
  const MCC = [
    {
      titulo: 'App de recordatorio de higiene de manos por turno',
      descripcion: 'Un aviso en las tablets de enfermería recordando los 5 momentos de higiene de manos, con registro de cumplimiento.',
      origen: 'COLABORADOR', origenDetalle: 'Sugerencia de enfermería de hospitalización.',
      estadoFinal: 'nuevo',
    },
    {
      titulo: 'Rediseño del resumen de egreso',
      descripcion: 'Simplificar el resumen de egreso a una página con lenguaje claro para el paciente.',
      origen: 'AREA', origenDetalle: 'Comité de historia clínica.',
      estadoFinal: 'ejecucion',
    },
    {
      titulo: 'Etiquetas de color para sueros según velocidad de infusión',
      descripcion: 'Usar etiquetas de color estandarizadas para identificar rápidamente la velocidad de infusión.',
      origen: 'AUDITORIA', origenDetalle: 'Observación de auditoría interna.',
      estadoFinal: 'cerrado',
    },
  ]
  // Limpieza de duplicados
  for (const def of MCC) {
    const dups = mccPrev.filter((m) => m.titulo === def.titulo && !m.archivado)
    for (const m of dups.slice(1)) await step(`archivar MCC duplicado ${m.codigo}`, () => req(`/mcc/${m.id}/archivar`, 'POST', {}))
  }
  for (const def of MCC) {
    await step(`MCC "${def.titulo.slice(0, 32)}…" [${def.estadoFinal}]`, async () => {
      if (mccPorTitulo(def.titulo)) throw new Error('ya existe')
      const m = await req('/mcc', 'POST', {
        titulo: def.titulo, descripcion: def.descripcion, origen: def.origen, origenDetalle: def.origenDetalle,
      })
      const id = m.registro?.id ?? m.id
      if (def.estadoFinal === 'nuevo') return
      await req(`/mcc/${id}/decidir`, 'POST', {
        procede: true, justificacion: 'Aporta valor con bajo costo y mejora la seguridad del paciente.',
        impacto: def.estadoFinal === 'cerrado' ? 'medio' : 'alto', prioridad: 'MEDIA',
      })
      await req(`/mcc/${id}/iniciar-ejecucion`, 'POST', {})
      if (def.estadoFinal === 'ejecucion') return
      await req(`/mcc/${id}/verificacion`, 'POST', {})
      await req(`/mcc/${id}/cerrar`, 'POST', {
        evaluacionResultado: 'Implementado en 100% de las unidades. Sin eventos relacionados en 3 meses.',
        aprendizaje: 'Las ayudas visuales simples y estandarizadas tienen alto impacto en la seguridad con bajo costo.',
      })
    })
  }

  console.log(`\nListo. ${ok} pasos ejecutados, ${skip} omitidos/errores.`)
  console.log('Recorre: Indicadores, Riesgos, Control documental, Auditorías, Hallazgos, Planes y acciones, Mejora continua y el Panel.')
}

main().catch((e) => {
  console.error('\n✗', e.message)
  process.exit(1)
})
