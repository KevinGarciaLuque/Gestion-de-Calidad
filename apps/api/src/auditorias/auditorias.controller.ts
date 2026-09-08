import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { AuditoriasService } from './auditorias.service';
import {
  CancelarDto,
  CrearAuditoriaDto,
  CrearProgramaDto,
  EditarAuditoriaDto,
  EditarProgramaDto,
  GenerarHallazgoDto,
  InformeDto,
  ItemChecklistDto,
  ListarAuditoriasQuery,
  ReprogramarDto,
  ResultadoItemDto,
} from './dto/auditoria.dto';

@Controller('auditorias')
export class AuditoriasController {
  constructor(
    private readonly auditorias: AuditoriasService,
    private readonly evidencias: EvidenciasService,
  ) {}

  // Programa
  @Get('programa/:anio')
  @RequierePermiso(PERMISO.AUDITORIAS_VER)
  programa(@Param('anio', ParseIntPipe) anio: number, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.programa(anio, actor);
  }

  @Post('programa')
  @RequierePermiso(PERMISO.AUDITORIAS_PLANIFICAR)
  crearPrograma(@Body() dto: CrearProgramaDto, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.crearPrograma(dto, actor);
  }

  @Patch('programa/:id')
  @RequierePermiso(PERMISO.AUDITORIAS_PLANIFICAR)
  editarPrograma(@Param('id') id: string, @Body() dto: EditarProgramaDto, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.editarPrograma(id, dto, actor);
  }

  @Post('programa/:id/aprobar')
  @RequierePermiso(PERMISO.AUDITORIAS_PLANIFICAR)
  aprobarPrograma(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.aprobarPrograma(id, actor);
  }

  // Auditorías
  @Get()
  @RequierePermiso(PERMISO.AUDITORIAS_VER)
  listar(@Query() q: ListarAuditoriasQuery, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.listar(q, actor);
  }

  @Get(':id')
  @RequierePermiso(PERMISO.AUDITORIAS_VER)
  obtener(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.obtener(id, actor);
  }

  @Post()
  @RequierePermiso(PERMISO.AUDITORIAS_PLANIFICAR)
  crear(@Body() dto: CrearAuditoriaDto, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.AUDITORIAS_PLANIFICAR)
  editar(@Param('id') id: string, @Body() dto: EditarAuditoriaDto, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.editar(id, dto, actor);
  }

  @Post(':id/reprogramar')
  @RequierePermiso(PERMISO.AUDITORIAS_PLANIFICAR)
  reprogramar(@Param('id') id: string, @Body() dto: ReprogramarDto, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.reprogramar(id, dto, actor);
  }

  @Post(':id/cancelar')
  @RequierePermiso(PERMISO.AUDITORIAS_CERRAR)
  cancelar(@Param('id') id: string, @Body() dto: CancelarDto, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.cancelar(id, dto, actor);
  }

  // Checklist
  @Post(':id/items')
  @RequierePermiso(PERMISO.AUDITORIAS_EJECUTAR)
  agregarItem(@Param('id') id: string, @Body() dto: ItemChecklistDto, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.agregarItem(id, dto, actor);
  }

  @Delete(':id/items/:itemId')
  @RequierePermiso(PERMISO.AUDITORIAS_EJECUTAR)
  quitarItem(@Param('id') id: string, @Param('itemId') itemId: string, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.quitarItem(id, itemId, actor);
  }

  @Post(':id/iniciar')
  @RequierePermiso(PERMISO.AUDITORIAS_EJECUTAR)
  iniciar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.iniciar(id, actor);
  }

  @Patch(':id/items/:itemId/resultado')
  @RequierePermiso(PERMISO.AUDITORIAS_EJECUTAR)
  resultado(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: ResultadoItemDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.auditorias.registrarResultado(id, itemId, dto, actor);
  }

  @Post(':id/finalizar')
  @RequierePermiso(PERMISO.AUDITORIAS_EJECUTAR)
  finalizar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.finalizarEjecucion(id, actor);
  }

  @Post(':id/items/:itemId/hallazgo')
  @RequierePermiso(PERMISO.AUDITORIAS_EJECUTAR)
  generarHallazgo(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: GenerarHallazgoDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.auditorias.generarHallazgo(id, itemId, dto, actor);
  }

  // Informe
  @Put(':id/informe')
  @RequierePermiso(PERMISO.AUDITORIAS_EJECUTAR)
  editarInforme(@Param('id') id: string, @Body() dto: InformeDto, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.editarInforme(id, dto, actor);
  }

  @Post(':id/informe/aprobar')
  @RequierePermiso(PERMISO.AUDITORIAS_APROBAR_INFORME)
  aprobarInforme(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.aprobarInforme(id, actor);
  }

  @Post(':id/cerrar')
  @RequierePermiso(PERMISO.AUDITORIAS_CERRAR)
  cerrar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.auditorias.cerrar(id, actor);
  }

  // Evidencias del checklist
  @Get('items/:itemId/evidencias')
  @RequierePermiso(PERMISO.AUDITORIAS_VER)
  listarEvidencias(@Param('itemId') itemId: string) {
    return this.evidencias.listar('AuditoriaItem', itemId);
  }

  @Post('items/:itemId/evidencias')
  @RequierePermiso(PERMISO.AUDITORIAS_EJECUTAR)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 26 * 1024 * 1024 } }))
  agregarEvidencia(
    @Param('itemId') itemId: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body('descripcion') descripcion: string | undefined,
    @CurrentUser() actor: UsuarioActual,
  ) {
    if (!archivo) throw new BadRequestException('No se recibió ningún archivo');
    return this.evidencias.agregar('AuditoriaItem', itemId, archivo, descripcion, actor);
  }

  @Delete('items/:itemId/evidencias/:evidenciaId')
  @RequierePermiso(PERMISO.AUDITORIAS_EJECUTAR)
  quitarEvidencia(
    @Param('itemId') itemId: string,
    @Param('evidenciaId') evidenciaId: string,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.evidencias.eliminar('AuditoriaItem', itemId, evidenciaId, actor);
  }

  @Get('items/:itemId/evidencias/:evidenciaId/archivo')
  @RequierePermiso(PERMISO.AUDITORIAS_VER)
  async descargarEvidencia(
    @Param('itemId') itemId: string,
    @Param('evidenciaId') evidenciaId: string,
    @Res() res: Response,
  ) {
    const { stream, nombre, mimeType, tamano } = await this.evidencias.paraDescarga(
      'AuditoriaItem',
      itemId,
      evidenciaId,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', tamano);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombre)}"`);
    stream.pipe(res);
  }
}
