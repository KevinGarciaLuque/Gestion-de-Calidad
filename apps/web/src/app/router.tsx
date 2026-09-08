import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/layouts/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { MapaProcesosPage } from '@/features/procesos/MapaProcesosPage'
import { ProcesoFichaPage } from '@/features/procesos/ProcesoFichaPage'
import { UsuariosPage } from '@/features/usuarios/UsuariosPage'
import { RolesPage } from '@/features/roles/RolesPage'
import { OrganizacionPage } from '@/features/organizacion/OrganizacionPage'
import { BitacoraPage } from '@/features/bitacora/BitacoraPage'
import { PerfilPage } from '@/features/perfil/PerfilPage'
import { CambiarPasswordObligatorioPage } from '@/features/perfil/CambiarPasswordObligatorioPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/perfil/cambiar-password', element: <CambiarPasswordObligatorioPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'perfil', element: <PerfilPage /> },
      {
        path: 'procesos',
        element: (
          <ProtectedRoute permiso="procesos.ver">
            <MapaProcesosPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'procesos/:id',
        element: (
          <ProtectedRoute permiso="procesos.ver">
            <ProcesoFichaPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/usuarios',
        element: (
          <ProtectedRoute permiso="usuarios.ver">
            <UsuariosPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/roles',
        element: (
          <ProtectedRoute permiso="roles.ver">
            <RolesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/organizacion',
        element: (
          <ProtectedRoute permiso="organizacion.ver">
            <OrganizacionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/bitacora',
        element: (
          <ProtectedRoute permiso="bitacora.ver">
            <BitacoraPage />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
