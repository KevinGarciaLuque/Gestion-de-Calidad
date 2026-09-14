import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { inicializarSentry } from './common/monitoreo/sentry';
import type { AppConfig } from './config/configuration';

// Permite serializar BigInt (p. ej. ids de bitácora) en respuestas JSON.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

inicializarSentry();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  // Detrás del proxy de Railway/servicios gestionados: confía en X-Forwarded-*
  // para que `secure`/`req.ip` y los rate-limits funcionen correctamente.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: config.get<AppConfig['corsOrigins']>('corsOrigins'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API Calidad 360 escuchando en http://localhost:${port}/api`);
}

void bootstrap();
