type ModuloSentry = typeof import('@sentry/react')

let sentry: ModuloSentry | null = null

/**
 * Inicializa Sentry solo si se definió VITE_SENTRY_DSN. El paquete se importa
 * de forma dinámica para que, sin esa variable, ni un byte de `@sentry/react`
 * llegue al bundle que descarga cada usuario (p. ej. el login).
 */
export async function inicializarSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  sentry = await import('@sentry/react')
  sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  })
}

/** Reporta una excepción atrapada por el ErrorBoundary; no hace nada si Sentry no está activo. */
export function capturarExcepcion(error: unknown): void {
  sentry?.captureException(error)
}
