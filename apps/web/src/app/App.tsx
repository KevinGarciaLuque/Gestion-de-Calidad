import { App as AntdApp, ConfigProvider } from 'antd'
import esES from 'antd/locale/es_ES'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/features/auth/authStore'
import { router } from './router'
import { themeCalidad360 } from './theme'

dayjs.locale('es')

export function App() {
  const setCargando = useAuthStore((s) => s.setCargando)

  // Bootstrap de sesión.
  // Fase 1: aquí se llamará a POST /api/auth/refresh para restaurar la sesión
  // desde la cookie httpOnly. Por ahora simplemente terminamos la carga.
  useEffect(() => {
    setCargando(false)
  }, [setCargando])

  return (
    <ConfigProvider locale={esES} theme={themeCalidad360}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  )
}
