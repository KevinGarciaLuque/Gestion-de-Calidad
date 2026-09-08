import { Button, Card, Form, Input, InputNumber, Select, Space } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { FormListFieldData } from 'antd/es/form/FormList'
import { ETIQUETA_TIPO_RECURSO, type FichaPayload, type TipoRecurso } from './procesosApi'

interface Props {
  inicial: FichaPayload
  guardando: boolean
  onGuardar: (v: FichaPayload) => void
  onCancelar: () => void
}

const columnasTexto = (campos: FormListFieldData[], remove: (i: number) => void, defs: {
  name: string
  placeholder: string
  requerido?: boolean
  ancho?: number
}[]) =>
  campos.map(({ key, name }) => (
    <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 4 }} wrap>
      {defs.map((d) => (
        <Form.Item
          key={d.name}
          name={[name, d.name]}
          rules={d.requerido ? [{ required: true, message: 'Requerido' }] : undefined}
          style={{ marginBottom: 0 }}
        >
          <Input placeholder={d.placeholder} style={{ width: d.ancho ?? 200 }} />
        </Form.Item>
      ))}
      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
    </Space>
  ))

export function FichaEditor({ inicial, guardando, onGuardar, onCancelar }: Props) {
  const [form] = Form.useForm<FichaPayload>()

  return (
    <Form<FichaPayload>
      form={form}
      layout="vertical"
      initialValues={inicial}
      onFinish={(v) =>
        onGuardar({
          ...v,
          entradas: v.entradas ?? [],
          actividades: (v.actividades ?? []).map((a, i) => ({ ...a, orden: a.orden ?? i + 1 })),
          salidas: v.salidas ?? [],
          recursos: v.recursos ?? [],
        })
      }
    >
      <Card size="small" title="Propósito y alcance" style={{ marginBottom: 12 }}>
        <Form.Item
          name="alcance"
          label="Alcance del proceso"
          rules={[{ required: true, message: 'Describe el alcance' }]}
        >
          <Input.TextArea rows={3} placeholder="Dónde empieza y termina el proceso, qué incluye y qué no." />
        </Form.Item>
      </Card>

      <Card size="small" title="Entradas" style={{ marginBottom: 12 }}>
        <Form.List name="entradas">
          {(campos, { add, remove }) => (
            <>
              {columnasTexto(campos, remove, [
                { name: 'proveedor', placeholder: 'Proveedor', requerido: true },
                { name: 'insumo', placeholder: 'Insumo / entrada', requerido: true, ancho: 240 },
                { name: 'requisitos', placeholder: 'Requisitos', ancho: 240 },
              ])}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                Agregar entrada
              </Button>
            </>
          )}
        </Form.List>
      </Card>

      <Card size="small" title="Actividades" style={{ marginBottom: 12 }}>
        <Form.List name="actividades">
          {(campos, { add, remove }) => (
            <>
              {campos.map(({ key, name }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 4 }} wrap>
                  <Form.Item name={[name, 'orden']} style={{ marginBottom: 0 }}>
                    <InputNumber min={1} placeholder="#" style={{ width: 60 }} />
                  </Form.Item>
                  <Form.Item
                    name={[name, 'actividad']}
                    rules={[{ required: true, message: 'Requerido' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Actividad" style={{ width: 260 }} />
                  </Form.Item>
                  <Form.Item name={[name, 'responsable']} style={{ marginBottom: 0 }}>
                    <Input placeholder="Responsable" style={{ width: 160 }} />
                  </Form.Item>
                  <Form.Item name={[name, 'puntoControl']} style={{ marginBottom: 0 }}>
                    <Input placeholder="Punto de control" style={{ width: 200 }} />
                  </Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                </Space>
              ))}
              <Button
                type="dashed"
                onClick={() => add({ orden: campos.length + 1 })}
                icon={<PlusOutlined />}
                block
              >
                Agregar actividad
              </Button>
            </>
          )}
        </Form.List>
      </Card>

      <Card size="small" title="Salidas" style={{ marginBottom: 12 }}>
        <Form.List name="salidas">
          {(campos, { add, remove }) => (
            <>
              {columnasTexto(campos, remove, [
                { name: 'salida', placeholder: 'Producto / servicio / salida', requerido: true, ancho: 240 },
                { name: 'registro', placeholder: 'Registro', ancho: 180 },
                { name: 'cliente', placeholder: 'Cliente interno/externo', ancho: 200 },
              ])}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                Agregar salida
              </Button>
            </>
          )}
        </Form.List>
      </Card>

      <Card size="small" title="Recursos" style={{ marginBottom: 12 }}>
        <Form.List name="recursos">
          {(campos, { add, remove }) => (
            <>
              {campos.map(({ key, name }) => (
                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 4 }} wrap>
                  <Form.Item
                    name={[name, 'tipo']}
                    rules={[{ required: true, message: 'Requerido' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      placeholder="Tipo"
                      style={{ width: 170 }}
                      options={(Object.keys(ETIQUETA_TIPO_RECURSO) as TipoRecurso[]).map((t) => ({
                        value: t,
                        label: ETIQUETA_TIPO_RECURSO[t],
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[name, 'detalle']}
                    rules={[{ required: true, message: 'Requerido' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Detalle" style={{ width: 320 }} />
                  </Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                </Space>
              ))}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                Agregar recurso
              </Button>
            </>
          )}
        </Form.List>
      </Card>

      <Form.Item name="notas" label="Notas (opcional)">
        <Input.TextArea rows={2} />
      </Form.Item>

      <Space>
        <Button type="primary" htmlType="submit" loading={guardando}>
          Guardar borrador
        </Button>
        <Button onClick={onCancelar}>Cancelar</Button>
      </Space>
    </Form>
  )
}
