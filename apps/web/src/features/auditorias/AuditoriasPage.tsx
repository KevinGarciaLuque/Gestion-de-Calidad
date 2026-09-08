import { useState } from 'react'
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { AuditoriaFormModal } from './AuditoriaFormModal'
import {
  auditoriasApi,
  ETIQUETA_ESTADO_AUD,
  type AuditoriaResumen,
  type EstadoAuditoria,
} from './auditoriasApi'

const { Title, Text, Paragraph } = Typography

const COLOR_ESTADO: Record<EstadoAuditoria, string> = {
  PLANIFICADA: 'default',
  EN_CURSO: 'processing',
  EJECUTADA: 'blue',
  INFORME_APROBADO: 'green',
  CERRADA: 'success',
  CANCELADA: 'error',
}

export function AuditoriasPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { puede } = useAuth()
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [crearAud, setCrearAud] = useState(false)
  const [crearProg, setCrearProg] = useState(false)
  const [formProg] = Form.useForm()

  const { data, isFetching } = useQuery({
    queryKey: ['programa-auditoria', anio],
    queryFn: () => auditoriasApi.programa(anio),
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['programa-auditoria'] })

  const crearPrograma = useMutation({
    mutationFn: (v: { nombre: string; objetivo?: string }) => auditoriasApi.crearPrograma({ anio, ...v }),
    onSuccess: () => {
      message.success('Programa creado')
      setCrearProg(false)
      formProg.resetFields()
      invalidar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const aprobarPrograma = useMutation({
    mutationFn: () => auditoriasApi.aprobarPrograma(data!.programa!.id),
    onSuccess: () => {
      message.success('Programa aprobado')
      invalidar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const columnas: ColumnsType<AuditoriaResumen> = [
    {
      title: 'Auditoría',
      dataIndex: 'objetivo',
      render: (o: string, a) => (
        <Space direction="vertical" size={0}>
          <Text strong>{a.codigo}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {a.tipo === 'INTERNA' ? 'Interna' : a.tipo === 'EXTERNA' ? 'Externa' : 'Seguimiento'} ·{' '}
            {a.proceso?.codigo ?? a.area?.nombre ?? 'General'} · {o.slice(0, 60)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaPlanificada',
      width: 120,
      render: (v: string, a) => (
        <Space direction="vertical" size={0}>
          <span>{dayjs(v).format('DD/MM/YYYY')}</span>
          {a.vencida && <Tag color="volcano">Vencida</Tag>}
        </Space>
      ),
    },
    { title: 'Líder', dataIndex: ['auditorLider', 'nombre'], width: 140, render: (v: string) => v ?? '—' },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 150,
      render: (e: EstadoAuditoria) => <Tag color={COLOR_ESTADO[e]}>{ETIQUETA_ESTADO_AUD[e]}</Tag>,
    },
    {
      title: 'Resultado',
      key: 'r',
      width: 150,
      render: (_, a) => (
        <Space direction="vertical" size={0}>
          {a.cumplimiento != null && <span>{a.cumplimiento}% conformidad</span>}
          {a.hallazgosAbiertos > 0 && <Tag color="gold">{a.hallazgosAbiertos} hallazgo(s) abiertos</Tag>}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Auditorías
          </Title>
          <Text type="secondary">Programa anual, planes, ejecución e informes</Text>
        </div>
        <Space>
          <InputNumber value={anio} onChange={(v) => setAnio(v ?? new Date().getFullYear())} min={2020} max={2100} />
          {data && puede('auditorias.planificar') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrearAud(true)} disabled={!data.programa}>
              Nueva auditoría
            </Button>
          )}
        </Space>
      </Flex>

      <Card loading={isFetching} style={{ marginBottom: 16 }}>
        {!data?.programa ? (
          <Flex justify="space-between" align="center" wrap gap={12}>
            <Text type="secondary">No hay un programa de auditorías para {anio}.</Text>
            {puede('auditorias.planificar') && (
              <Button onClick={() => setCrearProg(true)}>Crear programa {anio}</Button>
            )}
          </Flex>
        ) : (
          <Flex justify="space-between" align="flex-start" wrap gap={12}>
            <div>
              <Space>
                <Text strong>{data.programa.nombre}</Text>
                <Tag color={data.programa.estado === 'APROBADO' ? 'green' : 'default'}>
                  {data.programa.estado === 'APROBADO' ? 'Aprobado' : 'Borrador'}
                </Tag>
              </Space>
              {data.programa.objetivo && (
                <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                  {data.programa.objetivo}
                </Paragraph>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {data.auditorias.length} auditoría(s)
              </Text>
            </div>
            {data.programa.estado !== 'APROBADO' && puede('auditorias.planificar') && (
              <Button onClick={() => aprobarPrograma.mutate()} loading={aprobarPrograma.isPending}>
                Aprobar programa
              </Button>
            )}
          </Flex>
        )}
      </Card>

      <Table<AuditoriaResumen>
        rowKey="id"
        columns={columnas}
        dataSource={data?.auditorias}
        loading={isFetching}
        onRow={(r) => ({ onClick: () => navigate(`/auditorias/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={false}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin auditorías" /> }}
        scroll={{ x: 900 }}
      />

      {crearAud && data?.programa && (
        <AuditoriaFormModal
          anio={anio}
          programaId={data.programa.id}
          onClose={() => setCrearAud(false)}
          onGuardado={(id) => {
            setCrearAud(false)
            navigate(`/auditorias/${id}`)
          }}
        />
      )}

      <Modal
        title={`Crear programa de auditorías ${anio}`}
        open={crearProg}
        onCancel={() => setCrearProg(false)}
        onOk={() => formProg.submit()}
        okText="Crear"
        confirmLoading={crearPrograma.isPending}
        destroyOnClose
      >
        <Form form={formProg} layout="vertical" onFinish={(v) => crearPrograma.mutate(v)}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, min: 3 }]} initialValue={`Programa Anual de Auditorías Internas ${anio}`}>
            <Input />
          </Form.Item>
          <Form.Item name="objetivo" label="Objetivo">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
