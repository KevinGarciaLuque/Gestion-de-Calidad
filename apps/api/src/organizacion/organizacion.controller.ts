import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { CrearUnidadDto, EditarUnidadDto } from './dto/unidad.dto';
import { OrganizacionService } from './organizacion.service';

@Controller('organizacion')
export class OrganizacionController {
  constructor(private readonly organizacion: OrganizacionService) {}

  @Get('arbol')
  @RequierePermiso(PERMISO.ORGANIZACION_VER)
  arbol() {
    return this.organizacion.arbol();
  }

  @Get(':id')
  @RequierePermiso(PERMISO.ORGANIZACION_VER)
  obtener(@Param('id') id: string) {
    return this.organizacion.obtener(id);
  }

  @Post()
  @RequierePermiso(PERMISO.ORGANIZACION_CREAR)
  crear(@Body() dto: CrearUnidadDto, @CurrentUser() actor: UsuarioActual) {
    return this.organizacion.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.ORGANIZACION_EDITAR)
  editar(
    @Param('id') id: string,
    @Body() dto: EditarUnidadDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.organizacion.editar(id, dto, actor);
  }

  @Post(':id/activar')
  @RequierePermiso(PERMISO.ORGANIZACION_ACTIVAR)
  activar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.organizacion.cambiarEstado(id, true, actor);
  }

  @Post(':id/desactivar')
  @RequierePermiso(PERMISO.ORGANIZACION_ACTIVAR)
  desactivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.organizacion.cambiarEstado(id, false, actor);
  }
}
