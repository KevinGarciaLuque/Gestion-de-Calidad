import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { semaforo } from '@/app/theme'

const { Title, Text } = Typography

interface FormLogin {
  email: string
  password: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSesion = useAuthStore((s) => s.setSesion)
  const [enviando, setEnviando] = useState(false)

  const destino =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  // NOTA (Fase 0): inicio de sesión simulado para poder navegar la interfaz.
  // En Fase 1 esto llamará a POST /api/auth/login.
  const onFinish = (valores: FormLogin) => {
    setEnviando(true)
    setTimeout(() => {
      setSesion(
        {
          id: 'demo',
          email: valores.email,
          nombre: valores.email.split('@')[0] || 'Usuario',
          permisos: [],
          roles: ['DEMO'],
        },
        'token-simulado-fase0',
      )
      navigate(destino, { replace: true })
    }, 300)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(135deg, #00629b 0%, #001f33 100%)`,
        padding: 16,
      }}
    >
      <Card style={{ width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 0 }}>
            Calidad 360
          </Title>
          <Text type="secondary">Sistema de Gestión de Calidad Hospitalaria</Text>
        </div>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, borderColor: semaforo.amarillo }}
          message="Fase 0"
          description="Inicio de sesión simulado. La autenticación real llega en la Fase 1."
        />

        <Form<FormLogin> layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            label="Correo institucional"
            rules={[
              { required: true, message: 'Ingresa tu correo' },
              { type: 'email', message: 'Correo no válido' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="usuario@hospital.org" size="large" />
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
