import { useState } from 'react'
import {
  App,
  Alert,
  Breadcrumb,
  Button,
  Descriptions,
  Flex,
  Form,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { SemaforoDot } from '@/components/Semaforo'
import { ETIQUETA_FRECUENCIA, indicadoresApi, type Medicion } from './indicadoresApi'
import { IconoTendencia, semEstado } from './IndicadoresPage'
import { IndicadorFormModal } from './IndicadorFormModal'
import { RegistrarMedicionModal } from './RegistrarMedicionModal'
import { TendenciaChart } from './TendenciaChart'

const { Title, Text, Paragraph } = Typography

export function IndicadorDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [editar, setEditar] = useState(false)
  const [registrar, setRegistrar] = useState(false)
  const [analizando, setAnalizando] = useState<Medicion | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['indicador', id],
    queryFn: () => indicadoresApi.obtener(id),
  })

  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['indicador', id] })
    void qc.invalidateQueries({ queryKey: ['indicadores'] })
  }

  const eliminar = useMutation({
    mutationFn: (medicionId: string) => indicadoresApi.eliminarMedicion(id, medicionId),
    onSuccess: () => {
      message.success('Medición eliminada')
      refrescar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const archivar = useMutation({
    mutationFn: (arch: boolean) => indicadoresApi.archivar(id, arch),
    onSuccess: () => {
      message.success('Estado actualizado')
      refrescar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (isLoading) return <Spin />
  if (isError || !data) return <Text type="danger">No se pudo cargar el indicador.</Text>

  const { indicador: ind, mediciones, alerta, puede } = data
  const fmt = (v: number) => `${v}${ind.unidad === '%' ? '%' : ` ${ind.unidad}`}`

  const columnas: ColumnsType<Medicion> = [
    { title: 'Periodo', dataIndex: 'etiqueta', width: 150 },
    {
      title: 'Numerador / denominador',
      key: 'numden',
      render: (_, m) =>
        m.numerador == null ? '—' : `${m.numerador} / ${m.denominador}`,
    },
    { title: 'Valor', dataIndex: 'valor', width: 90, render: (v: number) => fmt(v) },
    {
      title: 'Resultado',
      dataIndex: 'semaforo',
      width: 110,
      render: (s: Medicion['semaforo']) => <SemaforoDot estado={semEstado(s)} />,
    },
    {
      title: 'Tendencia',
      dataIndex: 'tendencia',
      width: 100,
      render: (t: string) => <IconoTendencia t={t} />,
    },
    {
      title: 'Análisis',
      key: 'analisis',
      render: (_, m) =>
        m.analisis ? (
          <Text ellipsis style={{ maxWidth: 260 }}>
            {m.analisis}
          </Text>
        ) : m.requiereAnalisis ? (
          <Tag color="gold">Pendiente</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '',
      key: 'acc',
      width: 160,
      render: (_, m) => (
        <Space>
          {puede.analizar && (m.requiereAnalisis || m.analisis) && (
            <Button size="small" onClick={() => setAnalizando(m)}>
              {m.analisis ? 'Editar análisis' : 'Analizar'}
            </Button>
          )}
          {puede.capturar && (
            <Button
              size="small"
              danger
              onClick={() =>
                modal.confirm({
                  title: `Eliminar la medición de ${m.etiqueta}`,
                  okText: 'Eliminar',
                  okButtonProps: { danger: true },
                  onOk: () => eliminar.mutateAsync(m.id),
                })
              }
            >
              Eliminar
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: <Link to="/indicadores">Indicadores</Link> }, { title: ind.codigo }]}
      />

      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space align="start">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/indicadores')} />
          <div>
            <Space align="center" size={8}>
              <SemaforoDot estado={semEstado(alerta.ultimoSemaforo)} size={14} />
              <Title level={4} style={{ margin: 0 }}>
                {ind.nombre}
              </Title>
            </Space>
            <Space size={6} wrap style={{ marginTop: 4 }}>
              <Tag>{ind.codigo}</Tag>
              <Link to={`/procesos/${ind.proceso.id}`}>
                <Tag color="blue">{ind.proceso.codigo}</Tag>
              </Link>
              <Tag>{ETIQUETA_FRECUENCIA[ind.frecuencia]}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Meta {fmt(ind.meta)} · {ind.sentido === 'CRECIENTE' ? 'más es mejor' : 'menos es mejor'}
              </Text>
            </Space>
          </div>
        </Space>
        <Space wrap>
          {puede.capturar && (
            <Button type="primary" onClick={() => setRegistrar(true)}>
              Registrar medición
            </Button>
          )}
          {puede.editar && <Button onClick={() => setEditar(true)}>Editar</Button>}
          {puede.archivar && (
            <Button danger={ind.activo} onClick={() => archivar.mutate(ind.activo)}>
              {ind.activo ? 'Archivar' : 'Desarchivar'}
            </Button>
          )}
        </Space>
      </Flex>

      {(alerta.capturaPendiente || alerta.periodosVencidos > 0 || alerta.reincidente) && (
        <Alert
          type={alerta.reincidente ? 'error' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
          message={[
            alerta.capturaPendiente && 'Falta capturar el periodo actual',
            alerta.periodosVencidos > 0 && `${alerta.periodosVencidos} periodo(s) anteriores sin capturar`,
            alerta.reincidente && 'El indicador lleva 3 periodos fuera de meta',
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      )}

      <Tabs
        items={[
          {
            key: 'tendencia',
            label: 'Tendencia',
            children: (
              <>
                <TendenciaChart mediciones={mediciones} meta={ind.meta} unidad={ind.unidad} />
                {mediciones.length > 0 && (
                  <Paragraph type="secondary" style={{ marginTop: 12 }}>
                    Consolidado del año: promedio{' '}
                    {fmt(
                      Math.round(
                        (mediciones
                          .filter((m) => m.anio === new Date().getFullYear())
                          .reduce((s, m) => s + m.valor, 0) /
                          Math.max(1, mediciones.filter((m) => m.anio === new Date().getFullYear()).length)) *
                          100,
                      ) / 100,
                    )}
                  </Paragraph>
                )}
              </>
            ),
          },
          {
            key: 'mediciones',
            label: `Mediciones (${mediciones.length})`,
            children: (
              <Table<Medicion>
                rowKey="id"
                size="small"
                columns={columnas}
                dataSource={[...mediciones].reverse()}
                pagination={false}
                scroll={{ x: 900 }}
                expandable={{
                  expandedRowRender: (m) => (
                    <Space direction="vertical" size={4}>
                      {m.analisis && (
                        <div>
                          <Text strong>Análisis: </Text>
                          {m.analisis}
                        </div>
                      )}
                      {m.planAccion && (
                        <div>
                          <Text strong>Plan de acción: </Text>
                          {m.planAccion}
                        </div>
                      )}
                      {m.evidenciaUrl && (
                        <a href={m.evidenciaUrl} target="_blank" rel="noreferrer">
                          Evidencia
                        </a>
                      )}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Capturado {dayjs(m.capturadoAt).format('DD/MM/YYYY HH:mm')}
                      </Text>
                    </Space>
                  ),
                  rowExpandable: (m) => !!(m.analisis || m.planAccion || m.evidenciaUrl),
                }}
              />
            ),
          },
          {
            key: 'definicion',
            label: 'Definición',
            children: (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Objetivo">{ind.objetivo}</Descriptions.Item>
                <Descriptions.Item label="Fórmula">{ind.formula}</Descriptions.Item>
                <Descriptions.Item label="Cálculo">
                  {ind.usaNumeradorDenominador
                    ? `Numerador / denominador${ind.expresarPorcentaje ? ' × 100' : ''}`
                    : 'Valor directo'}
                </Descriptions.Item>
                <Descriptions.Item label="Unidad">{ind.unidad}</Descriptions.Item>
                <Descriptions.Item label="Meta / umbral amarillo">
                  {fmt(ind.meta)}
                  {ind.umbralAmarillo != null ? ` / ${fmt(ind.umbralAmarillo)}` : ''}
                </Descriptions.Item>
                <Descriptions.Item label="Frecuencia">{ETIQUETA_FRECUENCIA[ind.frecuencia]}</Descriptions.Item>
                <Descriptions.Item label="Fuente de datos">
                  {ind.fuenteDatos ?? <Text type="secondary">Sin especificar</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Responsable de captura">
                  {ind.responsableCaptura?.nombre ?? <Text type="secondary">Sin asignar</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Responsable de análisis">
                  {ind.responsableAnalisis?.nombre ?? <Text type="secondary">Sin asignar</Text>}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
        ]}
      />

      {editar && (
        <IndicadorFormModal
          indicador={ind}
          onClose={() => setEditar(false)}
          onGuardado={() => {
            setEditar(false)
            refrescar()
          }}
        />
      )}
      {registrar && (
        <RegistrarMedicionModal
          detalle={data}
          onClose={() => setRegistrar(false)}
          onGuardado={() => {
            setRegistrar(false)
            refrescar()
          }}
        />
      )}
      {analizando && (
        <AnalizarModal
          indicadorId={id}
          medicion={analizando}
          onClose={() => setAnalizando(null)}
          onGuardado={() => {
            setAnalizando(null)
            refrescar()
          }}
        />
      )}
    </>
  )
}

function AnalizarModal({
  indicadorId,
  medicion,
  onClose,
  onGuardado,
}: {
  indicadorId: string
  medicion: Medicion
  onClose: () => void
  onGuardado: () => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const guardar = useMutation({
    mutationFn: (v: { analisis: string; planAccion?: string }) =>
      indicadoresApi.analizarMedicion(indicadorId, medicion.id, v),
    onSuccess: () => {
      message.success('Análisis registrado')
      onGuardado()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <Modal
      open
      title={`Análisis · ${medicion.etiqueta}`}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ analisis: medicion.analisis ?? '', planAccion: medicion.planAccion ?? '' }}
        onFinish={(v) => guardar.mutate(v)}
      >
        <Form.Item
          name="analisis"
          label="Causa del resultado fuera de meta"
          rules={[{ required: true, min: 3, message: 'Describe la causa' }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="planAccion" label="Plan de acción (opcional)">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
