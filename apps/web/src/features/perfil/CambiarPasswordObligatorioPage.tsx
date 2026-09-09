import { App, Button, Card, Form, Input, Typography } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { authApi } from '@/features/auth/authApi'
import { useAuthStore } from '@/features/auth/authStore'
import { useAuth } from '@/features/auth/useAuth'
import { mensajeDeError } from '@/lib/api'

const { Title, Paragraph } = Typography

interface FormPassword {
  passwordActual: string
  passwordNueva: string
  repetir: string
}

export function CambiarPasswordObligatorioPage() {
  const { usuario, cargando } = useAuth()
  const { message } = App.useApp()
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion)
  const [form] = Form.useForm<FormPassword>()

  const cambiar = useMutation({
    mutationFn: (v: FormPassword) => authApi.cambiarPassword(v.passwordActual, v.passwordNueva),
    onSuccess: async () => {
      message.success('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')
      await cerrarSesion()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (cargando) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (!usuario.debeCambiarPassword) return <Navigate to="/" replace />

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #00629b 0%, #001f33 100%)',
        padding: 16,
      }}
    >
      <Card style={{ width: 'min(420px, 100%)' }}>
        <Title level={4}>Cambia tu contraseña</Title>
        <Paragraph type="secondary">
          Tu cuenta tiene una contraseña temporal. Define una nueva para continuar.
        </Paragraph>
        <Form<FormPassword> form={form} layout="vertical" onFinish={(v) => cambiar.mutate(v)}>
          <Form.Item
            name="passwordActual"
            label="Contraseña temporal"
            rules={[{ required: true, message: 'Ingresa la contraseña temporal' }]}
          >
            <Input.Password autoFocus />
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
          <Button type="primary" htmlType="submit" block loading={cambiar.isPending}>
            Guardar y continuar
          </Button>
        </Form>
      </Card>
    </div>
  )
}
