import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { EvidenciasService } from '../evidencias/evidencias.service';
import {
  AprobarPlanDto,
  ComentarioDto,
  CompletarAccionesDto,
  GuardarAnalisisDto,
  PlanAccionDto,
  ReabrirDto,
  ValidarHallazgoDto,
  VerificarEficaciaDto,
} from './dto/analisis.dto';
import { CrearHallazgoDto, EditarHallazgoDto, ListarHallazgosQuery } from './dto/hallazgo.dto';
import { HallazgosService } from './hallazgos.service';

@Controller('hallazgos')
export class HallazgosController {
  constructor(
    private readonly hallazgos: HallazgosService,
    private readonly evidencias: EvidenciasService,
  ) {}

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

  // Análisis y plan
  @Put(':id/analisis')
  @RequierePermiso(PERMISO.HALLAZGOS_EDITAR)
  guardarAnalisis(@Param('id') id: string, @Body() dto: GuardarAnalisisDto, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.guardarAnalisis(id, dto, actor);
  }

  @Put(':id/plan')
  @RequierePermiso(PERMISO.HALLAZGOS_EDITAR)
  guardarPlan(@Param('id') id: string, @Body() dto: PlanAccionDto, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.guardarPlan(id, dto, actor);
  }

  @Post(':id/comentario')
  @RequierePermiso(PERMISO.HALLAZGOS_VER)
  comentar(@Param('id') id: string, @Body() dto: ComentarioDto, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.comentar(id, dto, actor);
  }

  // Transiciones de estado
  @Post(':id/validar')
  @RequierePermiso(PERMISO.HALLAZGOS_CERRAR)
  validar(@Param('id') id: string, @Body() dto: ValidarHallazgoDto, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.validar(id, dto, actor);
  }

  @Post(':id/aprobar-plan')
  @RequierePermiso(PERMISO.HALLAZGOS_CERRAR)
  aprobarPlan(@Param('id') id: string, @Body() dto: AprobarPlanDto, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.aprobarPlan(id, dto, actor);
  }

  @Post(':id/iniciar-ejecucion')
  @RequierePermiso(PERMISO.HALLAZGOS_EDITAR)
  iniciarEjecucion(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.iniciarEjecucion(id, actor);
  }

  @Post(':id/completar-acciones')
  @RequierePermiso(PERMISO.HALLAZGOS_EDITAR)
  completarAcciones(@Param('id') id: string, @Body() dto: CompletarAccionesDto, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.completarAcciones(id, dto, actor);
  }

  @Post(':id/verificar-eficacia')
  @RequierePermiso(PERMISO.HALLAZGOS_CERRAR)
  verificarEficacia(@Param('id') id: string, @Body() dto: VerificarEficaciaDto, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.verificarEficacia(id, dto, actor);
  }

  @Post(':id/reabrir')
  @RequierePermiso(PERMISO.HALLAZGOS_CERRAR)
  reabrir(@Param('id') id: string, @Body() dto: ReabrirDto, @CurrentUser() actor: UsuarioActual) {
    return this.hallazgos.reabrir(id, dto, actor);
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

  // Evidencias del hallazgo
  @Get(':id/evidencias')
  @RequierePermiso(PERMISO.HALLAZGOS_VER)
  listarEvidencias(@Param('id') id: string) {
    return this.evidencias.listar('Hallazgo', id);
  }

  @Post(':id/evidencias')
  @RequierePermiso(PERMISO.HALLAZGOS_EDITAR)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 26 * 1024 * 1024 } }))
  agregarEvidencia(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body('descripcion') descripcion: string | undefined,
    @CurrentUser() actor: UsuarioActual,
  ) {
    if (!archivo) throw new BadRequestException('No se recibió ningún archivo');
    return this.evidencias.agregar('Hallazgo', id, archivo, descripcion, actor);
  }

  @Delete(':id/evidencias/:evidenciaId')
  @RequierePermiso(PERMISO.HALLAZGOS_EDITAR)
  quitarEvidencia(
    @Param('id') id: string,
    @Param('evidenciaId') evidenciaId: string,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.evidencias.eliminar('Hallazgo', id, evidenciaId, actor);
  }

  @Get(':id/evidencias/:evidenciaId/archivo')
  @RequierePermiso(PERMISO.HALLAZGOS_VER)
  async descargarEvidencia(
    @Param('id') id: string,
    @Param('evidenciaId') evidenciaId: string,
    @Res() res: Response,
  ) {
    const { stream, nombre, mimeType, tamano } = await this.evidencias.paraDescarga('Hallazgo', id, evidenciaId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', tamano);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombre)}"`);
    stream.pipe(res);
  }
}
