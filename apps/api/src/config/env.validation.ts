/**
 * Validación de variables de entorno al arrancar.
 * Si falta una variable obligatoria, la aplicación no inicia.
 */
const REQUERIDAS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const faltantes = REQUERIDAS.filter((k) => !config[k] || String(config[k]).trim() === '');
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. ` +
        `Copia apps/api/.env.example a apps/api/.env y complétalo.`,
    );
  }
  return config;
}
