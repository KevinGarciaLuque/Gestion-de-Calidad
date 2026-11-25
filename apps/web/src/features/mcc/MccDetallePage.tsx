import { useState } from 'react'
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Descriptions,
  Flex,
  Input,
  Select,
  Space,
  Spin,
  Steps,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import { AlertOutlined, ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { AccionesDeCasoTab } from '@/features/acciones/AccionesDeCasoTab'
import { GenericoEvidenciasPanel } from '@/features/acciones/GenericoEvidenciasPanel'
import { ETIQUETA_ESTADO_HALLAZGO, type EstadoHallazgo } from '@/features/hallazgos/hallazgosApi'
import { MccRegistroForm } from './MccRegistroForm'
import { EscalarHallazgoModal } from './EscalarHallazgoModal'
import { FichaControl } from './FichaControl'
import {
  ETIQUETA_ESTADO_MCC,
  ETIQUETA_ESTATUS,
  ETIQUETA_ORIGEN_MCC,
  ETIQUETA_TIPO,
  mccApi,
  TAG_ESTATUS,
  ORDEN_ESTADOS_MCC,
} from './mccApi'

const { Title, Text, Paragraph } = Typography

const TIPO_EVENTO: Record<string, string> = {
  creado: 'Registro creado',
  aceptado: 'Aceptado por Calidad',
  no_procede: 'No procede',
  en_ejecucion: 'Ejecución iniciada',
  verificacion: 'Pasa a verificación',
  cerrado: 'Cerrado',
  comentario: 'Comentario',
  estatus: 'Cambio de estatus',
  importado: 'Importado del histórico',
  escalado: 'Escalado a hallazgo formal',
}

export function MccDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [comentario, setComentario] = useState('')
  const [editando, setEditando] = useState(false)
  const [escalando, setEscalando] = useState(false)

  const { data, isLoading, isError } = useQuery({ queryKey: ['mcc', id], queryFn: () => mccApi.obtener(id) })

  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['mcc', id] })
    void qc.invalidateQueries({ queryKey: ['mcc'] })
  }
  const run = (p: Promise<unknown>) => p.then(refrescar).catch((e) => message.error(mensajeDeError(e)))

  const comentar = useMutation({
    mutationFn: () => mccApi.comentar(id, comentario.trim()),
    onSuccess: () => {
      setComentario('')
      refrescar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (isLoading) return <Spin />
  if (isError || !data) return <Text type="danger">No se pudo cargar el registro.</Text>

  const m = data.registro
  const paso = m.estado === 'NO_PROCEDE' ? 0 : Math.max(0, ORDEN_ESTADOS_MCC.indexOf(m.estado))

  const acciones: React.ReactNode[] = []
  if (data.puede.editar)
    acciones.push(
      <Button key="ed" icon={<EditOutlined />} onClick={() => setEditando(true)}>
        Editar
      </Button>,
    )
  if (data.puede.escalar)
    acciones.push(
      <Button key="esc" danger icon={<AlertOutlined />} onClick={() => setEscalando(true)}>
        Escalar a hallazgo formal
      </Button>,
    )
  if (data.puede.gestionar) {
    // Los registros escalados siguen el flujo del hallazgo, no el de propuesta de mejora.
    if (['NUEVO', 'EN_REVISION'].includes(m.estado) && !m.hallazgo) {
      acciones.push(
        <Button
          key="d"
          type="primary"
          onClick={() => {
            let just = ''
            let impacto = 'medio'
            let prioridad = 'MEDIA'
            modal.confirm({
              title: 'Clasificar y decidir',
              width: 520,
              content: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Select defaultValue="medio" style={{ width: '100%' }} onChange={(v) => (impacto = v)}
                    options={[{ value: 'alto', label: 'Impacto alto' }, { value: 'medio', label: 'Impacto medio' }, { value: 'bajo', label: 'Impacto bajo' }]} />
                  <Select defaultValue="MEDIA" style={{ width: '100%' }} onChange={(v) => (prioridad = v)}
                    options={[{ value: 'ALTA', label: 'Prioridad alta' }, { value: 'MEDIA', label: 'Prioridad media' }, { value: 'BAJA', label: 'Prioridad baja' }]} />
                  <Input.TextArea rows={3} placeholder="Justificación de la decisión" onChange={(e) => (just = e.target.value)} />
                </Space>
              ),
              okText: 'Aceptar',
              cancelText: 'No procede',
              onOk: () => run(mccApi.decidir(id, { procede: true, justificacion: just, impacto, prioridad })),
              onCancel: () => {
                if (just.trim()) run(mccApi.decidir(id, { procede: false, justificacion: just }))
              },
            })
          }}
        >
          Clasificar / decidir
        </Button>,
      )
    }
    if (m.estado === 'ACEPTADO' && !m.hallazgo)
      acciones.push(
        <Button key="ie" type="primary" onClick={() => run(mccApi.iniciarEjecucion(id))}>
          Iniciar ejecución
        </Button>,
      )
    if (m.estado === 'EN_EJECUCION' && !m.hallazgo)
      acciones.push(
        <Button key="v" onClick={() => run(mccApi.verificacion(id))}>
          Pasar a verificación
        </Button>,
      )
    // Si se escaló, el cierre lo da la verificación de eficacia del hallazgo.
    if (['VERIFICACION', 'EN_EJECUCION'].includes(m.estado) && (!m.hallazgo || m.hallazgo.estado === 'CERRADO'))
      acciones.push(
        <Button
          key="c"
          type="primary"
          onClick={() => {
            let ev = ''
            let ap = ''
            modal.confirm({
              title: 'Cerrar el registro',
              width: 520,
              content: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input.TextArea rows={3} placeholder="Evaluación del resultado" onChange={(e) => (ev = e.target.value)} />
                  <Input.TextArea rows={2} placeholder="Aprendizaje (opcional)" onChange={(e) => (ap = e.target.value)} />
                </Space>
              ),
              okText: 'Cerrar',
              onOk: () => run(mccApi.cerrar(id, { evaluacionResultado: ev, aprendizaje: ap || undefined })),
            })
          }}
        >
          Cerrar
        </Button>,
      )
  }

  return (
    <>
      <Breadcrumb style={{ marginBottom: 12 }} items={[{ title: <Link to="/mcc">Mejora continua</Link> }, { title: m.codigo }]} />

      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space align="start">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/mcc')} />
          <div style={{ maxWidth: 620 }}>
            <Title level={4} style={{ margin: 0 }}>
              {m.titulo}
            </Title>
            <Space size={6} wrap style={{ marginTop: 6 }}>
              <Tag>{m.codigo}</Tag>
              {m.codigoTipo && <Tag color="blue">{m.codigoTipo}</Tag>}
              {m.tipoRegistro ? <Tag color="geekblue">{ETIQUETA_TIPO[m.tipoRegistro]}</Tag> : <Tag>{ETIQUETA_ORIGEN_MCC[m.origen]}</Tag>}
              <Tag color={TAG_ESTATUS[m.estatus]}>{ETIQUETA_ESTATUS[m.estatus]}</Tag>
              <Tag color={m.estado === 'CERRADO' ? 'success' : m.estado === 'NO_PROCEDE' ? 'default' : 'processing'}>
                {ETIQUETA_ESTADO_MCC[m.estado]}
              </Tag>
              {(m.area || m.areaResponsable) && <Tag>{m.area?.nombre ?? m.areaResponsable}</Tag>}
            </Space>
          </div>
        </Space>
        <Space wrap>{acciones}</Space>
      </Flex>

      {m.hallazgo && (
        <Alert
          type={m.hallazgo.estado === 'CERRADO' ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              Escalado al hallazgo formal{' '}
              <Link to={`/hallazgos/${m.hallazgo.id}`}>
                <Text strong>{m.hallazgo.codigo}</Text>
              </Link>{' '}
              · {ETIQUETA_ESTADO_HALLAZGO[m.hallazgo.estado as EstadoHallazgo] ?? m.hallazgo.estado}
            </span>
          }
          description={
            m.hallazgo.estado === 'CERRADO'
              ? 'La eficacia del hallazgo se verificó y este registro quedó cerrado.'
              : 'El análisis de causa, el plan de acción y la verificación de eficacia se llevan en el hallazgo. Este registro se cierra solo al cerrarlo.'
          }
        />
      )}

      {!['NO_PROCEDE', 'SIN_ESTADO'].includes(m.estado) && !m.hallazgo && (
        <Steps
          size="small"
          current={paso}
          style={{ marginBottom: 20 }}
          items={[
            { title: 'Nuevo' },
            { title: 'Aceptado' },
            { title: 'En ejecución' },
            { title: 'Verificación' },
            { title: 'Cerrado' },
          ]}
        />
      )}

      <Tabs
        items={[
          {
            key: 'ficha',
            label: 'Ficha',
            children: (
              <>
              {m.tipoRegistro && <FichaControl registro={m} />}
              <Descriptions bordered size="small" column={1} title={m.tipoRegistro ? 'Flujo de mejora' : undefined}>
                <Descriptions.Item label="Descripción">
                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.descripcion}</Paragraph>
                </Descriptions.Item>
                <Descriptions.Item label="Origen">
                  {ETIQUETA_ORIGEN_MCC[m.origen]}
                  {m.origenDetalle ? ` — ${m.origenDetalle}` : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Propuesto por">{m.propuestoPor?.nombre ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Impacto / prioridad">
                  {m.impacto ?? '—'} / {m.prioridad ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Decisión">
                  {m.decisionJustificacion ?? <Text type="secondary">Pendiente de clasificar</Text>}
                </Descriptions.Item>
                {m.evaluacionResultado && (
                  <Descriptions.Item label="Evaluación del resultado">{m.evaluacionResultado}</Descriptions.Item>
                )}
                {m.aprendizaje && <Descriptions.Item label="Aprendizaje">{m.aprendizaje}</Descriptions.Item>}
              </Descriptions>
              </>
            ),
          },
          {
            key: 'evidencias',
            label: 'Evidencias',
            children: (
              <GenericoEvidenciasPanel
                queryKey={['mcc', id, 'evidencias']}
                listar={() => mccApi.evidencias(id)}
                subir={(f) => mccApi.subirEvidencia(id, f)}
                quitar={(ev) => mccApi.quitarEvidencia(id, ev)}
                descargar={(ev, nombre) => mccApi.descargarEvidencia(id, ev, nombre)}
                puedeEditar={data.puede.editar}
              />
            ),
          },
          {
            key: 'acciones',
            label: `Acciones (${data.acciones.length})`,
            children:
              m.estado === 'EN_EJECUCION' || data.acciones.length > 0 ? (
                <AccionesDeCasoTab
                  origenFijo={{ origen: 'MCC', mccId: id, tipoSugerido: 'MEJORA' }}
                  filtro={{ mccId: id }}
                />
              ) : (
                <Text type="secondary">Las acciones se crean cuando el registro pasa a ejecución.</Text>
              ),
          },
          {
            key: 'historial',
            label: 'Historial',
            children: (
              <>
                <Timeline
                  items={data.eventos.map((e) => ({
                    color: e.tipo === 'cerrado' ? 'green' : e.tipo === 'no_procede' ? 'red' : 'blue',
                    children: (
                      <div>
                        <Text strong>{TIPO_EVENTO[e.tipo] ?? e.tipo}</Text>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          {dayjs(e.fecha).format('DD/MM/YYYY HH:mm')} · {e.actorNombre ?? '—'}
                        </div>
                        {e.detalle && <Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{e.detalle}</Paragraph>}
                      </div>
                    ),
                  }))}
                />
                <Space.Compact style={{ width: '100%', marginTop: 12 }}>
                  <Input
                    placeholder="Comentario"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    onPressEnter={() => comentario.trim() && comentar.mutate()}
                  />
                  <Button onClick={() => comentario.trim() && comentar.mutate()} loading={comentar.isPending}>
                    Comentar
                  </Button>
                </Space.Compact>
              </>
            ),
          },
        ]}
      />
      <MccRegistroForm abierto={editando} onCerrar={() => setEditando(false)} registro={m} onGuardado={refrescar} />
      <EscalarHallazgoModal abierto={escalando} onCerrar={() => setEscalando(false)} registro={m} />
    </>
  )
}
