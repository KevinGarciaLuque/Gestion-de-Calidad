import * as Sentry from '@sentry/react'

/**
 * Inicializa Sentry solo si se definió VITE_SENTRY_DSN. Debe llamarse una
 * vez, antes de montar la app, para capturar también errores tempranos.
 */
export function inicializarSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  })
}
