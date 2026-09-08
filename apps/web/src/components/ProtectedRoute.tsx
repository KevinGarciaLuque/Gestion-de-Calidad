import { Spin } from 'antd'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { autenticado, cargando } = useAuth()
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

  return <>{children}</>
}
