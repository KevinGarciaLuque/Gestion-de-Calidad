import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import {
  CerrarRiesgoDto,
  ConfigurarMatrizDto,
  CrearRiesgoDto,
  EditarRiesgoDto,
  ListarRiesgosQuery,
  ReevaluarRiesgoDto,
  RevisarRiesgoDto,
} from './dto/riesgo.dto';
import { RiesgosService } from './riesgos.service';

@Controller('riesgos')
export class RiesgosController {
  constructor(private readonly riesgos: RiesgosService) {}

  @Get('matriz')
  @RequierePermiso(PERMISO.RIESGOS_VER)
  matriz() {
    return this.riesgos.matriz();
  }

  @Patch('matriz')
  @RequierePermiso(PERMISO.RIESGOS_CONFIGURAR)
  configurarMatriz(@Body() dto: ConfigurarMatrizDto, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.configurarMatriz(dto, actor);
  }

  @Get()
  @RequierePermiso(PERMISO.RIESGOS_VER)
  listar(@Query() q: ListarRiesgosQuery, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.listar(q, actor);
  }

  @Get('mapa-calor')
  @RequierePermiso(PERMISO.RIESGOS_VER)
  mapaCalor(
    @Query('tipo') tipo: 'RIESGO' | 'OPORTUNIDAD' = 'RIESGO',
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.riesgos.mapaCalor(actor, tipo === 'OPORTUNIDAD' ? 'OPORTUNIDAD' : 'RIESGO');
  }

  @Get('transversales')
  @RequierePermiso(PERMISO.RIESGOS_VER)
  transversales(@CurrentUser() actor: UsuarioActual) {
    return this.riesgos.transversales(actor);
  }

  @Get(':id')
  @RequierePermiso(PERMISO.RIESGOS_VER)
  obtener(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.obtener(id, actor);
  }

  @Post()
  @RequierePermiso(PERMISO.RIESGOS_CREAR)
  crear(@Body() dto: CrearRiesgoDto, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.RIESGOS_EDITAR)
  editar(@Param('id') id: string, @Body() dto: EditarRiesgoDto, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.editar(id, dto, actor);
  }

  @Post(':id/reevaluar')
  @RequierePermiso(PERMISO.RIESGOS_EDITAR)
  reevaluar(
    @Param('id') id: string,
    @Body() dto: ReevaluarRiesgoDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.riesgos.reevaluar(id, dto, actor);
  }

  @Post(':id/revisar')
  @RequierePermiso(PERMISO.RIESGOS_EDITAR)
  revisar(@Param('id') id: string, @Body() dto: RevisarRiesgoDto, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.revisar(id, dto, actor);
  }

  @Post(':id/solicitar-reevaluacion')
  @RequierePermiso(PERMISO.RIESGOS_EDITAR)
  solicitarReevaluacion(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.marcarReevaluacion(id, true, actor);
  }

  @Post(':id/cerrar')
  @RequierePermiso(PERMISO.RIESGOS_CERRAR)
  cerrar(@Param('id') id: string, @Body() dto: CerrarRiesgoDto, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.cerrar(id, dto, actor);
  }

  @Post(':id/reabrir')
  @RequierePermiso(PERMISO.RIESGOS_CERRAR)
  reabrir(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.reabrir(id, actor);
  }

  @Post(':id/archivar')
  @RequierePermiso(PERMISO.RIESGOS_ARCHIVAR)
  archivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.archivar(id, true, actor);
  }

  @Post(':id/desarchivar')
  @RequierePermiso(PERMISO.RIESGOS_ARCHIVAR)
  desarchivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.riesgos.archivar(id, false, actor);
  }
}
