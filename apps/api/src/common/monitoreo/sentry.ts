import * as Sentry from '@sentry/node';

/**
 * Inicializa Sentry solo si se definió SENTRY_DSN. Debe llamarse antes de
 * crear la app de Nest para que capture también errores de arranque.
 */
export function inicializarSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}

/** Envía una excepción a Sentry si está activo; no hace nada si no hay DSN configurado. */
export function capturarExcepcion(exception: unknown): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.captureException(exception);
}
