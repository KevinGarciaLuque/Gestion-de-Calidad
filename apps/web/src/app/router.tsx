import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Cargando } from '@/components/Cargando'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/layouts/AppShell'

// Cada página se descarga bajo demanda (code-splitting por ruta): así el login
// y el panel inicial no pagan el costo de JS de módulos que no van a usar
// (Mermaid, matriz de riesgos, reportes, etc.).
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const MapaProcesosPage = lazy(() => import('@/features/procesos/MapaProcesosPage').then((m) => ({ default: m.MapaProcesosPage })))
const ProcesoFichaPage = lazy(() => import('@/features/procesos/ProcesoFichaPage').then((m) => ({ default: m.ProcesoFichaPage })))
const IndicadoresPage = lazy(() => import('@/features/indicadores/IndicadoresPage').then((m) => ({ default: m.IndicadoresPage })))
const IndicadorDetallePage = lazy(() => import('@/features/indicadores/IndicadorDetallePage').then((m) => ({ default: m.IndicadorDetallePage })))
const RiesgosPage = lazy(() => import('@/features/riesgos/RiesgosPage').then((m) => ({ default: m.RiesgosPage })))
const RiesgoDetallePage = lazy(() => import('@/features/riesgos/RiesgoDetallePage').then((m) => ({ default: m.RiesgoDetallePage })))
const MatrizConfigPage = lazy(() => import('@/features/riesgos/MatrizConfigPage').then((m) => ({ default: m.MatrizConfigPage })))
const DocumentosPage = lazy(() => import('@/features/documentos/DocumentosPage').then((m) => ({ default: m.DocumentosPage })))
const DocumentoDetallePage = lazy(() => import('@/features/documentos/DocumentoDetallePage').then((m) => ({ default: m.DocumentoDetallePage })))
const AuditoriasPage = lazy(() => import('@/features/auditorias/AuditoriasPage').then((m) => ({ default: m.AuditoriasPage })))
const AuditoriaDetallePage = lazy(() => import('@/features/auditorias/AuditoriaDetallePage').then((m) => ({ default: m.AuditoriaDetallePage })))
const HallazgosPage = lazy(() => import('@/features/hallazgos/HallazgosPage').then((m) => ({ default: m.HallazgosPage })))
const HallazgoDetallePage = lazy(() => import('@/features/hallazgos/HallazgoDetallePage').then((m) => ({ default: m.HallazgoDetallePage })))
const AccionesPage = lazy(() => import('@/features/acciones/AccionesPage').then((m) => ({ default: m.AccionesPage })))
const AccionDetallePage = lazy(() => import('@/features/acciones/AccionDetallePage').then((m) => ({ default: m.AccionDetallePage })))
const MccPage = lazy(() => import('@/features/mcc/MccPage').then((m) => ({ default: m.MccPage })))
const MccDetallePage = lazy(() => import('@/features/mcc/MccDetallePage').then((m) => ({ default: m.MccDetallePage })))
const UsuariosPage = lazy(() => import('@/features/usuarios/UsuariosPage').then((m) => ({ default: m.UsuariosPage })))
const RolesPage = lazy(() => import('@/features/roles/RolesPage').then((m) => ({ default: m.RolesPage })))
const OrganizacionPage = lazy(() => import('@/features/organizacion/OrganizacionPage').then((m) => ({ default: m.OrganizacionPage })))
const BitacoraPage = lazy(() => import('@/features/bitacora/BitacoraPage').then((m) => ({ default: m.BitacoraPage })))
const RespaldosPage = lazy(() => import('@/features/respaldos/RespaldosPage').then((m) => ({ default: m.RespaldosPage })))
const PerfilPage = lazy(() => import('@/features/perfil/PerfilPage').then((m) => ({ default: m.PerfilPage })))
const CambiarPasswordObligatorioPage = lazy(() =>
  import('@/features/perfil/CambiarPasswordObligatorioPage').then((m) => ({ default: m.CambiarPasswordObligatorioPage })),
)
const NotificacionesPage = lazy(() => import('@/features/notificaciones/NotificacionesPage').then((m) => ({ default: m.NotificacionesPage })))
const CalendarioPage = lazy(() => import('@/features/calendario/CalendarioPage').then((m) => ({ default: m.CalendarioPage })))
const AutomatizacionesConfigPage = lazy(() =>
  import('@/features/automatizaciones/AutomatizacionesConfigPage').then((m) => ({ default: m.AutomatizacionesConfigPage })),
)
const ReportesPage = lazy(() => import('@/features/reportes/ReportesPage').then((m) => ({ default: m.ReportesPage })))
const InformeEjecutivoPage = lazy(() => import('@/features/reportes/InformeEjecutivoPage').then((m) => ({ default: m.InformeEjecutivoPage })))
const EncuestasPage = lazy(() => import('@/features/encuestas/EncuestasPage').then((m) => ({ default: m.EncuestasPage })))
const ResponderEncuestaPage = lazy(() => import('@/features/encuestas/ResponderEncuestaPage').then((m) => ({ default: m.ResponderEncuestaPage })))

/** Envuelve un elemento perezoso en su propio Suspense (para las rutas fuera de AppShell). */
function pagina(elemento: ReactNode) {
  return <Suspense fallback={<Cargando />}>{elemento}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/login', element: pagina(<LoginPage />) },
  { path: '/perfil/cambiar-password', element: pagina(<CambiarPasswordObligatorioPage />) },
  { path: '/encuestas/responder/:procesoId', element: pagina(<ResponderEncuestaPage />) },
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
        path: 'reportes',
        element: (
          <ProtectedRoute permiso="reportes.ver">
            <ReportesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reportes/ejecutivo',
        element: (
          <ProtectedRoute permiso="reportes.ver">
            <InformeEjecutivoPage />
          </ProtectedRoute>
        ),
      },
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
        path: 'encuestas',
        element: (
          <ProtectedRoute permiso="encuestas.ver">
            <EncuestasPage />
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
        path: 'admin/respaldos',
        element: (
          <ProtectedRoute permiso="respaldos.gestionar">
            <RespaldosPage />
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
