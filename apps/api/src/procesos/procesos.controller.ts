import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { GuardarFichaDto } from './dto/ficha.dto';
import {
  AprobarDto,
  CrearProcesoDto,
  CrearRelacionDto,
  EditarProcesoDto,
  ListarProcesosQuery,
  RevisionDto,
} from './dto/proceso.dto';
import { ProcesosService } from './procesos.service';

@Controller('procesos')
export class ProcesosController {
  constructor(private readonly procesos: ProcesosService) {}

  @Get()
  @RequierePermiso(PERMISO.PROCESOS_VER)
  listar(@Query() q: ListarProcesosQuery, @CurrentUser() actor: UsuarioActual) {
    return this.procesos.listar(q, actor);
  }

  @Get('mapa')
  @RequierePermiso(PERMISO.PROCESOS_VER)
  mapa(@CurrentUser() actor: UsuarioActual) {
    return this.procesos.mapa(actor);
  }

  @Get(':id')
  @RequierePermiso(PERMISO.PROCESOS_VER)
  obtener(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.procesos.obtener(id, actor);
  }

  @Post()
  @RequierePermiso(PERMISO.PROCESOS_CREAR)
  crear(@Body() dto: CrearProcesoDto, @CurrentUser() actor: UsuarioActual) {
    return this.procesos.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.PROCESOS_EDITAR)
  editar(
    @Param('id') id: string,
    @Body() dto: EditarProcesoDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.procesos.editarIdentificacion(id, dto, actor);
  }

  @Put(':id/ficha')
  @RequierePermiso(PERMISO.PROCESOS_EDITAR)
  guardarFicha(
    @Param('id') id: string,
    @Body() dto: GuardarFichaDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.procesos.guardarFicha(id, dto, actor);
  }

  @Post(':id/enviar-revision')
  @RequierePermiso(PERMISO.PROCESOS_EDITAR)
  enviarRevision(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.procesos.enviarRevision(id, actor);
  }

  @Post(':id/devolver')
  @RequierePermiso(PERMISO.PROCESOS_REVISAR)
  devolver(
    @Param('id') id: string,
    @Body() dto: RevisionDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.procesos.devolver(id, dto, actor);
  }

  @Post(':id/aprobar')
  @RequierePermiso(PERMISO.PROCESOS_APROBAR)
  aprobar(@Param('id') id: string, @Body() dto: AprobarDto, @CurrentUser() actor: UsuarioActual) {
    return this.procesos.aprobar(id, dto, actor);
  }

  @Post(':id/archivar')
  @RequierePermiso(PERMISO.PROCESOS_ARCHIVAR)
  archivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.procesos.archivar(id, true, actor);
  }

  @Post(':id/desarchivar')
  @RequierePermiso(PERMISO.PROCESOS_ARCHIVAR)
  desarchivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.procesos.archivar(id, false, actor);
  }

  @Post(':id/relaciones')
  @RequierePermiso(PERMISO.PROCESOS_EDITAR)
  agregarRelacion(
    @Param('id') id: string,
    @Body() dto: CrearRelacionDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.procesos.agregarRelacion(id, dto, actor);
  }

  @Delete(':id/relaciones/:relacionId')
  @RequierePermiso(PERMISO.PROCESOS_EDITAR)
  quitarRelacion(
    @Param('id') id: string,
    @Param('relacionId') relacionId: string,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.procesos.quitarRelacion(id, relacionId, actor);
  }
}
