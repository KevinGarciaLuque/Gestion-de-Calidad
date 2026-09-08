import { useState } from 'react'
import {
  App,
  Breadcrumb,
  Button,
  Descriptions,
  Flex,
  Input,
  InputNumber,
  Progress,
  Space,
  Spin,
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
import { GenericoEvidenciasPanel } from './GenericoEvidenciasPanel'
import { AccionFormModal } from './AccionFormModal'
import { estadoColor } from './AccionesPage'
import {
  accionesApi,
  descargarEvidenciaAccion,
  ETIQUETA_ESTADO_ACCION,
  ETIQUETA_TIPO_ACCION,
} from './accionesApi'

const { Title, Text, Paragraph } = Typography

export function AccionDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [editar, setEditar] = useState(false)
  const [nuevoAvance, setNuevoAvance] = useState<number | null>(null)
  const [comentarioAvance, setComentarioAvance] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['accion', id],
    queryFn: () => accionesApi.obtener(id),
  })

  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['accion', id] })
    void qc.invalidateQueries({ queryKey: ['acciones'] })
    void qc.invalidateQueries({ queryKey: ['hallazgo'] })
    void qc.invalidateQueries({ queryKey: ['riesgo'] })
  }
  const run = (p: Promise<unknown>) => p.then(refrescar).catch((e) => message.error(mensajeDeError(e)))

  const avanzar = useMutation({
    mutationFn: () => accionesApi.avance(id, nuevoAvance ?? 0, comentarioAvance || undefined),
    onSuccess: () => {
      message.success('Avance registrado')
      setNuevoAvance(null)
      setComentarioAvance('')
      refrescar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (isLoading) return <Spin />
  if (isError || !data) return <Text type="danger">No se pudo cargar la acción.</Text>

  const a = data.accion
  const abierta = ['PENDIENTE', 'EN_CURSO', 'COMPLETADA'].includes(a.estado)

  const acciones: React.ReactNode[] = []
  if (data.puede.editar && abierta) {
    acciones.push(<Button key="e" onClick={() => setEditar(true)}>Editar</Button>)
    acciones.push(
      <Button
        key="c"
        danger
        onClick={() => {
          let m = ''
          modal.confirm({
            title: 'Cancelar la acción',
            content: <Input.TextArea rows={2} placeholder="Motivo" onChange={(e) => (m = e.target.value)} />,
            okText: 'Cancelar acción',
            onOk: () => run(accionesApi.cancelar(id, m)),
          })
        }}
      >
        Cancelar
      </Button>,
    )
  }
  if (data.puede.verificar && a.estado === 'COMPLETADA') {
    acciones.push(
      <Button
        key="v"
        type="primary"
        onClick={() => {
          let texto = ''
          modal.confirm({
            title: 'Verificar eficacia',
            width: 520,
            content: <Input.TextArea rows={4} placeholder="Cómo se verificó la eficacia" onChange={(e) => (texto = e.target.value)} />,
            okText: 'Eficaz',
            cancelText: 'No eficaz',
            onOk: () => run(accionesApi.verificar(id, true, texto)),
            onCancel: () => {
              if (texto.trim()) run(accionesApi.verificar(id, false, texto))
            },
          })
        }}
      >
        Verificar eficacia
      </Button>,
    )
  }

  return (
    <>
      <Breadcrumb style={{ marginBottom: 12 }} items={[{ title: <Link to="/acciones">Acciones</Link> }, { title: a.codigo }]} />

      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space align="start">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/acciones')} />
          <div style={{ maxWidth: 620 }}>
            <Title level={4} style={{ margin: 0 }}>
              {a.descripcion}
            </Title>
            <Space size={6} wrap style={{ marginTop: 6 }}>
              <Tag>{a.codigo}</Tag>
              <Tag>{ETIQUETA_TIPO_ACCION[a.tipo]}</Tag>
              <Tag color={estadoColor(a.estado)}>{ETIQUETA_ESTADO_ACCION[a.estado]}</Tag>
              {a.origen.ruta ? (
                <Link to={a.origen.ruta}>
                  <Tag color="blue">
                    {a.origen.tipo} {a.origen.ref}
                  </Tag>
                </Link>
              ) : (
                <Tag>{a.origen.tipo}{a.origen.ref ? ` · ${a.origen.ref}` : ''}</Tag>
              )}
              {a.proceso && <Tag>{a.proceso.codigo}</Tag>}
            </Space>
          </div>
        </Space>
        <Space wrap>{acciones}</Space>
      </Flex>

      <Progress
        percent={a.avance}
        status={a.estado === 'VERIFICADA' ? 'success' : a.alerta.vencida ? 'exception' : 'active'}
        style={{ marginBottom: 16, maxWidth: 480 }}
      />

      {(a.alerta.vencida || a.alerta.sinResponsable || a.alerta.esperaVerificacion) && (
        <Space size={[6, 6]} wrap style={{ marginBottom: 16 }}>
          {a.alerta.vencida && <Tag color="volcano">Fecha compromiso vencida</Tag>}
          {a.alerta.sinResponsable && <Tag color="red">Sin responsable</Tag>}
          {a.alerta.esperaVerificacion && <Tag color="blue">Completada — espera verificación de Calidad</Tag>}
        </Space>
      )}

      <Tabs
        items={[
          {
            key: 'ficha',
            label: 'Ficha',
            children: (
              <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                <Descriptions.Item label="Resultado esperado" span={2}>
                  {a.resultadoEsperado ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Evidencia requerida" span={2}>
                  {a.evidenciaRequerida ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Responsable">{a.responsable?.nombre ?? 'Sin asignar'}</Descriptions.Item>
                <Descriptions.Item label="Colaboradores">
                  {a.colaboradores.length ? a.colaboradores.map((c) => c.nombre).join(', ') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Inicio">
                  {a.fechaInicio ? dayjs(a.fechaInicio).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Compromiso">
                  {a.fechaCompromiso ? dayjs(a.fechaCompromiso).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Prioridad">{a.prioridad}</Descriptions.Item>
                <Descriptions.Item label="Cierre">
                  {a.fechaCierre ? dayjs(a.fechaCierre).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                {a.verificacionEficacia && (
                  <Descriptions.Item label="Verificación de eficacia" span={2}>
                    <Text type={a.eficaz ? 'success' : 'danger'}>{a.eficaz ? '✓ ' : '✗ '}</Text>
                    {a.verificacionEficacia}
                  </Descriptions.Item>
                )}
              </Descriptions>
            ),
          },
          {
            key: 'seguimiento',
            label: `Seguimiento (${data.avances.length})`,
            children: (
              <>
                {data.puede.editar && abierta && (
                  <Space.Compact style={{ marginBottom: 16, width: '100%', maxWidth: 560 }} direction="vertical">
                    <Space>
                      <InputNumber
                        min={0}
                        max={100}
                        value={nuevoAvance ?? a.avance}
                        onChange={(v) => setNuevoAvance(v)}
                        addonAfter="%"
                      />
                      <Input
                        placeholder="Comentario del avance"
                        value={comentarioAvance}
                        onChange={(e) => setComentarioAvance(e.target.value)}
                        style={{ width: 320 }}
                      />
                      <Button type="primary" onClick={() => avanzar.mutate()} loading={avanzar.isPending}>
                        Registrar avance
                      </Button>
                    </Space>
                  </Space.Compact>
                )}
                <Timeline
                  items={data.avances.map((av) => ({
                    color: av.estadoNuevo === 'CANCELADA' ? 'red' : av.avance >= 100 ? 'green' : 'blue',
                    children: (
                      <div>
                        <Text strong>{av.avance}%</Text>
                        {av.estadoNuevo && <Tag style={{ marginLeft: 8 }}>{ETIQUETA_ESTADO_ACCION[av.estadoNuevo]}</Tag>}
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          {dayjs(av.fecha).format('DD/MM/YYYY HH:mm')} · {av.por?.nombre ?? '—'}
                        </div>
                        {av.comentario && <Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{av.comentario}</Paragraph>}
                      </div>
                    ),
                  }))}
                />
                {data.avances.length === 0 && <Text type="secondary">Sin avances registrados.</Text>}
              </>
            ),
          },
          {
            key: 'evidencias',
            label: 'Evidencias',
            children: (
              <GenericoEvidenciasPanel
                listar={() => accionesApi.evidencias(id)}
                subir={(f) => accionesApi.subirEvidencia(id, f)}
                quitar={(evId) => accionesApi.quitarEvidencia(id, evId)}
                descargar={(evId, nombre) => descargarEvidenciaAccion(id, evId, nombre)}
                puedeEditar={data.puede.editar}
                queryKey={['evidencias-accion', id]}
              />
            ),
          },
        ]}
      />

      {editar && (
        <AccionFormModal
          accion={a}
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
