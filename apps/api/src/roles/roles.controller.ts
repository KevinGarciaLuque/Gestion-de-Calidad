import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { CrearRolDto, EditarRolDto, FijarPermisosDto } from './dto/rol.dto';
import { RolesService } from './roles.service';

@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('permisos')
  @RequierePermiso(PERMISO.ROLES_VER)
  catalogoPermisos() {
    return this.roles.catalogoPermisos();
  }

  @Get('roles')
  @RequierePermiso(PERMISO.ROLES_VER)
  listar() {
    return this.roles.listar();
  }

  @Get('roles/:codigo')
  @RequierePermiso(PERMISO.ROLES_VER)
  obtener(@Param('codigo') codigo: string) {
    return this.roles.obtener(codigo);
  }

  @Post('roles')
  @RequierePermiso(PERMISO.ROLES_CREAR)
  crear(@Body() dto: CrearRolDto, @CurrentUser() actor: UsuarioActual) {
    return this.roles.crear(dto, actor);
  }

  @Patch('roles/:codigo')
  @RequierePermiso(PERMISO.ROLES_EDITAR)
  editar(
    @Param('codigo') codigo: string,
    @Body() dto: EditarRolDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.roles.editar(codigo, dto, actor);
  }

  @Delete('roles/:codigo')
  @HttpCode(204)
  @RequierePermiso(PERMISO.ROLES_ELIMINAR)
  eliminar(@Param('codigo') codigo: string, @CurrentUser() actor: UsuarioActual) {
    return this.roles.eliminar(codigo, actor);
  }

  @Put('roles/:codigo/permisos')
  @RequierePermiso(PERMISO.ROLES_ASIGNAR_PERMISOS)
  fijarPermisos(
    @Param('codigo') codigo: string,
    @Body() dto: FijarPermisosDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.roles.fijarPermisos(codigo, dto, actor);
  }
}
