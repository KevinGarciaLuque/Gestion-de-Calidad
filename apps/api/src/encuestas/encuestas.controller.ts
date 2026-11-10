import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import { EncuestasService } from './encuestas.service';
import { ListarEncuestasQuery, ResponderEncuestaDto } from './dto/encuestas.dto';

@Controller('encuestas')
export class EncuestasController {
  constructor(private readonly encuestas: EncuestasService) {}

  @Get('publico/:procesoId')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  procesoPublico(@Param('procesoId') procesoId: string) {
    return this.encuestas.procesoPublico(procesoId);
  }

  @Post('publico/:procesoId')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  responder(@Param('procesoId') procesoId: string, @Body() dto: ResponderEncuestaDto) {
    return this.encuestas.responder(procesoId, dto);
  }

  @Get()
  @RequierePermiso(PERMISO.ENCUESTAS_VER)
  listar(@Query() q: ListarEncuestasQuery) {
    return this.encuestas.listar(q);
  }

  @Get('resumen')
  @RequierePermiso(PERMISO.ENCUESTAS_VER)
  resumen() {
    return this.encuestas.resumen();
  }
}
