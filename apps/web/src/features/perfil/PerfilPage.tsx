import { App, Button, Card, Descriptions, Form, Input, Space, Tag, Typography } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/features/auth/authApi'
import { useAuthStore } from '@/features/auth/authStore'
import { useAuth } from '@/features/auth/useAuth'
import { mensajeDeError } from '@/lib/api'

const { Title, Text } = Typography

interface FormPassword {
  passwordActual: string
  passwordNueva: string
  repetir: string
}

export function PerfilPage() {
  const { usuario } = useAuth()
  const { message } = App.useApp()
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion)
  const [form] = Form.useForm<FormPassword>()

  const cambiar = useMutation({
    mutationFn: (v: FormPassword) => authApi.cambiarPassword(v.passwordActual, v.passwordNueva),
    onSuccess: async () => {
      message.success('Contraseña actualizada. Vuelve a iniciar sesión.')
      await cerrarSesion()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (!usuario) return null

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 640 }}>
      <Title level={3} style={{ margin: 0 }}>
        Mi perfil
      </Title>

      <Card>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Nombre">{usuario.nombre}</Descriptions.Item>
          <Descriptions.Item label="Correo">{usuario.email}</Descriptions.Item>
          <Descriptions.Item label="Roles">
            <Space wrap>
              {usuario.alcances.length === 0 ? (
                <Text type="secondary">Sin roles</Text>
              ) : (
                usuario.alcances.map((a, i) => (
                  <Tag key={i} color="blue">
                    {a.rolCodigo}
                    {a.tipoAlcance !== 'GLOBAL' ? ` · ${a.tipoAlcance}` : ''}
                  </Tag>
                ))
              )}
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Cambiar contraseña">
        <Form<FormPassword> form={form} layout="vertical" onFinish={(v) => cambiar.mutate(v)}>
          <Form.Item
            name="passwordActual"
            label="Contraseña actual"
            rules={[{ required: true, message: 'Ingresa tu contraseña actual' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="passwordNueva"
            label="Nueva contraseña"
            rules={[
              { required: true, message: 'Ingresa la nueva contraseña' },
              { min: 10, message: 'Al menos 10 caracteres' },
              { pattern: /[a-z]/, message: 'Incluye una minúscula' },
              { pattern: /[A-Z]/, message: 'Incluye una mayúscula' },
              { pattern: /\d/, message: 'Incluye un número' },
            ]}
            hasFeedback
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="repetir"
            label="Repetir nueva contraseña"
            dependencies={['passwordNueva']}
            hasFeedback
            rules={[
              { required: true, message: 'Repite la contraseña' },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  !value || getFieldValue('passwordNueva') === value
                    ? Promise.resolve()
                    : Promise.reject(new Error('Las contraseñas no coinciden')),
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={cambiar.isPending}>
            Cambiar contraseña
          </Button>
        </Form>
      </Card>
    </Space>
  )
}
