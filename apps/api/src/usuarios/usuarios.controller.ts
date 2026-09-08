import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import {
  AsignarRolDto,
  CrearUsuarioDto,
  EditarUsuarioDto,
  ListarUsuariosQuery,
} from './dto/usuario.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  @RequierePermiso(PERMISO.USUARIOS_VER)
  listar(@Query() q: ListarUsuariosQuery) {
    return this.usuarios.listar(q);
  }

  @Get(':id')
  @RequierePermiso(PERMISO.USUARIOS_VER)
  obtener(@Param('id') id: string) {
    return this.usuarios.obtener(id);
  }

  @Post()
  @RequierePermiso(PERMISO.USUARIOS_CREAR)
  crear(@Body() dto: CrearUsuarioDto, @CurrentUser() actor: UsuarioActual) {
    return this.usuarios.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.USUARIOS_EDITAR)
  editar(
    @Param('id') id: string,
    @Body() dto: EditarUsuarioDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.usuarios.editar(id, dto, actor);
  }

  @Post(':id/activar')
  @RequierePermiso(PERMISO.USUARIOS_ACTIVAR)
  activar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.usuarios.cambiarEstado(id, true, actor);
  }

  @Post(':id/desactivar')
  @RequierePermiso(PERMISO.USUARIOS_ACTIVAR)
  desactivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.usuarios.cambiarEstado(id, false, actor);
  }

  @Post(':id/resetear-password')
  @RequierePermiso(PERMISO.USUARIOS_RESETEAR_PASSWORD)
  resetear(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.usuarios.resetearPassword(id, actor);
  }

  @Post(':id/roles')
  @RequierePermiso(PERMISO.USUARIOS_ASIGNAR_ROLES)
  asignarRol(
    @Param('id') id: string,
    @Body() dto: AsignarRolDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.usuarios.asignarRol(id, dto, actor);
  }

  @Delete(':id/roles/:usuarioRolId')
  @HttpCode(204)
  @RequierePermiso(PERMISO.USUARIOS_ASIGNAR_ROLES)
  quitarRol(
    @Param('id') id: string,
    @Param('usuarioRolId') usuarioRolId: string,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.usuarios.quitarRol(id, usuarioRolId, actor);
  }
}
