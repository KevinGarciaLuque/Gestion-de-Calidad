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
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { ETIQUETA_CLASIFICACION, ETIQUETA_ESTADO_HALLAZGO } from '@/features/hallazgos/hallazgosApi'
import { AuditoriaFormModal } from './AuditoriaFormModal'
import { ChecklistTab } from './ChecklistTab'
import { auditoriasApi, ETIQUETA_ESTADO_AUD } from './auditoriasApi'

const { Title, Text, Paragraph } = Typography

export function AuditoriaDetallePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { message, modal } = App.useApp()
  const [editar, setEditar] = useState(false)
  const [resumen, setResumen] = useState<string | undefined>()
  const [conclusiones, setConclusiones] = useState<string | undefined>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auditoria', id],
    queryFn: () => auditoriasApi.obtener(id),
  })

  const refrescar = () => {
    void qc.invalidateQueries({ queryKey: ['auditoria', id] })
    void qc.invalidateQueries({ queryKey: ['programa-auditoria'] })
    void qc.invalidateQueries({ queryKey: ['hallazgos'] })
  }
  const run = (p: Promise<unknown>) => p.then(refrescar).catch((e) => message.error(mensajeDeError(e)))

  const guardarInforme = useMutation({
    mutationFn: () =>
      auditoriasApi.editarInforme(id, {
        resumen: resumen ?? data?.auditoria.informeResumen ?? undefined,
        conclusiones: conclusiones ?? data?.auditoria.informeConclusiones ?? undefined,
      }),
    onSuccess: () => {
      message.success('Informe guardado')
      refrescar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (isLoading) return <Spin />
  if (isError || !data) return <Text type="danger">No se pudo cargar la auditoría.</Text>

  const a = data.auditoria
  const puede = data.puede

  const acciones: React.ReactNode[] = []
  if (puede.planificar && ['PLANIFICADA', 'EN_CURSO'].includes(a.estado)) {
    acciones.push(
      <Button key="e" onClick={() => setEditar(true)}>
        Editar plan
      </Button>,
      <Button
        key="rp"
        onClick={() => {
          let fecha = ''
          let motivo = ''
          modal.confirm({
            title: 'Reprogramar auditoría',
            content: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input type="date" onChange={(e) => (fecha = e.target.value)} />
                <Input.TextArea rows={2} placeholder="Motivo" onChange={(e) => (motivo = e.target.value)} />
              </Space>
            ),
            okText: 'Reprogramar',
            onOk: () => run(auditoriasApi.reprogramar(id, new Date(fecha).toISOString(), motivo)),
          })
        }}
      >
        Reprogramar
      </Button>,
    )
  }
  if (puede.aprobarInforme && a.estado === 'EJECUTADA') {
    acciones.push(
      <Button key="ai" type="primary" onClick={() => modal.confirm({ title: 'Aprobar el informe de auditoría', onOk: () => run(auditoriasApi.aprobarInforme(id)) })}>
        Aprobar informe
      </Button>,
    )
  }
  if (puede.cerrar && a.estado === 'INFORME_APROBADO') {
    acciones.push(
      <Button key="c" type="primary" onClick={() => modal.confirm({ title: 'Cerrar la auditoría', content: 'Todos los hallazgos deben tener responsable.', onOk: () => run(auditoriasApi.cerrar(id)) })}>
        Cerrar auditoría
      </Button>,
    )
  }
  if (puede.cerrar && ['PLANIFICADA', 'EN_CURSO'].includes(a.estado)) {
    acciones.push(
      <Button
        key="cx"
        danger
        onClick={() => {
          let motivo = ''
          modal.confirm({
            title: 'Cancelar auditoría',
            content: <Input.TextArea rows={2} placeholder="Motivo" onChange={(e) => (motivo = e.target.value)} />,
            okText: 'Cancelar auditoría',
            onOk: () => run(auditoriasApi.cancelar(id, motivo)),
          })
        }}
      >
        Cancelar
      </Button>,
    )
  }

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: <Link to="/auditorias">Auditorías</Link> }, { title: a.codigo }]}
      />

      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space align="start">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/auditorias')} />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {a.codigo}
            </Title>
            <Space size={6} wrap style={{ marginTop: 4 }}>
              <Tag>{a.tipo === 'INTERNA' ? 'Interna' : a.tipo === 'EXTERNA' ? 'Externa' : 'Seguimiento'}</Tag>
              {a.proceso && (
                <Link to={`/procesos/${a.proceso.id}`}>
                  <Tag color="blue">{a.proceso.codigo}</Tag>
                </Link>
              )}
              <Tag color={a.estado === 'CERRADA' ? 'success' : a.estado === 'CANCELADA' ? 'error' : 'default'}>
                {ETIQUETA_ESTADO_AUD[a.estado]}
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Planificada: {dayjs(a.fechaPlanificada).format('DD/MM/YYYY')}
              </Text>
            </Space>
          </div>
        </Space>
        <Space wrap>{acciones}</Space>
      </Flex>

      <Tabs
        items={[
          {
            key: 'plan',
            label: 'Plan',
            children: (
              <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                <Descriptions.Item label="Objetivo" span={2}>
                  {a.objetivo}
                </Descriptions.Item>
                <Descriptions.Item label="Alcance" span={2}>
                  {a.alcance}
                </Descriptions.Item>
                <Descriptions.Item label="Criterios" span={2}>
                  {a.criterios}
                </Descriptions.Item>
                <Descriptions.Item label="Auditor líder">{a.auditorLider?.nombre ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Equipo">
                  {a.equipo.length ? a.equipo.map((e) => e.nombre).join(', ') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Inicio real">
                  {a.fechaInicioReal ? dayjs(a.fechaInicioReal).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Fin real">
                  {a.fechaFinReal ? dayjs(a.fechaFinReal).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                {a.reprogramaciones.length > 0 && (
                  <Descriptions.Item label="Reprogramaciones" span={2}>
                    {a.reprogramaciones.map((r, i) => (
                      <div key={i}>
                        {dayjs(r.fechaAnterior).format('DD/MM/YY')} → {dayjs(r.fechaNueva).format('DD/MM/YY')}: {r.motivo}
                      </div>
                    ))}
                  </Descriptions.Item>
                )}
              </Descriptions>
            ),
          },
          {
            key: 'checklist',
            label: `Checklist (${data.checklist.length})`,
            children: <ChecklistTab detalle={data} onCambio={refrescar} />,
          },
          {
            key: 'hallazgos',
            label: `Hallazgos (${data.hallazgos.length})`,
            children: (
              <Table
                rowKey="id"
                size="small"
                scroll={{ x: 'max-content' }}
                dataSource={data.hallazgos}
                pagination={false}
                onRow={(r) => ({ onClick: () => navigate(`/hallazgos/${r.id}`), style: { cursor: 'pointer' } })}
                columns={[
                  { title: 'Código', dataIndex: 'codigo', width: 120 },
                  { title: 'Descripción', dataIndex: 'descripcion' },
                  {
                    title: 'Clasificación',
                    dataIndex: 'clasificacion',
                    width: 180,
                    render: (c: keyof typeof ETIQUETA_CLASIFICACION) => ETIQUETA_CLASIFICACION[c],
                  },
                  {
                    title: 'Estado',
                    dataIndex: 'estado',
                    width: 130,
                    render: (e: keyof typeof ETIQUETA_ESTADO_HALLAZGO) => <Tag>{ETIQUETA_ESTADO_HALLAZGO[e]}</Tag>,
                  },
                  { title: 'Responsable', dataIndex: ['responsable', 'nombre'], render: (v: string) => v ?? '—' },
                ]}
              />
            ),
          },
          {
            key: 'informe',
            label: 'Informe',
            children: (
              <>
                {['PENDIENTE', 'PLANIFICADA', 'EN_CURSO'].includes(a.estado) ? (
                  <Text type="secondary">El informe se genera al finalizar la ejecución.</Text>
                ) : (
                  <>
                    <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="Criterios evaluados">{data.resumen.total}</Descriptions.Item>
                      <Descriptions.Item label="Conformidad">
                        {data.resumen.cumplimiento != null ? `${data.resumen.cumplimiento}%` : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="No conformidades">
                        {data.resumen.hallazgos.mayores} mayores · {data.resumen.hallazgos.menores} menores
                      </Descriptions.Item>
                      <Descriptions.Item label="Observaciones / oportunidades">
                        {data.resumen.hallazgos.observaciones} / {data.resumen.hallazgos.oportunidades}
                      </Descriptions.Item>
                      <Descriptions.Item label="Informe aprobado" span={2}>
                        {a.informeAprobadoAt ? dayjs(a.informeAprobadoAt).format('DD/MM/YYYY HH:mm') : 'Pendiente'}
                      </Descriptions.Item>
                    </Descriptions>

                    {puede.ejecutar && a.estado === 'EJECUTADA' ? (
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div>
                          <Text strong>Resumen</Text>
                          <Input.TextArea
                            rows={4}
                            defaultValue={a.informeResumen ?? ''}
                            onChange={(e) => setResumen(e.target.value)}
                          />
                        </div>
                        <div>
                          <Text strong>Conclusiones</Text>
                          <Input.TextArea
                            rows={4}
                            defaultValue={a.informeConclusiones ?? ''}
                            onChange={(e) => setConclusiones(e.target.value)}
                          />
                        </div>
                        <Button type="primary" onClick={() => guardarInforme.mutate()} loading={guardarInforme.isPending}>
                          Guardar informe
                        </Button>
                      </Space>
                    ) : (
                      <>
                        <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                          <Text strong>Resumen: </Text>
                          {a.informeResumen ?? '—'}
                        </Paragraph>
                        {a.informeConclusiones && (
                          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                            <Text strong>Conclusiones: </Text>
                            {a.informeConclusiones}
                          </Paragraph>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ),
          },
        ]}
      />

      {editar && (
        <AuditoriaFormModal
          auditoria={a}
          anio={a.programa?.anio ?? new Date().getFullYear()}
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
