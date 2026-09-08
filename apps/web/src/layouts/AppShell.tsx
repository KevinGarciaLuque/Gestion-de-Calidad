import {
  AuditOutlined,
  BarChartOutlined,
  CalendarOutlined,
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
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useAuthStore } from '@/features/auth/authStore'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const itemsMenu: MenuProps['items'] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Panel' },
  { key: '/procesos', icon: <PartitionOutlined />, label: 'Procesos', disabled: true },
  { key: '/indicadores', icon: <BarChartOutlined />, label: 'Indicadores', disabled: true },
  { key: '/riesgos', icon: <WarningOutlined />, label: 'Riesgos', disabled: true },
  { key: '/documentos', icon: <FileTextOutlined />, label: 'Control documental', disabled: true },
  { key: '/auditorias', icon: <AuditOutlined />, label: 'Auditorías', disabled: true },
  { key: '/hallazgos', icon: <SafetyOutlined />, label: 'Hallazgos y NC', disabled: true },
  { key: '/acciones', icon: <ThunderboltOutlined />, label: 'Planes y acciones', disabled: true },
  { key: '/calendario', icon: <CalendarOutlined />, label: 'Calendario', disabled: true },
  {
    key: 'admin',
    icon: <SettingOutlined />,
    label: 'Administración',
    children: [
      { key: '/admin/usuarios', label: 'Usuarios', disabled: true },
      { key: '/admin/roles', label: 'Roles y permisos', disabled: true },
      { key: '/admin/organizacion', label: 'Estructura organizacional', disabled: true },
      { key: '/admin/bitacora', label: 'Bitácora', disabled: true },
    ],
  },
]

export function AppShell() {
  const [colapsado, setColapsado] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario } = useAuth()
  const limpiarSesion = useAuthStore((s) => s.limpiarSesion)

  const menuUsuario: MenuProps['items'] = [
    { key: 'perfil', icon: <UserOutlined />, label: 'Mi perfil', disabled: true },
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
            letterSpacing: 0.5,
            gap: 8,
          }}
        >
          <SafetyOutlined style={{ fontSize: 20 }} />
          {!colapsado && <span>Calidad 360</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['admin']}
          items={itemsMenu}
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
          <Dropdown
            menu={{
              items: menuUsuario,
              onClick: ({ key }) => {
                if (key === 'salir') limpiarSesion()
              },
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>{usuario?.nombre ?? 'Invitado'}</Text>
            </div>
          </Dropdown>
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
