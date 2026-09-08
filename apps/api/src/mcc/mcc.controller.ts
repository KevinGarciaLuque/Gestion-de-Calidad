import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import {
  CerrarMCCDto,
  ComentarMCCDto,
  CrearMCCDto,
  DecidirMCCDto,
  EditarMCCDto,
  ListarMCCQuery,
} from './dto/mcc.dto';
import { MccService } from './mcc.service';

@Controller('mcc')
export class MccController {
  constructor(private readonly mcc: MccService) {}

  @Get()
  @RequierePermiso(PERMISO.MCC_VER)
  listar(@Query() q: ListarMCCQuery, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.listar(q, actor);
  }

  @Get(':id')
  @RequierePermiso(PERMISO.MCC_VER)
  obtener(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.obtener(id, actor);
  }

  @Post()
  @RequierePermiso(PERMISO.MCC_CREAR)
  crear(@Body() dto: CrearMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.MCC_VER)
  editar(@Param('id') id: string, @Body() dto: EditarMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.editar(id, dto, actor);
  }

  @Post(':id/decidir')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  decidir(@Param('id') id: string, @Body() dto: DecidirMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.decidir(id, dto, actor);
  }

  @Post(':id/iniciar-ejecucion')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  iniciar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.iniciarEjecucion(id, actor);
  }

  @Post(':id/verificacion')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  verificacion(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.pasarVerificacion(id, actor);
  }

  @Post(':id/cerrar')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  cerrar(@Param('id') id: string, @Body() dto: CerrarMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.cerrar(id, dto, actor);
  }

  @Post(':id/comentario')
  @RequierePermiso(PERMISO.MCC_VER)
  comentar(@Param('id') id: string, @Body() dto: ComentarMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.comentar(id, dto, actor);
  }

  @Post(':id/archivar')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  archivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.archivar(id, true, actor);
  }
}
