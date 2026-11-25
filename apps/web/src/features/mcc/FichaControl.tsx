import { Descriptions, Flex, Progress, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { ETIQUETA_PHVA, ETIQUETA_TIPO, lempiras, type MccDetalle } from './mccApi'

const { Paragraph, Text } = Typography

const f = (v: string | null | undefined, hora = false) => (v ? dayjs(v).format(hora ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY') : '—')
const t = (v: string | null | undefined) => v || '—'

/** Las 4 secciones del registro del Control MCC, como en la hoja original. */
export function FichaControl({ registro: m }: { registro: MccDetalle['registro'] }) {
  const c = m.control
  const plazo = (() => {
    const p = c.plazo
    if (p.situacion === 'VENCIDO') return <Tag color="#a8071a">VENCIDO ({p.dias} días)</Tag>
    if (p.situacion === 'POR_VENCER') return <Tag color="orange">POR VENCER ({p.dias} días)</Tag>
    if (p.situacion === 'EN_PLAZO') return <Tag color="blue">EN PLAZO</Tag>
    if (p.situacion === 'CERRADO') return <Tag color="success">CERRADO</Tag>
    if (p.situacion === 'SIN_FECHA') return <Tag color="red">SIN FECHA LÍMITE</Tag>
    return <Tag>NO APLICA</Tag>
  })()
  const porques = (c.porques ?? []).map((p, i) => ({ p, i })).filter((x) => x.p)

  return (
    <Flex vertical gap={16} style={{ marginBottom: 16 }}>
      <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }} title="1. Identificación y recepción">
        <Descriptions.Item label="Tipo de registro">{m.tipoRegistro ? ETIQUETA_TIPO[m.tipoRegistro] : '—'}</Descriptions.Item>
        <Descriptions.Item label="Código">{t(m.codigoTipo)}</Descriptions.Item>
        <Descriptions.Item label="Gestor de calidad">{t(c.gestorCalidad)}</Descriptions.Item>
        <Descriptions.Item label="Recepción">{f(m.fechaRecepcion, true)}</Descriptions.Item>
        <Descriptions.Item label="Usuario que encuentra">{t(c.usuarioEncuentra)}</Descriptions.Item>
        <Descriptions.Item label="Área que reporta">{t(c.areaReporta)}</Descriptions.Item>
        <Descriptions.Item label="Fuente">{t(c.fuente)}{c.fuenteSecundaria ? ` · ${c.fuenteSecundaria}` : ''}</Descriptions.Item>
        <Descriptions.Item label="N° expediente">{t(c.numeroExpediente)}</Descriptions.Item>
        <Descriptions.Item label="Turno">{t(c.turno)}</Descriptions.Item>
        <Descriptions.Item label="Descripción del hallazgo" span={3}>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.descripcion}</Paragraph>
        </Descriptions.Item>
      </Descriptions>

      <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }} title="2. Macroproceso, área responsable e impacto">
        <Descriptions.Item label="Macroproceso">{t(m.macroproceso)}</Descriptions.Item>
        <Descriptions.Item label="Área responsable">{m.area?.nombre ?? t(m.areaResponsable)}</Descriptions.Item>
        <Descriptions.Item label="Proceso afectado">{t(c.procesoAfectado)}</Descriptions.Item>
        <Descriptions.Item label="Subproceso">{t(c.subproceso)}</Descriptions.Item>
        <Descriptions.Item label="Procedimiento">{t(c.procedimiento)}</Descriptions.Item>
        <Descriptions.Item label="Subrogado">{t(c.subrogado)}</Descriptions.Item>
        <Descriptions.Item label="Impacto">{t(m.impacto)}{m.prioridad ? ` · prioridad ${m.prioridad.toLowerCase()}` : ''}</Descriptions.Item>
        <Descriptions.Item label="¿Dónde impactó?">{t(c.dondeImpacto)}</Descriptions.Item>
      </Descriptions>

      <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }} title="3. Causa raíz, ACyP, costos y Lean / PHVA">
        <Descriptions.Item label="Causa raíz" span={3}>{t(c.causaRaiz)}</Descriptions.Item>
        {porques.length > 0 && (
          <Descriptions.Item label="5 porqués" span={3}>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {porques.map(({ p, i }) => <li key={i} value={i + 1}>{p}</li>)}
            </ol>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="¿Requiere ACyP?">{c.requiereAcyp ? 'SÍ' : 'NO'}{c.acypCodigo ? ` · ${c.acypCodigo}` : ''}</Descriptions.Item>
        <Descriptions.Item label="Compromisos">
          {c.compromisosCumplidos ?? 0} de {c.compromisosAdquiridos ?? 0}
          {c.cumplimiento !== null && <Progress percent={c.cumplimiento} size="small" style={{ margin: 0 }} />}
        </Descriptions.Item>
        <Descriptions.Item label="Escalamiento">{t(c.escalamiento)}</Descriptions.Item>
        <Descriptions.Item label="Costo de la no calidad">
          {c.costoCalidad ? <Text strong>{lempiras(c.costoCalidad)}</Text> : c.tieneCostos ? 'Sí (sin monto)' : 'NO'}
        </Descriptions.Item>
        <Descriptions.Item label="PHVA">{c.phva ? ETIQUETA_PHVA[c.phva] : '—'}</Descriptions.Item>
        <Descriptions.Item label="Logros obtenidos">{t(c.logros)}</Descriptions.Item>
        <Descriptions.Item label="Lean · defecto">{t(c.leanDefecto)}</Descriptions.Item>
        <Descriptions.Item label="Lean · retrabajo">{t(c.leanRetrabajo)}</Descriptions.Item>
        <Descriptions.Item label="Lean · espera / movimiento">{t(c.leanEspera)} / {t(c.leanMovimiento)}</Descriptions.Item>
      </Descriptions>

      <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }} title="4. Seguimiento y cierre">
        <Descriptions.Item label="Responsable">{t(c.responsableNombre)}</Descriptions.Item>
        <Descriptions.Item label="Fecha notificación">{f(c.fechaNotificacion)}</Descriptions.Item>
        <Descriptions.Item label="Fecha comp. respuesta">{f(c.fechaCompromisoRespuesta)}</Descriptions.Item>
        <Descriptions.Item label="Fecha límite">{f(c.fechaLimite)}</Descriptions.Item>
        <Descriptions.Item label="Fecha cierre real">{f(m.fechaCierre)}</Descriptions.Item>
        <Descriptions.Item label="Indicador de criterio">{plazo}</Descriptions.Item>
        <Descriptions.Item label="Validación calidad">{t(c.validacionCalidad)}</Descriptions.Item>
        <Descriptions.Item label="Nota de evidencia" span={2}>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{t(c.notaEvidencia)}</Paragraph>
        </Descriptions.Item>
        {c.importadoAt && <Descriptions.Item label="Importado">{f(c.importadoAt, true)} (histórico)</Descriptions.Item>}
      </Descriptions>
    </Flex>
  )
}
