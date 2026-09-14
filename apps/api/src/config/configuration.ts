import { resolve } from 'node:path';

/** Configuración tipada derivada de las variables de entorno. */
export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  corsOrigins: string[];
  jwt: {
    accessSecret: string;
    accessTtl: string;
    refreshSecret: string;
    refreshTtl: string;
  };
  refreshCookie: {
    name: string;
    secure: boolean;
  };
  /** Carpeta donde se guardan los archivos de documentos. */
  archivosDir: string;
  /** Tamaño máximo de archivo en bytes. */
  archivoMaxBytes: number;
  /** Carpeta donde se guardan los respaldos de la base de datos. */
  backupsDir: string;
  /** Cuántos respaldos diarios conservar antes de borrar los más viejos. */
  backupsRetener: number;
  /** DSN de Sentry para monitoreo de errores; si no está definido, Sentry queda desactivado. */
  sentryDsn: string | undefined;
  /** Almacenamiento S3-compatible (AWS S3, Cloudflare R2, Backblaze B2, MinIO). Si falta el bucket, se usa disco local. */
  s3: {
    bucket: string;
    region: string;
    endpoint: string | undefined;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
  } | null;
}

export default (): AppConfig => ({
  env: (process.env.NODE_ENV as AppConfig['env']) ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  refreshCookie: {
    name: process.env.REFRESH_COOKIE_NAME ?? 'c360_rt',
    secure: process.env.COOKIE_SECURE === 'true',
  },
  archivosDir: resolve(process.env.ARCHIVOS_DIR ?? 'storage/documentos'),
  archivoMaxBytes: parseInt(process.env.ARCHIVO_MAX_BYTES ?? String(25 * 1024 * 1024), 10),
  backupsDir: resolve(process.env.BACKUPS_DIR ?? 'storage/backups'),
  backupsRetener: parseInt(process.env.BACKUPS_RETENER ?? '14', 10),
  sentryDsn: process.env.SENTRY_DSN || undefined,
  s3:
    process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          bucket: process.env.S3_BUCKET,
          region: process.env.S3_REGION ?? 'auto',
          endpoint: process.env.S3_ENDPOINT || undefined,
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        }
      : null,
});
