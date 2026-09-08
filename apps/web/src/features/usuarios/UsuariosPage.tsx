import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Dropdown,
  Flex,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  KeyOutlined,
  MoreOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { usuariosApi, type UsuarioFila } from './usuariosApi'
import { GestionRolesModal } from './GestionRolesModal'

const { Title, Text, Paragraph } = Typography

export function UsuariosPage() {
  const { message, modal } = App.useApp()
  const qc = useQueryClient()
  const { puede } = useAuth()

  const [q, setQ] = useState('')
  const [pagina, setPagina] = useState(1)
  const [crearAbierto, setCrearAbierto] = useState(false)
  const [rolesDe, setRolesDe] = useState<UsuarioFila | null>(null)
  const [form] = Form.useForm<{ email: string; nombre: string }>()

  const { data, isFetching } = useQuery({
    queryKey: ['usuarios', { q, pagina }],
    queryFn: () => usuariosApi.listar({ q: q || undefined, pagina, porPagina: 10 }),
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['usuarios'] })

  const crear = useMutation({
    mutationFn: (v: { email: string; nombre: string }) => usuariosApi.crear(v),
    onSuccess: (res) => {
      setCrearAbierto(false)
      form.resetFields()
      invalidar()
      if (res.passwordTemporal) {
        modal.success({
          title: 'Usuario creado',
          content: (
            <>
              <Paragraph>Entrega esta contraseña temporal al usuario. No se volverá a mostrar.</Paragraph>
              <Input.Search readOnly value={res.passwordTemporal} enterButton="Copiar"
                onSearch={(v) => void navigator.clipboard?.writeText(v)} />
            </>
          ),
        })
      } else {
        message.success('Usuario creado')
      }
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const cambiarEstado = useMutation({
    mutationFn: (u: UsuarioFila) =>
      u.activo ? usuariosApi.desactivar(u.id) : usuariosApi.activar(u.id),
    onSuccess: () => {
      message.success('Estado actualizado')
      invalidar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const resetear = useMutation({
    mutationFn: (u: UsuarioFila) => usuariosApi.resetearPassword(u.id),
    onSuccess: (res) => {
      modal.success({
        title: 'Contraseña restablecida',
        content: (
          <>
            <Paragraph>Nueva contraseña temporal:</Paragraph>
            <Input.Search readOnly value={res.passwordTemporal} enterButton="Copiar"
              onSearch={(v) => void navigator.clipboard?.writeText(v)} />
          </>
        ),
      })
      invalidar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const columnas = useMemo<ColumnsType<UsuarioFila>>(
    () => [
      {
        title: 'Nombre',
        dataIndex: 'nombre',
        render: (nombre: string, u) => (
          <Space direction="vertical" size={0}>
            <Text strong>{nombre}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {u.email}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Roles',
        dataIndex: 'roles',
        render: (roles: UsuarioFila['roles']) =>
          roles.length === 0 ? (
            <Text type="secondary">—</Text>
          ) : (
            <Space size={[0, 4]} wrap>
              {roles.map((r) => (
                <Tag key={r.id} color="blue">
                  {r.rol.nombre}
                  {r.tipoAlcance === 'UNIDAD' && r.unidad ? ` · ${r.unidad.nombre}` : ''}
                </Tag>
              ))}
            </Space>
          ),
      },
      {
        title: 'Estado',
        dataIndex: 'activo',
        width: 110,
        render: (activo: boolean, u) => (
          <Space direction="vertical" size={0}>
            <Tag color={activo ? 'green' : 'red'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
            {u.debeCambiarPassword && (
              <Tooltip title="Debe cambiar su contraseña al ingresar">
                <Tag color="gold">Clave temporal</Tag>
              </Tooltip>
            )}
          </Space>
        ),
      },
      {
        title: 'Último acceso',
        dataIndex: 'ultimoAccesoAt',
        width: 150,
        render: (v: string | null) =>
          v ? dayjs(v).format('DD/MM/YYYY HH:mm') : <Text type="secondary">Nunca</Text>,
      },
      {
        title: '',
        width: 48,
        render: (_: unknown, u) => (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'roles',
                  icon: <SafetyCertificateOutlined />,
                  label: 'Roles y alcance',
                  disabled: !puede('usuarios.asignar_roles'),
                  onClick: () => setRolesDe(u),
                },
                {
                  key: 'reset',
                  icon: <KeyOutlined />,
                  label: 'Restablecer contraseña',
                  disabled: !puede('usuarios.resetear_password'),
                  onClick: () =>
                    modal.confirm({
                      title: `Restablecer la contraseña de ${u.nombre}`,
                      content: 'Se generará una contraseña temporal y se cerrarán sus sesiones.',
                      okText: 'Restablecer',
                      onOk: () => resetear.mutateAsync(u),
                    }),
                },
                { type: 'divider' },
                {
                  key: 'estado',
                  danger: u.activo,
                  label: u.activo ? 'Desactivar' : 'Activar',
                  disabled: !puede('usuarios.activar'),
                  onClick: () => cambiarEstado.mutate(u),
                },
              ],
            }}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        ),
      },
    ],
    [puede, modal, cambiarEstado, resetear],
  )

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Usuarios
          </Title>
          <Text type="secondary">Control de acceso y responsabilidades</Text>
        </div>
        {puede('usuarios.crear') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrearAbierto(true)}>
            Nuevo usuario
          </Button>
        )}
      </Flex>

      <Input.Search
        allowClear
        placeholder="Buscar por nombre o correo"
        style={{ maxWidth: 320, marginBottom: 16 }}
        onSearch={(v) => {
          setPagina(1)
          setQ(v)
        }}
      />

      <Table<UsuarioFila>
        rowKey="id"
        columns={columnas}
        dataSource={data?.datos}
        loading={isFetching}
        pagination={{
          current: pagina,
          pageSize: data?.porPagina ?? 10,
          total: data?.total ?? 0,
          onChange: setPagina,
          showSizeChanger: false,
        }}
        scroll={{ x: 720 }}
      />

      <Modal
        title="Nuevo usuario"
        open={crearAbierto}
        onCancel={() => setCrearAbierto(false)}
        onOk={() => form.submit()}
        okText="Crear"
        confirmLoading={crear.isPending}
        destroyOnClose
      >
        <Paragraph type="secondary">
          Se generará una contraseña temporal que el usuario deberá cambiar al ingresar.
        </Paragraph>
        <Form form={form} layout="vertical" onFinish={(v) => crear.mutate(v)}>
          <Form.Item
            name="nombre"
            label="Nombre completo"
            rules={[{ required: true, min: 3, message: 'Ingresa el nombre' }]}
          >
            <Input autoFocus />
          </Form.Item>
          <Form.Item
            name="email"
            label="Correo institucional"
            rules={[
              { required: true, message: 'Ingresa el correo' },
              { type: 'email', message: 'Correo no válido' },
            ]}
          >
            <Input placeholder="usuario@hospital.org" />
          </Form.Item>
        </Form>
      </Modal>

      {rolesDe && (
        <GestionRolesModal
          usuario={rolesDe}
          onClose={() => setRolesDe(null)}
          onCambio={invalidar}
        />
      )}
    </>
  )
}
