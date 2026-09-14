import {
  AuditOutlined,
  BarChartOutlined,
  BulbOutlined,
  CalendarOutlined,
  FilePdfOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LeftOutlined,
  LogoutOutlined,
  MenuOutlined,
  PartitionOutlined,
  SafetyOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { useAuthStore } from '@/features/auth/authStore'
import { NotificacionesMenu } from '@/features/notificaciones/NotificacionesMenu'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const ESTILOS_TOGGLE = `
.sider-toggle {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease, box-shadow 0.2s ease;
}
.sider-toggle:hover {
  background-color: #0077bf;
  box-shadow: 0 4px 14px rgba(0,0,0,0.35);
  transform: scale(1.1);
}
.sider-toggle.colapsado {
  transform: rotate(180deg);
}
.sider-toggle.colapsado:hover {
  transform: rotate(180deg) scale(1.1);
}
`

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
      { key: '/admin/respaldos', icon: null, label: 'Respaldos', permiso: 'respaldos.gestionar' },
    ],
  },
]

const RUTAS_MENU = [
  '/admin/usuarios',
  '/admin/roles',
  '/admin/organizacion',
  '/admin/automatizaciones',
  '/admin/bitacora',
  '/admin/respaldos',
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

function Marca({ colapsado }: { colapsado: boolean }) {
  return (
    <div
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: colapsado ? 'center' : 'flex-start',
        gap: 8,
        padding: colapsado ? 0 : '0 20px',
        color: '#fff',
        fontWeight: 700,
      }}
    >
      <SafetyOutlined style={{ fontSize: 20 }} />
      {!colapsado && <span>Calidad 360</span>}
    </div>
  )
}

export function AppShell() {
  const [colapsado, setColapsado] = useState(false)
  const [drawerAbierto, setDrawerAbierto] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario, puede } = useAuth()
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion)

  const screens = Grid.useBreakpoint()
  // `lg` marca el salto a escritorio. Mientras Grid no ha medido (SSR/primer
  // render) `lg` es undefined: asumimos escritorio para no parpadear.
  const esMovil = screens.lg === false

  // Cierra el menú lateral móvil al navegar.
  useEffect(() => {
    setDrawerAbierto(false)
  }, [location.pathname])

  const items = useMemo<MenuProps['items']>(() => {
    const visible = (m: ItemModulo): boolean => !!m.proximamente || !m.permiso || puede(m.permiso)

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

  const menuNavegacion = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[claveSeleccionada(location.pathname)]}
      defaultOpenKeys={['admin']}
      items={items}
      style={{ borderInlineEnd: 0 }}
      onClick={({ key }) => {
        if (key.startsWith('/')) navigate(key)
      }}
    />
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {esMovil ? (
        <Drawer
          placement="left"
          width={260}
          open={drawerAbierto}
          onClose={() => setDrawerAbierto(false)}
          closable={false}
          styles={{ body: { padding: 0, background: '#001f33' }, header: { display: 'none' } }}
        >
          <Marca colapsado={false} />
          {menuNavegacion}
        </Drawer>
      ) : (
        <Sider
          collapsible
          trigger={null}
          collapsed={colapsado}
          onCollapse={setColapsado}
          breakpoint="xl"
          collapsedWidth={64}
          theme="dark"
          style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'visible' }}
        >
          <style>{ESTILOS_TOGGLE}</style>
          <div style={{ height: '100%', overflow: 'auto' }}>
            <Marca colapsado={colapsado} />
            {menuNavegacion}
          </div>
          <button
            className={`sider-toggle${colapsado ? ' colapsado' : ''}`}
            onClick={() => setColapsado(!colapsado)}
            aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
            style={{
              position: 'absolute',
              top: 64,
              right: -14,
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '2px solid #001f33',
              background: '#00629b',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: 20,
              padding: 0,
            }}
          >
            <LeftOutlined style={{ fontSize: 11 }} />
          </button>
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: esMovil ? '0 12px' : '0 20px',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {esMovil && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerAbierto(true)}
                aria-label="Abrir menú"
              />
            )}
            <Text
              strong
              style={{
                fontSize: esMovil ? 14 : 16,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {esMovil ? 'Calidad 360' : 'Sistema de Gestión de Calidad'}
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: esMovil ? 4 : 12, flexShrink: 0 }}>
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
                {!esMovil && <Text>{usuario?.nombre ?? 'Invitado'}</Text>}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: esMovil ? 8 : 16, minWidth: 0 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: esMovil ? 14 : 24,
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
