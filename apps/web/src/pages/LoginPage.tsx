import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { App, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/authApi'
import { useAuthStore } from '@/features/auth/authStore'
import { useAuth } from '@/features/auth/useAuth'
import { mensajeDeError } from '@/lib/api'

const { Title, Text } = Typography

interface FormLogin {
  email: string
  password: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const setSesion = useAuthStore((s) => s.setSesion)
  const { autenticado } = useAuth()
  const [enviando, setEnviando] = useState(false)

  const destino =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  if (autenticado) {
    return <Navigate to={destino} replace />
  }

  const onFinish = async (valores: FormLogin) => {
    setEnviando(true)
    try {
      const { usuario, accessToken } = await authApi.login(valores.email.trim(), valores.password)
      setSesion(usuario, accessToken)
      navigate(usuario.debeCambiarPassword ? '/perfil/cambiar-password' : destino, { replace: true })
    } catch (err) {
      message.error(mensajeDeError(err, 'No se pudo iniciar sesión'))
    } finally {
      setEnviando(false)
    }
  }

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
      <Card style={{ width: 'min(380px, 100%)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={3} style={{ marginBottom: 0 }}>
            Calidad 360
          </Title>
          <Text type="secondary">Sistema de Gestión de Calidad Hospitalaria</Text>
        </div>

        <Form<FormLogin> layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="Correo institucional"
            rules={[
              { required: true, message: 'Ingresa tu correo' },
              { type: 'email', message: 'Correo no válido' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="usuario@hospital.org" size="large" autoFocus />
          </Form.Item>

          <Form.Item
            name="password"
            label="Contraseña"
            rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={enviando}>
            Iniciar sesión
          </Button>
        </Form>
      </Card>
    </div>
  )
}
