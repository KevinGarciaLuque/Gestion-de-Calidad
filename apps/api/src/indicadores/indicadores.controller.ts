import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import {
  AnalizarMedicionDto,
  ConsolidadoQuery,
  CrearIndicadorDto,
  EditarIndicadorDto,
  ListarIndicadoresQuery,
  RegistrarMedicionDto,
} from './dto/indicador.dto';
import { IndicadoresService } from './indicadores.service';

@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly indicadores: IndicadoresService) {}

  @Get()
  @RequierePermiso(PERMISO.INDICADORES_VER)
  listar(@Query() q: ListarIndicadoresQuery, @CurrentUser() actor: UsuarioActual) {
    return this.indicadores.listar(q, actor);
  }

  @Get('consolidado')
  @RequierePermiso(PERMISO.INDICADORES_VER)
  consolidado(@Query() q: ConsolidadoQuery, @CurrentUser() actor: UsuarioActual) {
    return this.indicadores.consolidado(q, actor);
  }

  @Get(':id')
  @RequierePermiso(PERMISO.INDICADORES_VER)
  obtener(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.indicadores.obtener(id, actor);
  }

  @Post()
  @RequierePermiso(PERMISO.INDICADORES_CREAR)
  crear(@Body() dto: CrearIndicadorDto, @CurrentUser() actor: UsuarioActual) {
    return this.indicadores.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.INDICADORES_EDITAR)
  editar(
    @Param('id') id: string,
    @Body() dto: EditarIndicadorDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.indicadores.editar(id, dto, actor);
  }

  @Post(':id/archivar')
  @RequierePermiso(PERMISO.INDICADORES_ARCHIVAR)
  archivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.indicadores.archivar(id, true, actor);
  }

  @Post(':id/desarchivar')
  @RequierePermiso(PERMISO.INDICADORES_ARCHIVAR)
  desarchivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.indicadores.archivar(id, false, actor);
  }

  @Post(':id/mediciones')
  @RequierePermiso(PERMISO.INDICADORES_CAPTURAR)
  registrarMedicion(
    @Param('id') id: string,
    @Body() dto: RegistrarMedicionDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.indicadores.registrarMedicion(id, dto, actor);
  }

  @Patch(':id/mediciones/:medicionId/analisis')
  @RequierePermiso(PERMISO.INDICADORES_ANALIZAR)
  analizarMedicion(
    @Param('id') id: string,
    @Param('medicionId') medicionId: string,
    @Body() dto: AnalizarMedicionDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.indicadores.analizarMedicion(id, medicionId, dto, actor);
  }

  @Delete(':id/mediciones/:medicionId')
  @RequierePermiso(PERMISO.INDICADORES_CAPTURAR)
  eliminarMedicion(
    @Param('id') id: string,
    @Param('medicionId') medicionId: string,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.indicadores.eliminarMedicion(id, medicionId, actor);
  }
}
