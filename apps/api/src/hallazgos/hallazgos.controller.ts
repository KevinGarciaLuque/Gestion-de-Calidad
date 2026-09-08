import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { CrearHallazgoDto, EditarHallazgoDto, ListarHallazgosQuery } from './dto/hallazgo.dto';
import { HallazgosService } from './hallazgos.service';

@Controller('hallazgos')
export class HallazgosController {
  constructor(private readonly hallazgos: HallazgosService) {}

  @Get()
  @RequierePermiso(PERMISO.HALLAZGOS_VER)
  listar(@Query() q: ListarHallazgosQuery, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.listar(q, actor);
  }

  @Get(':id')
  @RequierePermiso(PERMISO.HALLAZGOS_VER)
  obtener(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.obtener(id, actor);
  }

  @Post()
  @RequierePermiso(PERMISO.HALLAZGOS_CREAR)
  crear(@Body() dto: CrearHallazgoDto, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.HALLAZGOS_EDITAR)
  editar(@Param('id') id: string, @Body() dto: EditarHallazgoDto, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.editar(id, dto, actor);
  }

  @Post(':id/archivar')
  @RequierePermiso(PERMISO.HALLAZGOS_CERRAR)
  archivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.archivar(id, true, actor);
  }

  @Post(':id/desarchivar')
  @RequierePermiso(PERMISO.HALLAZGOS_CERRAR)
  desarchivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.archivar(id, false, actor);
  }
}
