import { Result, Spin } from 'antd'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

export function ProtectedRoute({
  children,
  permiso,
}: {
  children: ReactNode
  permiso?: string
}) {
  const { autenticado, cargando, puede, usuario } = useAuth()
  const location = useLocation()

  if (cargando) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Cambio de contraseña obligatorio antes de usar el resto de la app.
  if (usuario?.debeCambiarPassword && location.pathname !== '/perfil/cambiar-password') {
    return <Navigate to="/perfil/cambiar-password" replace />
  }

  if (permiso && !puede(permiso)) {
    return (
      <Result
        status="403"
        title="Sin acceso"
        subTitle="No tienes permiso para ver esta sección."
      />
    )
  }

  return <>{children}</>
}
