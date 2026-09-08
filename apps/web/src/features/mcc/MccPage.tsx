import { useState } from 'react'
import { App, Button, Flex, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import {
  ETIQUETA_ESTADO_MCC,
  ETIQUETA_ORIGEN_MCC,
  mccApi,
  type EstadoMCC,
  type MccFila,
  type OrigenMCC,
} from './mccApi'

const { Title, Text } = Typography

const COLOR_ESTADO: Record<EstadoMCC, string> = {
  NUEVO: 'blue',
  EN_REVISION: 'processing',
  ACEPTADO: 'cyan',
  NO_PROCEDE: 'default',
  EN_EJECUCION: 'gold',
  VERIFICACION: 'purple',
  CERRADO: 'success',
}

export function MccPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { puede } = useAuth()
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<EstadoMCC | undefined>()
  const [pagina, setPagina] = useState(1)
  const [crear, setCrear] = useState(false)
  const [form] = Form.useForm()

  const { data, isFetching } = useQuery({
    queryKey: ['mcc', { q, estado, pagina }],
    queryFn: () => mccApi.listar({ q: q || undefined, estado, pagina }),
  })

  const crearMcc = useMutation({
    mutationFn: (v: { titulo: string; descripcion: string; origen: OrigenMCC; origenDetalle?: string }) => mccApi.crear(v),
    onSuccess: (det) => {
      message.success('Propuesta registrada')
      setCrear(false)
      form.resetFields()
      void qc.invalidateQueries({ queryKey: ['mcc'] })
      navigate(`/mcc/${det.registro.id}`)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const columnas: ColumnsType<MccFila> = [
    {
      title: 'Propuesta',
      dataIndex: 'titulo',
      render: (t: string, m) => (
        <Space direction="vertical" size={0}>
          <Text strong>{t}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {m.codigo} · {ETIQUETA_ORIGEN_MCC[m.origen]}
            {m.propuestoPor ? ` · ${m.propuestoPor.nombre}` : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 130,
      render: (e: EstadoMCC) => <Tag color={COLOR_ESTADO[e]}>{ETIQUETA_ESTADO_MCC[e]}</Tag>,
    },
    {
      title: 'Acciones',
      key: 'a',
      width: 100,
      render: (_, m) => (m.accionesTotal ? `${m.accionesCerradas}/${m.accionesTotal}` : '—'),
    },
    {
      title: 'Registrado',
      dataIndex: 'creadoAt',
      width: 120,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Mejora continua (MCC)
          </Title>
          <Text type="secondary">Propuestas de mejora de colaboradores, áreas, encuestas y comités</Text>
        </div>
        {puede('mcc.crear') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrear(true)}>
            Proponer mejora
          </Button>
        )}
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Buscar" style={{ maxWidth: 260 }} onSearch={(v) => { setPagina(1); setQ(v) }} />
        <Select allowClear placeholder="Estado" style={{ width: 170 }} value={estado} onChange={(v) => { setPagina(1); setEstado(v) }}
          options={(Object.keys(ETIQUETA_ESTADO_MCC) as EstadoMCC[]).map((e) => ({ value: e, label: ETIQUETA_ESTADO_MCC[e] }))} />
      </Flex>

      <Table<MccFila>
        rowKey="id"
        columns={columnas}
        dataSource={data?.datos}
        loading={isFetching}
        onRow={(r) => ({ onClick: () => navigate(`/mcc/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{ current: pagina, pageSize: data?.porPagina ?? 20, total: data?.total ?? 0, onChange: setPagina, showSizeChanger: false }}
        scroll={{ x: 700 }}
      />

      <Modal
        title="Proponer una mejora"
        open={crear}
        onCancel={() => setCrear(false)}
        onOk={() => form.submit()}
        okText="Enviar propuesta"
        confirmLoading={crearMcc.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ origen: 'COLABORADOR' }} onFinish={(v) => crearMcc.mutate(v)}>
          <Form.Item name="titulo" label="Título" rules={[{ required: true, min: 3 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción de la mejora" rules={[{ required: true, min: 5 }]}>
            <Input.TextArea rows={4} placeholder="Qué se propone mejorar y por qué" />
          </Form.Item>
          <Form.Item name="origen" label="Origen" rules={[{ required: true }]}>
            <Select options={(Object.keys(ETIQUETA_ORIGEN_MCC) as OrigenMCC[]).map((o) => ({ value: o, label: ETIQUETA_ORIGEN_MCC[o] }))} />
          </Form.Item>
          <Form.Item name="origenDetalle" label="Detalle del origen">
            <Input placeholder="Ej. Encuesta de servicio de Farmacia, junio" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
