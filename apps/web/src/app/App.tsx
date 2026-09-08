import { App as AntdApp, ConfigProvider } from 'antd'
import esES from 'antd/locale/es_ES'
import { QueryClientProvider } from '@tanstack/react-query'
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
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  )
}
