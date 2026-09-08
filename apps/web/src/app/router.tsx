import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/layouts/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { MapaProcesosPage } from '@/features/procesos/MapaProcesosPage'
import { ProcesoFichaPage } from '@/features/procesos/ProcesoFichaPage'
import { IndicadoresPage } from '@/features/indicadores/IndicadoresPage'
import { IndicadorDetallePage } from '@/features/indicadores/IndicadorDetallePage'
import { RiesgosPage } from '@/features/riesgos/RiesgosPage'
import { RiesgoDetallePage } from '@/features/riesgos/RiesgoDetallePage'
import { MatrizConfigPage } from '@/features/riesgos/MatrizConfigPage'
import { DocumentosPage } from '@/features/documentos/DocumentosPage'
import { DocumentoDetallePage } from '@/features/documentos/DocumentoDetallePage'
import { AuditoriasPage } from '@/features/auditorias/AuditoriasPage'
import { AuditoriaDetallePage } from '@/features/auditorias/AuditoriaDetallePage'
import { HallazgosPage } from '@/features/hallazgos/HallazgosPage'
import { HallazgoDetallePage } from '@/features/hallazgos/HallazgoDetallePage'
import { AccionesPage } from '@/features/acciones/AccionesPage'
import { AccionDetallePage } from '@/features/acciones/AccionDetallePage'
import { MccPage } from '@/features/mcc/MccPage'
import { MccDetallePage } from '@/features/mcc/MccDetallePage'
import { UsuariosPage } from '@/features/usuarios/UsuariosPage'
import { RolesPage } from '@/features/roles/RolesPage'
import { OrganizacionPage } from '@/features/organizacion/OrganizacionPage'
import { BitacoraPage } from '@/features/bitacora/BitacoraPage'
import { PerfilPage } from '@/features/perfil/PerfilPage'
import { CambiarPasswordObligatorioPage } from '@/features/perfil/CambiarPasswordObligatorioPage'
import { NotificacionesPage } from '@/features/notificaciones/NotificacionesPage'
import { CalendarioPage } from '@/features/calendario/CalendarioPage'
import { AutomatizacionesConfigPage } from '@/features/automatizaciones/AutomatizacionesConfigPage'

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
      { path: 'notificaciones', element: <NotificacionesPage /> },
      { path: 'calendario', element: <CalendarioPage /> },
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
        path: 'indicadores',
        element: (
          <ProtectedRoute permiso="indicadores.ver">
            <IndicadoresPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'indicadores/:id',
        element: (
          <ProtectedRoute permiso="indicadores.ver">
            <IndicadorDetallePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'riesgos',
        element: (
          <ProtectedRoute permiso="riesgos.ver">
            <RiesgosPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'riesgos/matriz',
        element: (
          <ProtectedRoute permiso="riesgos.configurar">
            <MatrizConfigPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'riesgos/:id',
        element: (
          <ProtectedRoute permiso="riesgos.ver">
            <RiesgoDetallePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'documentos',
        element: (
          <ProtectedRoute permiso="documentos.ver">
            <DocumentosPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'documentos/:id',
        element: (
          <ProtectedRoute permiso="documentos.ver">
            <DocumentoDetallePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'auditorias',
        element: (
          <ProtectedRoute permiso="auditorias.ver">
            <AuditoriasPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'auditorias/:id',
        element: (
          <ProtectedRoute permiso="auditorias.ver">
            <AuditoriaDetallePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'hallazgos',
        element: (
          <ProtectedRoute permiso="hallazgos.ver">
            <HallazgosPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'hallazgos/:id',
        element: (
          <ProtectedRoute permiso="hallazgos.ver">
            <HallazgoDetallePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'acciones',
        element: (
          <ProtectedRoute permiso="acciones.ver">
            <AccionesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'acciones/:id',
        element: (
          <ProtectedRoute permiso="acciones.ver">
            <AccionDetallePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'mcc',
        element: (
          <ProtectedRoute permiso="mcc.ver">
            <MccPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'mcc/:id',
        element: (
          <ProtectedRoute permiso="mcc.ver">
            <MccDetallePage />
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
      {
        path: 'admin/automatizaciones',
        element: (
          <ProtectedRoute permiso="automatizaciones.configurar">
            <AutomatizacionesConfigPage />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
