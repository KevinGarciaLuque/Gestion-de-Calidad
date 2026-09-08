import { App, Button, Empty, Form, Input, List, Select, Space, Tag } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/api'
import { procesosApi, type ProcesoDetalle, type TipoRelacion } from './procesosApi'

export function InteraccionesTab({
  detalle,
  onCambio,
}: {
  detalle: ProcesoDetalle
  onCambio: () => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const id = detalle.proceso.id

  const { data: lista } = useQuery({
    queryKey: ['procesos-lista'],
    queryFn: () => procesosApi.listar({ pagina: 1 }),
  })

  const agregar = useMutation({
    mutationFn: (v: { destinoId: string; tipo: TipoRelacion; descripcion?: string }) =>
      procesosApi.agregarRelacion(id, v),
    onSuccess: () => {
      message.success('Relación agregada')
      form.resetFields()
      onCambio()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const quitar = useMutation({
    mutationFn: (relId: string) => procesosApi.quitarRelacion(id, relId),
    onSuccess: () => {
      message.success('Relación eliminada')
      onCambio()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const opciones =
    lista?.datos
      .filter((p) => p.id !== id)
      .map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` })) ?? []

  return (
    <>
      <List
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin interacciones" /> }}
        dataSource={detalle.relaciones}
        renderItem={(r) => (
          <List.Item
            actions={
              detalle.puede.editar && r.sentido === 'saliente'
                ? [
                    <Button
                      key="x"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => quitar.mutate(r.id)}
                    />,
                  ]
                : []
            }
          >
            <Space wrap>
              <Tag color={r.sentido === 'saliente' ? 'blue' : 'default'}>
                {r.sentido === 'saliente' ? 'Entrega a' : 'Recibe de'}
              </Tag>
              <span>
                {r.proceso.codigo} · {r.proceso.nombre}
              </span>
              <Tag>{r.tipo === 'PROVEEDOR' ? 'como proveedor' : 'como cliente'}</Tag>
              {r.descripcion && <span style={{ color: '#888' }}>— {r.descripcion}</span>}
            </Space>
          </List.Item>
        )}
      />

      {detalle.puede.editar && (
        <Form
          form={form}
          layout="inline"
          style={{ marginTop: 16, rowGap: 8, flexWrap: 'wrap' }}
          onFinish={(v) => agregar.mutate(v)}
        >
          <Form.Item name="destinoId" rules={[{ required: true, message: 'Elige un proceso' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Proceso relacionado"
              style={{ width: 260 }}
              options={opciones}
            />
          </Form.Item>
          <Form.Item name="tipo" rules={[{ required: true, message: 'Tipo' }]}>
            <Select
              placeholder="Relación"
              style={{ width: 160 }}
              options={[
                { value: 'PROVEEDOR', label: 'Le entrega (proveedor)' },
                { value: 'CLIENTE', label: 'Le recibe (cliente)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="descripcion">
            <Input placeholder="Descripción del handoff" style={{ width: 220 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={agregar.isPending}>
            Agregar
          </Button>
        </Form>
      )}
    </>
  )
}
