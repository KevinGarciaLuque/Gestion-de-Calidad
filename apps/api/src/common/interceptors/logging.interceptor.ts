import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/** Registra método, ruta, código de estado y duración de cada petición. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = req;
    const inicio = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<{ statusCode: number }>();
          this.logger.log(`${method} ${originalUrl} ${res.statusCode} - ${Date.now() - inicio}ms`);
        },
        error: (err: { status?: number }) => {
          this.logger.warn(
            `${method} ${originalUrl} ${err.status ?? 500} - ${Date.now() - inicio}ms`,
          );
        },
      }),
    );
  }
}
