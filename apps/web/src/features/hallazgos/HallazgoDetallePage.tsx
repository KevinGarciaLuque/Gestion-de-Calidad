import { useState } from 'react'
import {
  App,
  Breadcrumb,
  Button,
  Descriptions,
  Flex,
  Input,
  Space,
  Spin,
  Steps,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { AnalisisCausaTab } from './AnalisisCausaTab'
import { EvidenciasPanel } from './EvidenciasPanel'
import { HallazgoFormModal } from './HallazgoFormModal'
import { clasifColor } from './HallazgosPage'
import {
  ETIQUETA_CLASIFICACION,
  ETIQUETA_ESTADO_HALLAZGO,
  ETIQUETA_ORIGEN,
  hallazgosApi,
  ORDEN_ESTADOS,
} from './hallazgosApi'

const { Title, Text, Paragraph } = Typography

const TIPO_EVENTO: Record<string, string> = {
  validado: 'Validado por Calidad',
  plan_aprobado: 'Plan de acción aprobado',
  en_ejecucion: 'Ejecución iniciada',
  acciones_completas: 'Acciones completadas',
  eficacia_negativa: 'Eficacia NO confirmada — reabierto',
  cerrado: 'Cerrado (eficacia confirmada)',
  reabierto: 'Reabierto',
  comentario: 'Comentario',
}

export function HallazgoDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [editar, setEditar] = useState(false)
  const [comentario, setComentario] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hallazgo', id],
    queryFn: () => hallazgosApi.obtener(id),
  })

  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['hallazgo', id] })
    void qc.invalidateQueries({ queryKey: ['hallazgos'] })
  }
  const run = (p: Promise<unknown>) => p.then(refrescar).catch((e) => message.error(mensajeDeError(e)))

  const comentar = useMutation({
    mutationFn: () => hallazgosApi.comentar(id, comentario.trim()),
    onSuccess: () => {
      setComentario('')
      refrescar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (isLoading) return <Spin />
  if (isError || !data) return <Text type="danger">No se pudo cargar el hallazgo.</Text>

  const h = data.hallazgo
  const p = data.puede

  const pasoActual = h.estado === 'REABIERTO' ? 1 : Math.max(0, ORDEN_ESTADOS.indexOf(h.estado))

  const acciones: React.ReactNode[] = []
  if (p.validar)
    acciones.push(
      <Button
        key="v"
        type="primary"
        onClick={() => {
          let cor = ''
          modal.confirm({
            title: 'Validar el hallazgo',
            content: (
              <Input.TextArea rows={3} placeholder="Corrección inmediata aplicada (opcional)" onChange={(e) => (cor = e.target.value)} />
            ),
            okText: 'Validar',
            onOk: () => run(hallazgosApi.validar(id, { correccionInmediata: cor || undefined })),
          })
        }}
      >
        Validar (Calidad)
      </Button>,
    )
  if (p.aprobarPlan)
    acciones.push(
      <Button key="ap" type="primary" onClick={() => modal.confirm({ title: 'Aprobar el plan de acción', content: 'Requiere causa raíz y plan registrados.', onOk: () => run(hallazgosApi.aprobarPlan(id)) })}>
        Aprobar plan
      </Button>,
    )
  if (p.iniciarEjecucion)
    acciones.push(
      <Button key="ie" type="primary" onClick={() => run(hallazgosApi.iniciarEjecucion(id))}>
        Iniciar ejecución
      </Button>,
    )
  if (p.completarAcciones)
    acciones.push(
      <Button key="ca" type="primary" onClick={() => modal.confirm({ title: 'Marcar todas las acciones como completas', content: 'Pasa a verificación de eficacia por Calidad.', onOk: () => run(hallazgosApi.completarAcciones(id)) })}>
        Acciones completas
      </Button>,
    )
  if (p.verificarEficacia)
    acciones.push(
      <Button
        key="ve"
        type="primary"
        onClick={() => {
          let texto = ''
          modal.confirm({
            title: 'Verificar eficacia',
            width: 520,
            content: (
              <Input.TextArea rows={4} placeholder="Cómo se verificó la eficacia (reauditoría, indicador, etc.)" onChange={(e) => (texto = e.target.value)} />
            ),
            okText: 'Eficaz — cerrar',
            cancelText: 'No eficaz — reabrir',
            onOk: () => run(hallazgosApi.verificarEficacia(id, { eficaciaConfirmada: true, verificacionEficacia: texto })),
            onCancel: () => {
              if (texto.trim()) run(hallazgosApi.verificarEficacia(id, { eficaciaConfirmada: false, verificacionEficacia: texto }))
            },
          })
        }}
      >
        Verificar eficacia
      </Button>,
    )
  if (p.reabrir)
    acciones.push(
      <Button
        key="r"
        onClick={() => {
          let motivo = ''
          modal.confirm({
            title: 'Reabrir el hallazgo',
            content: <Input.TextArea rows={3} placeholder="Motivo de la reapertura" onChange={(e) => (motivo = e.target.value)} />,
            okText: 'Reabrir',
            onOk: () => run(hallazgosApi.reabrir(id, motivo)),
          })
        }}
      >
        Reabrir
      </Button>,
    )
  if (p.editar) acciones.push(<Button key="e" onClick={() => setEditar(true)}>Editar</Button>)

  return (
    <>
      <Breadcrumb style={{ marginBottom: 12 }} items={[{ title: <Link to="/hallazgos">Hallazgos</Link> }, { title: h.codigo }]} />

      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space align="start">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/hallazgos')} />
          <div style={{ maxWidth: 640 }}>
            <Title level={4} style={{ margin: 0 }}>
              {h.descripcion}
            </Title>
            <Space size={6} wrap style={{ marginTop: 6 }}>
              <Tag>{h.codigo}</Tag>
              <Tag>{ETIQUETA_ORIGEN[h.origen]}</Tag>
              <Tag color={clasifColor(h.clasificacion)}>{ETIQUETA_CLASIFICACION[h.clasificacion]}</Tag>
              <Tag color={h.estado === 'CERRADO' ? 'success' : h.estado === 'REABIERTO' ? 'volcano' : 'processing'}>
                {ETIQUETA_ESTADO_HALLAZGO[h.estado]}
              </Tag>
              {h.proceso && (
                <Link to={`/procesos/${h.proceso.id}`}>
                  <Tag color="blue">{h.proceso.codigo}</Tag>
                </Link>
              )}
              {h.auditoria && (
                <Link to={`/auditorias/${h.auditoria.id}`}>
                  <Tag>{h.auditoria.codigo}</Tag>
                </Link>
              )}
            </Space>
          </div>
        </Space>
        <Space wrap>{acciones}</Space>
      </Flex>

      <Steps
        size="small"
        current={pasoActual}
        style={{ marginBottom: 20 }}
        status={h.estado === 'REABIERTO' ? 'error' : 'process'}
        items={[
          { title: 'Registrado' },
          { title: 'Análisis de causa' },
          { title: 'Plan aprobado' },
          { title: 'En ejecución' },
          { title: 'Verificación de eficacia' },
          { title: 'Cerrado' },
        ]}
      />

      {(h.alerta.sinResponsable || h.alerta.planVencido || h.alerta.sinAnalisis || h.motivoReapertura) && (
        <Space size={[6, 6]} wrap style={{ marginBottom: 16 }}>
          {h.alerta.sinResponsable && <Tag color="red">Sin responsable de respuesta</Tag>}
          {h.alerta.planVencido && <Tag color="volcano">Fecha compromiso vencida</Tag>}
          {h.alerta.sinAnalisis && <Tag color="gold">Falta identificar la causa raíz</Tag>}
          {h.motivoReapertura && <Tag color="volcano">Reabierto: {h.motivoReapertura}</Tag>}
        </Space>
      )}

      <Tabs
        items={[
          {
            key: 'ficha',
            label: 'Ficha',
            children: (
              <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                <Descriptions.Item label="Requisito relacionado" span={2}>
                  {h.requisito ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Evidencia objetiva" span={2}>
                  {h.evidencia ? <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{h.evidencia}</Paragraph> : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Corrección inmediata" span={2}>
                  {h.correccionInmediata ?? <Text type="secondary">Sin registrar</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Prioridad">{h.prioridad}</Descriptions.Item>
                <Descriptions.Item label="Detectado por">{h.detectadoPor?.nombre ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Responsable">{h.responsable?.nombre ?? 'Sin asignar'}</Descriptions.Item>
                <Descriptions.Item label="Fecha compromiso">
                  {h.fechaCompromiso ? dayjs(h.fechaCompromiso).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Detección">{dayjs(h.fechaDeteccion).format('DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="Cierre">
                  {h.fechaCierre ? dayjs(h.fechaCierre).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                {h.verificacionEficacia && (
                  <Descriptions.Item label="Verificación de eficacia" span={2}>
                    <Text type={h.eficaciaConfirmada ? 'success' : 'danger'}>
                      {h.eficaciaConfirmada ? '✓ Confirmada. ' : '✗ No confirmada. '}
                    </Text>
                    {h.verificacionEficacia}
                  </Descriptions.Item>
                )}
              </Descriptions>
            ),
          },
          {
            key: 'analisis',
            label: 'Análisis de causa',
            children: <AnalisisCausaTab detalle={data} onCambio={refrescar} />,
          },
          {
            key: 'plan',
            label: 'Plan de acción',
            children: <PlanTab detalle={data} onCambio={refrescar} />,
          },
          {
            key: 'evidencias',
            label: 'Evidencias',
            children: <EvidenciasPanel hallazgoId={id} puedeEditar={p.editar} />,
          },
          {
            key: 'historial',
            label: 'Historial',
            children: (
              <>
                <Timeline
                  items={data.eventos.map((e) => ({
                    color: e.tipo === 'cerrado' ? 'green' : e.tipo === 'eficacia_negativa' || e.tipo === 'reabierto' ? 'red' : 'blue',
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
                {data.eventos.length === 0 && <Text type="secondary">Sin movimientos todavía.</Text>}
                {p.editar && (
                  <Space.Compact style={{ width: '100%', marginTop: 12 }}>
                    <Input
                      placeholder="Agregar un comentario al historial"
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      onPressEnter={() => comentario.trim() && comentar.mutate()}
                    />
                    <Button onClick={() => comentario.trim() && comentar.mutate()} loading={comentar.isPending}>
                      Comentar
                    </Button>
                  </Space.Compact>
                )}
              </>
            ),
          },
        ]}
      />

      {editar && (
        <HallazgoFormModal
          hallazgo={h}
          onClose={() => setEditar(false)}
          onGuardado={() => {
            setEditar(false)
            refrescar()
          }}
        />
      )}
    </>
  )
}

function PlanTab({
  detalle,
  onCambio,
}: {
  detalle: import('./hallazgosApi').HallazgoDetalle
  onCambio: () => void
}) {
  const { message } = App.useApp()
  const [texto, setTexto] = useState(detalle.hallazgo.planAccion ?? '')
  const puedeEditar =
    detalle.puede.editar && !['CERRADO'].includes(detalle.hallazgo.estado)

  const guardar = useMutation({
    mutationFn: () => hallazgosApi.guardarPlan(detalle.hallazgo.id, texto.trim()),
    onSuccess: () => {
      message.success('Plan guardado')
      onCambio()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Text type="secondary">
        Describe aquí las acciones correctivas. El seguimiento de cada acción individual (responsable,
        fecha, evidencia) llega con el módulo de Planes de mejora (Fase 8).
      </Text>
      <Input.TextArea
        rows={8}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={!puedeEditar}
        placeholder="1. Acción correctiva…&#10;2. …"
      />
      {puedeEditar && (
        <Button type="primary" onClick={() => guardar.mutate()} loading={guardar.isPending}>
          Guardar plan
        </Button>
      )}
    </Space>
  )
}
