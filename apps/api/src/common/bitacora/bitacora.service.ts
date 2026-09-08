import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface EventoBitacora {
  accion: string;
  actorId?: string | null;
  actorEmail?: string | null;
  entidad?: string | null;
  entidadId?: string | null;
  valorAnterior?: Prisma.InputJsonValue | null;
  valorNuevo?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Escribe en la tabla `bitacora` (append-only).
 * Nunca lanza: un fallo al auditar no debe tumbar la operación de negocio.
 */
@Injectable()
export class BitacoraService {
  private readonly logger = new Logger(BitacoraService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registrar(evento: EventoBitacora): Promise<void> {
    try {
      await this.prisma.bitacora.create({
        data: {
          accion: evento.accion,
          actorId: evento.actorId ?? null,
          actorEmail: evento.actorEmail ?? null,
          entidad: evento.entidad ?? null,
          entidadId: evento.entidadId ?? null,
          valorAnterior: evento.valorAnterior ?? Prisma.DbNull,
          valorNuevo: evento.valorNuevo ?? Prisma.DbNull,
          ip: evento.ip ?? null,
          userAgent: evento.userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        `No se pudo registrar en bitácora la acción "${evento.accion}"`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}
