import { useState } from 'react'
import {
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
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { AccionesDeCasoTab } from '@/features/acciones/AccionesDeCasoTab'
import {
  ETIQUETA_ESTADO_MCC,
  ETIQUETA_ORIGEN_MCC,
  mccApi,
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
}

export function MccDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [comentario, setComentario] = useState('')

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
  if (data.puede.gestionar) {
    if (['NUEVO', 'EN_REVISION'].includes(m.estado)) {
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
    if (m.estado === 'ACEPTADO')
      acciones.push(
        <Button key="ie" type="primary" onClick={() => run(mccApi.iniciarEjecucion(id))}>
          Iniciar ejecución
        </Button>,
      )
    if (m.estado === 'EN_EJECUCION')
      acciones.push(
        <Button key="v" onClick={() => run(mccApi.verificacion(id))}>
          Pasar a verificación
        </Button>,
      )
    if (['VERIFICACION', 'EN_EJECUCION'].includes(m.estado))
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
              <Tag>{ETIQUETA_ORIGEN_MCC[m.origen]}</Tag>
              <Tag color={m.estado === 'CERRADO' ? 'success' : m.estado === 'NO_PROCEDE' ? 'default' : 'processing'}>
                {ETIQUETA_ESTADO_MCC[m.estado]}
              </Tag>
              {m.area && <Tag>{m.area.nombre}</Tag>}
            </Space>
          </div>
        </Space>
        <Space wrap>{acciones}</Space>
      </Flex>

      {m.estado !== 'NO_PROCEDE' && (
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
              <Descriptions bordered size="small" column={1}>
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
    </>
  )
}
