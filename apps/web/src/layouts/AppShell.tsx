import {
  AuditOutlined,
  BarChartOutlined,
  BulbOutlined,
  CalendarOutlined,
  FilePdfOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  PartitionOutlined,
  SafetyOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Avatar, Dropdown, Layout, Menu, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useAuthStore } from '@/features/auth/authStore'
import { NotificacionesMenu } from '@/features/notificaciones/NotificacionesMenu'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface ItemModulo {
  key: string
  icon: React.ReactNode
  label: string
  permiso?: string
  proximamente?: boolean
  children?: ItemModulo[]
}

const MODULOS: ItemModulo[] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Panel', permiso: 'dashboard.ver' },
  { key: '/procesos', icon: <PartitionOutlined />, label: 'Procesos', permiso: 'procesos.ver' },
  { key: '/indicadores', icon: <BarChartOutlined />, label: 'Indicadores', permiso: 'indicadores.ver' },
  { key: '/riesgos', icon: <WarningOutlined />, label: 'Riesgos', permiso: 'riesgos.ver' },
  { key: '/documentos', icon: <FileTextOutlined />, label: 'Control documental', permiso: 'documentos.ver' },
  { key: '/auditorias', icon: <AuditOutlined />, label: 'Auditorías', permiso: 'auditorias.ver' },
  { key: '/hallazgos', icon: <SafetyOutlined />, label: 'Hallazgos y NC', permiso: 'hallazgos.ver' },
  { key: '/acciones', icon: <ThunderboltOutlined />, label: 'Planes y acciones', permiso: 'acciones.ver' },
  { key: '/mcc', icon: <BulbOutlined />, label: 'Mejora continua', permiso: 'mcc.ver' },
  { key: '/calendario', icon: <CalendarOutlined />, label: 'Calendario' },
  { key: '/reportes', icon: <FilePdfOutlined />, label: 'Reportes', permiso: 'reportes.ver' },
  {
    key: 'admin',
    icon: <SettingOutlined />,
    label: 'Administración',
    children: [
      { key: '/admin/usuarios', icon: null, label: 'Usuarios', permiso: 'usuarios.ver' },
      { key: '/admin/roles', icon: null, label: 'Roles y permisos', permiso: 'roles.ver' },
      { key: '/admin/organizacion', icon: null, label: 'Estructura organizacional', permiso: 'organizacion.ver' },
      { key: '/admin/automatizaciones', icon: null, label: 'Automatizaciones', permiso: 'automatizaciones.configurar' },
      { key: '/admin/bitacora', icon: null, label: 'Bitácora', permiso: 'bitacora.ver' },
    ],
  },
]

const RUTAS_MENU = [
  '/admin/usuarios',
  '/admin/roles',
  '/admin/organizacion',
  '/admin/automatizaciones',
  '/admin/bitacora',
  '/calendario',
  '/notificaciones',
  '/reportes',
  '/procesos',
  '/indicadores',
  '/riesgos',
  '/documentos',
  '/auditorias',
  '/hallazgos',
  '/acciones',
  '/mcc',
  '/',
]

function claveSeleccionada(pathname: string): string {
  if (pathname === '/') return '/'
  return RUTAS_MENU.find((r) => r !== '/' && pathname.startsWith(r)) ?? pathname
}

export function AppShell() {
  const [colapsado, setColapsado] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario, puede } = useAuth()
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion)

  const items = useMemo<MenuProps['items']>(() => {
    const visible = (m: ItemModulo): boolean =>
      !!m.proximamente || !m.permiso || puede(m.permiso)

    const resultado: MenuProps['items'] = []
    for (const m of MODULOS) {
      if (m.children) {
        const hijos = m.children.filter(visible)
        if (hijos.length === 0) continue
        resultado.push({
          key: m.key,
          icon: m.icon,
          label: m.label,
          children: hijos.map((c) => ({ key: c.key, label: c.label })),
        })
      } else if (visible(m)) {
        resultado.push({ key: m.key, icon: m.icon, label: m.label, disabled: m.proximamente })
      }
    }
    return resultado
  }, [puede])

  const menuUsuario: MenuProps['items'] = [
    { key: 'perfil', icon: <UserOutlined />, label: 'Mi perfil' },
    { type: 'divider' },
    { key: 'salir', icon: <LogoutOutlined />, label: 'Cerrar sesión', danger: true },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={colapsado}
        onCollapse={setColapsado}
        breakpoint="lg"
        collapsedWidth={64}
        theme="dark"
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            gap: 8,
          }}
        >
          <SafetyOutlined style={{ fontSize: 20 }} />
          {!colapsado && <span>Calidad 360</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[claveSeleccionada(location.pathname)]}
          defaultOpenKeys={['admin']}
          items={items}
          onClick={({ key }) => {
            if (key.startsWith('/')) navigate(key)
          }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Text strong style={{ fontSize: 16 }}>
            Sistema de Gestión de Calidad
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificacionesMenu />
            <Dropdown
              menu={{
                items: menuUsuario,
                onClick: ({ key }) => {
                  if (key === 'salir') void cerrarSesion()
                  if (key === 'perfil') navigate('/perfil')
                },
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text>{usuario?.nombre ?? 'Invitado'}</Text>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 16 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              minHeight: 'calc(100vh - 88px)',
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
