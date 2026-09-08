import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { AccionesService } from './acciones.service';
import {
  AvanceDto,
  CancelarAccionDto,
  CrearAccionDto,
  EditarAccionDto,
  ListarAccionesQuery,
  VerificarAccionDto,
} from './dto/accion.dto';

@Controller('acciones')
export class AccionesController {
  constructor(
    private readonly acciones: AccionesService,
    private readonly evidencias: EvidenciasService,
  ) {}

  @Get()
  @RequierePermiso(PERMISO.ACCIONES_VER)
  listar(@Query() q: ListarAccionesQuery, @CurrentUser() actor: UsuarioActual) {
    return this.acciones.listar(q, actor);
  }

  @Get(':id')
  @RequierePermiso(PERMISO.ACCIONES_VER)
  obtener(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.acciones.obtener(id, actor);
  }

  @Post()
  @RequierePermiso(PERMISO.ACCIONES_CREAR)
  crear(@Body() dto: CrearAccionDto, @CurrentUser() actor: UsuarioActual) {
    return this.acciones.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.ACCIONES_EDITAR)
  editar(@Param('id') id: string, @Body() dto: EditarAccionDto, @CurrentUser() actor: UsuarioActual) {
    return this.acciones.editar(id, dto, actor);
  }

  @Post(':id/avance')
  @RequierePermiso(PERMISO.ACCIONES_EDITAR)
  avance(@Param('id') id: string, @Body() dto: AvanceDto, @CurrentUser() actor: UsuarioActual) {
    return this.acciones.registrarAvance(id, dto, actor);
  }

  @Post(':id/verificar')
  @RequierePermiso(PERMISO.ACCIONES_VERIFICAR)
  verificar(@Param('id') id: string, @Body() dto: VerificarAccionDto, @CurrentUser() actor: UsuarioActual) {
    return this.acciones.verificar(id, dto, actor);
  }

  @Post(':id/cancelar')
  @RequierePermiso(PERMISO.ACCIONES_EDITAR)
  cancelar(@Param('id') id: string, @Body() dto: CancelarAccionDto, @CurrentUser() actor: UsuarioActual) {
    return this.acciones.cancelar(id, dto, actor);
  }

  @Post(':id/archivar')
  @RequierePermiso(PERMISO.ACCIONES_VERIFICAR)
  archivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.acciones.archivar(id, true, actor);
  }

  @Post(':id/desarchivar')
  @RequierePermiso(PERMISO.ACCIONES_VERIFICAR)
  desarchivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.acciones.archivar(id, false, actor);
  }

  // Evidencias
  @Get(':id/evidencias')
  @RequierePermiso(PERMISO.ACCIONES_VER)
  listarEvidencias(@Param('id') id: string) {
    return this.evidencias.listar('Accion', id);
  }

  @Post(':id/evidencias')
  @RequierePermiso(PERMISO.ACCIONES_EDITAR)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 26 * 1024 * 1024 } }))
  agregarEvidencia(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body('descripcion') descripcion: string | undefined,
    @CurrentUser() actor: UsuarioActual,
  ) {
    if (!archivo) throw new BadRequestException('No se recibió ningún archivo');
    return this.evidencias.agregar('Accion', id, archivo, descripcion, actor);
  }

  @Delete(':id/evidencias/:evidenciaId')
  @RequierePermiso(PERMISO.ACCIONES_EDITAR)
  quitarEvidencia(
    @Param('id') id: string,
    @Param('evidenciaId') evidenciaId: string,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.evidencias.eliminar('Accion', id, evidenciaId, actor);
  }

  @Get(':id/evidencias/:evidenciaId/archivo')
  @RequierePermiso(PERMISO.ACCIONES_VER)
  async descargarEvidencia(
    @Param('id') id: string,
    @Param('evidenciaId') evidenciaId: string,
    @Res() res: Response,
  ) {
    const { stream, nombre, mimeType, tamano } = await this.evidencias.paraDescarga('Accion', id, evidenciaId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', tamano);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombre)}"`);
    stream.pipe(res);
  }
}
