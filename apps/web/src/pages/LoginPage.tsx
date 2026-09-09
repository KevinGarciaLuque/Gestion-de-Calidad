import {
  BarChartOutlined,
  BellOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { App, Button, Form, Grid, Input, Typography } from 'antd'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/authApi'
import { useAuthStore } from '@/features/auth/authStore'
import { useAuth } from '@/features/auth/useAuth'
import { mensajeDeError } from '@/lib/api'

const { Title, Text, Paragraph } = Typography

interface FormLogin {
  email: string
  password: string
}

const AZUL = '#00629b'
const AZUL_OSCURO = '#012a44'

const PANEL_CSS = `
@keyframes c360-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.c360-login-form { animation: c360-fade-up .45s ease both; }
.c360-login-form .ant-input-affix-wrapper { padding-block: 9px; }
`

const VENTAJAS: { icon: React.ReactNode; titulo: string; detalle: string }[] = [
  {
    icon: <SafetyCertificateOutlined />,
    titulo: 'Procesos y riesgos bajo control',
    detalle: 'Mapa de procesos, matriz de riesgos e indicadores conectados entre sí.',
  },
  {
    icon: <BarChartOutlined />,
    titulo: 'Auditorías y hallazgos trazables',
    detalle: 'Del checklist al cierre de la no conformidad, con evidencia en cada paso.',
  },
  {
    icon: <BellOutlined />,
    titulo: 'Alertas y tablero gerencial',
    detalle: 'Vencimientos, escalamiento automático y radar de calidad para la dirección.',
  },
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = App.useApp()
  const setSesion = useAuthStore((s) => s.setSesion)
  const { autenticado } = useAuth()
  const [enviando, setEnviando] = useState(false)
  const screens = Grid.useBreakpoint()
  const conPanel = screens.lg !== false

  const destino = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

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

  const formulario = (
    <div className="c360-login-form" style={{ width: '100%', maxWidth: 380 }}>
      {!conPanel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'center',
            marginBottom: 28,
          }}
        >
          <LogoBadge />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: AZUL_OSCURO }}>Calidad 360</div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: '#8c8c8c' }}>HOSPITALARIA</div>
          </div>
        </div>
      )}

      <Title level={3} style={{ marginBottom: 4 }}>
        Bienvenido
      </Title>
      <Text type="secondary">Ingresa tus credenciales para acceder al sistema.</Text>

      <Form<FormLogin> layout="vertical" onFinish={onFinish} requiredMark={false} style={{ marginTop: 28 }}>
        <Form.Item
          name="email"
          label="Correo institucional"
          rules={[
            { required: true, message: 'Ingresa tu correo' },
            { type: 'email', message: 'Correo no válido' },
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="usuario@hospital.org"
            size="large"
            autoComplete="username"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Contraseña"
          rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="••••••••"
            size="large"
            autoComplete="current-password"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={enviando}
          style={{ marginTop: 8, height: 44, fontWeight: 600 }}
        >
          Iniciar sesión
        </Button>
      </Form>

      <Text type="secondary" style={{ display: 'block', marginTop: 20, fontSize: 12.5 }}>
        ¿Problemas para entrar? Contacta al administrador del sistema de calidad.
      </Text>

      <div
        style={{
          marginTop: 28,
          paddingTop: 16,
          borderTop: '1px solid #f0f0f0',
          fontSize: 12,
          color: '#bfbfbf',
        }}
      >
        © {new Date().getFullYear()} Calidad 360 Hospitalaria · ISO 9001
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', background: '#fff' }}>
      <style>{PANEL_CSS}</style>

      {/* ── Panel de marca (solo escritorio) ─────────────────────────────── */}
      {conPanel && (
        <div
          style={{
            flex: '1.05 1 0',
            position: 'relative',
            overflow: 'hidden',
            color: '#fff',
            padding: '56px 60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: `linear-gradient(155deg, #007ac1 0%, ${AZUL} 45%, ${AZUL_OSCURO} 100%)`,
          }}
        >
          <svg
            aria-hidden
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}
          >
            <defs>
              <pattern id="c360grid" width="34" height="34" patternUnits="userSpaceOnUse">
                <path d="M34 0H0V34" fill="none" stroke="#fff" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#c360grid)" />
          </svg>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: -140,
              top: -140,
              width: 420,
              height: 420,
              borderRadius: '50%',
              border: '60px solid rgba(255,255,255,0.06)',
            }}
          />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoBadge />
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Calidad 360</div>
              <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.75 }}>HOSPITALARIA</div>
            </div>
          </div>

          <div style={{ position: 'relative', maxWidth: 460 }}>
            <Title level={2} style={{ color: '#fff', marginBottom: 12, fontWeight: 600 }}>
              Sistema de Gestión de Calidad
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, marginBottom: 32 }}>
              Planificar, ejecutar, verificar y mejorar el SGC del hospital bajo el enfoque por
              procesos de la norma ISO 9001.
            </Paragraph>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {VENTAJAS.map((v) => (
                <div key={v.titulo} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 17,
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.18)',
                    }}
                  >
                    {v.icon}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{v.titulo}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{v.detalle}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>
            ISO 9001:2015 · Enfoque por procesos · Mejora continua
          </div>
        </div>
      )}

      {/* ── Panel del formulario ─────────────────────────────────────────── */}
      <div
        style={{
          flex: '1 1 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: conPanel ? '40px 32px' : '24px 16px',
          background: conPanel
            ? '#fff'
            : 'radial-gradient(1200px 600px at 50% -10%, #e9f2f9 0%, #f6f9fb 45%, #ffffff 100%)',
        }}
      >
        {conPanel ? (
          formulario
        ) : (
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#fff',
              borderRadius: 16,
              padding: '32px 28px',
              boxShadow: '0 10px 40px rgba(1, 42, 68, 0.12)',
              border: '1px solid #eef2f5',
            }}
          >
            {formulario}
          </div>
        )}
      </div>
    </div>
  )
}

function LogoBadge() {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontSize: 22,
        background: `linear-gradient(140deg, #1890ff 0%, ${AZUL} 55%, ${AZUL_OSCURO} 100%)`,
        boxShadow: '0 6px 18px rgba(0,98,155,0.35)',
      }}
    >
      <SafetyCertificateOutlined />
    </div>
  )
}
