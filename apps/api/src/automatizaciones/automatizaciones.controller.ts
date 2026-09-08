import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { AutomatizacionesService } from './automatizaciones.service';

class ConfigurarReglaDto {
  @IsOptional() @IsBoolean() activa?: boolean;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

@Controller('automatizaciones')
export class AutomatizacionesController {
  constructor(
    private readonly motor: AutomatizacionesService,
    private readonly bitacora: BitacoraService,
  ) {}

  @Get('reglas')
  @RequierePermiso(PERMISO.AUTOMATIZACIONES_CONFIGURAR)
  reglas() {
    return this.motor.reglas();
  }

  @Get('estado')
  @RequierePermiso(PERMISO.AUTOMATIZACIONES_CONFIGURAR)
  estado() {
    return this.motor.ultimaEjecucion();
  }

  @Patch('reglas/:codigo')
  @RequierePermiso(PERMISO.AUTOMATIZACIONES_CONFIGURAR)
  async configurar(
    @Param('codigo') codigo: string,
    @Body() dto: ConfigurarReglaDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    const r = await this.motor.configurar(codigo, dto);
    await this.bitacora.registrar({
      accion: 'automatizacion.configurar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'ReglaAutomatizacion',
      entidadId: codigo,
      valorNuevo: dto as never,
    });
    return r;
  }

  @Post('ejecutar')
  @RequierePermiso(PERMISO.AUTOMATIZACIONES_CONFIGURAR)
  async ejecutar(@CurrentUser() actor: UsuarioActual) {
    await this.bitacora.registrar({
      accion: 'automatizacion.ejecutar_manual',
      actorId: actor.id,
      actorEmail: actor.email,
    });
    return this.motor.ejecutar(true);
  }
}
