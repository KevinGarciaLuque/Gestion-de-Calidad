import { App as AntdApp, Button, ConfigProvider, Result } from 'antd'
import esES from 'antd/locale/es_ES'
import { QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { queryClient } from '@/lib/queryClient'
import { configurarAuthEvents } from '@/lib/api'
import { useAuthStore } from '@/features/auth/authStore'
import { router } from './router'
import { themeCalidad360 } from './theme'

dayjs.extend(relativeTime)
dayjs.locale('es')

export function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)

  useEffect(() => {
    configurarAuthEvents({
      onSesionExpirada: () => useAuthStore.getState().limpiarSesion(),
    })
    void bootstrap()
  }, [bootstrap])

  return (
    <ConfigProvider locale={esES} theme={themeCalidad360}>
      <AntdApp>
        <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </Sentry.ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  )
}

function ErrorFallback() {
  return (
    <Result
      status="error"
      title="Ocurrió un error inesperado"
      subTitle="El equipo de sistemas ya fue notificado. Intenta recargar la página."
      extra={
        <Button type="primary" onClick={() => window.location.reload()}>
          Recargar
        </Button>
      }
    />
  )
}
