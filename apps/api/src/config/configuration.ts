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
});
