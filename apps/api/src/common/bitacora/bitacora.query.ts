import { Type } from 'class-transformer';
import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginacionQuery, paginar, type Paginado } from '../dto/paginacion';
import { PrismaService } from '../../prisma/prisma.service';

export class ListarBitacoraQuery extends PaginacionQuery {
  @IsOptional() @IsString() actorId?: string;
  @IsOptional() @IsString() entidad?: string;
  @IsOptional() @IsString() accion?: string;
  @IsOptional() @IsISO8601() desde?: string;
  @IsOptional() @IsISO8601() hasta?: string;
}

@Injectable()
export class BitacoraQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(q: ListarBitacoraQuery): Promise<Paginado<unknown>> {
    const where: Prisma.BitacoraWhereInput = {};
    if (q.actorId) where.actorId = q.actorId;
    if (q.entidad) where.entidad = q.entidad;
    if (q.accion) where.accion = { contains: q.accion };
    if (q.desde || q.hasta) {
      where.fecha = {};
      if (q.desde) where.fecha.gte = new Date(q.desde);
      if (q.hasta) where.fecha.lte = new Date(q.hasta);
    }

    const [filas, total] = await this.prisma.$transaction([
      this.prisma.bitacora.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: q.skip,
        take: q.porPagina,
      }),
      this.prisma.bitacora.count({ where }),
    ]);

    // BigInt no es serializable a JSON directamente.
    const datos = filas.map((f) => ({ ...f, id: f.id.toString() }));
    return paginar(datos, total, q);
  }
}
