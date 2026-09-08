import { useState } from 'react'
import {
  App,
  Button,
  Card,
  Checkbox,
  Flex,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusOutlined } from '@ant-design/icons'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { rolesApi, type Rol } from './rolesApi'

const { Title, Text, Paragraph } = Typography

export function RolesPage() {
  const { message, modal } = App.useApp()
  const qc = useQueryClient()
  const { puede } = useAuth()

  const [editando, setEditando] = useState<Rol | null>(null)
  const [crearAbierto, setCrearAbierto] = useState(false)
  const [form] = Form.useForm<{ codigo: string; nombre: string; descripcion?: string }>()

  const { data: roles, isFetching } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.listar })
  const { data: catalogo } = useQuery({
    queryKey: ['permisos'],
    queryFn: rolesApi.catalogoPermisos,
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['roles'] })

  const crear = useMutation({
    mutationFn: (v: { codigo: string; nombre: string; descripcion?: string }) => rolesApi.crear(v),
    onSuccess: () => {
      message.success('Rol creado')
      setCrearAbierto(false)
      form.resetFields()
      invalidar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const eliminar = useMutation({
    mutationFn: (codigo: string) => rolesApi.eliminar(codigo),
    onSuccess: () => {
      message.success('Rol eliminado')
      invalidar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Roles y permisos
          </Title>
          <Text type="secondary">Qué puede hacer cada rol en el sistema</Text>
        </div>
        {puede('roles.crear') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrearAbierto(true)}>
            Nuevo rol
          </Button>
        )}
      </Flex>

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {(roles ?? []).map((rol) => (
          <Card key={rol.codigo} loading={isFetching} size="small">
            <Flex justify="space-between" align="flex-start" wrap gap={12}>
              <div style={{ maxWidth: 620 }}>
                <Space>
                  <Text strong>{rol.nombre}</Text>
                  <Tag>{rol.codigo}</Tag>
                  {rol.esSistema && <Tag color="geekblue">Sistema</Tag>}
                  {!rol.activo && <Tag color="red">Inactivo</Tag>}
                </Space>
                <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                  {rol.descripcion}
                </Paragraph>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {rol.permisos.length} permisos · {rol.usuariosAsignados} usuarios
                </Text>
              </div>
              <Space>
                {puede('roles.asignar_permisos') && (
                  <Button onClick={() => setEditando(rol)}>Permisos</Button>
                )}
                {puede('roles.eliminar') && !rol.esSistema && (
                  <Button
                    danger
                    onClick={() =>
                      modal.confirm({
                        title: `Eliminar el rol ${rol.nombre}`,
                        content: 'Solo se puede eliminar si no está asignado a ningún usuario.',
                        okText: 'Eliminar',
                        okButtonProps: { danger: true },
                        onOk: () => eliminar.mutateAsync(rol.codigo),
                      })
                    }
                  >
                    Eliminar
                  </Button>
                )}
              </Space>
            </Flex>
          </Card>
        ))}
      </Space>

      {editando && catalogo && (
        <EditarPermisosModal
          rol={editando}
          catalogo={catalogo}
          onClose={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            invalidar()
          }}
        />
      )}

      <Modal
        title="Nuevo rol"
        open={crearAbierto}
        onCancel={() => setCrearAbierto(false)}
        onOk={() => form.submit()}
        okText="Crear"
        confirmLoading={crear.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => crear.mutate(v)}>
          <Form.Item
            name="codigo"
            label="Código"
            rules={[
              { required: true, message: 'Ingresa un código' },
              {
                pattern: /^[A-Z][A-Z0-9_]{2,39}$/,
                message: 'MAYÚSCULAS, números y guion bajo (ej. RESP_FARMACIA)',
              },
            ]}
          >
            <Input placeholder="RESP_FARMACIA" />
          </Form.Item>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, min: 3 }]}>
            <Input placeholder="Responsable de Farmacia" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function EditarPermisosModal({
  rol,
  catalogo,
  onClose,
  onGuardado,
}: {
  rol: Rol
  catalogo: { modulo: string; permisos: { codigo: string; descripcion: string }[] }[]
  onClose: () => void
  onGuardado: () => void
}) {
  const { message } = App.useApp()
  const [seleccion, setSeleccion] = useState<string[]>(rol.permisos)

  const guardar = useMutation({
    mutationFn: () => rolesApi.fijarPermisos(rol.codigo, seleccion),
    onSuccess: () => {
      message.success('Permisos actualizados')
      onGuardado()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const toggleModulo = (codigos: string[], marcar: boolean) => {
    setSeleccion((prev) =>
      marcar ? [...new Set([...prev, ...codigos])] : prev.filter((c) => !codigos.includes(c)),
    )
  }

  return (
    <Modal
      open
      title={`Permisos · ${rol.nombre}`}
      onCancel={onClose}
      onOk={() => guardar.mutate()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
      width={620}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {catalogo.map((m) => {
          const codigos = m.permisos.map((p) => p.codigo)
          const todos = codigos.every((c) => seleccion.includes(c))
          return (
            <div key={m.modulo}>
              <Checkbox
                checked={todos}
                indeterminate={!todos && codigos.some((c) => seleccion.includes(c))}
                onChange={(e) => toggleModulo(codigos, e.target.checked)}
              >
                <Text strong style={{ textTransform: 'capitalize' }}>
                  {m.modulo}
                </Text>
              </Checkbox>
              <div style={{ paddingLeft: 24, marginTop: 4 }}>
                <Checkbox.Group
                  value={seleccion.filter((c) => codigos.includes(c))}
                  onChange={(vals) =>
                    setSeleccion((prev) => [
                      ...prev.filter((c) => !codigos.includes(c)),
                      ...(vals as string[]),
                    ])
                  }
                  options={m.permisos.map((p) => ({ label: p.descripcion, value: p.codigo }))}
                />
              </div>
            </div>
          )
        })}
      </Space>
    </Modal>
  )
}
