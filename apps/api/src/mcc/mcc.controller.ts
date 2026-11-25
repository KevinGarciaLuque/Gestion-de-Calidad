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
import {
  CerrarMCCDto,
  ComentarMCCDto,
  CrearMCCDto,
  DecidirMCCDto,
  EdicionRapidaMCCDto,
  EditarMCCDto,
  FiltrosControlQuery,
  ImportarMCCQuery,
  ListarControlQuery,
  ListarMCCQuery,
} from './dto/mcc.dto';
import { MccService } from './mcc.service';

@Controller('mcc')
export class MccController {
  constructor(
    private readonly mcc: MccService,
    private readonly evidencias: EvidenciasService,
  ) {}

  @Get()
  @RequierePermiso(PERMISO.MCC_VER)
  listar(@Query() q: ListarMCCQuery, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.listar(q, actor);
  }

  // ── Control MCC (rutas fijas antes de ':id') ─────────────────────────────
  @Get('control/tablero')
  @RequierePermiso(PERMISO.MCC_VER)
  tablero(@Query() q: FiltrosControlQuery, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.tablero(q, actor);
  }

  @Get('control/registros')
  @RequierePermiso(PERMISO.MCC_VER)
  listarControl(@Query() q: ListarControlQuery, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.listarControl(q, actor);
  }

  @Get('control/catalogos')
  @RequierePermiso(PERMISO.MCC_VER)
  catalogos() {
    return this.mcc.catalogos();
  }

  @Post('control/importar')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }))
  importar(
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Query() q: ImportarMCCQuery,
    @CurrentUser() actor: UsuarioActual,
  ) {
    if (!archivo) throw new BadRequestException('No se recibió ningún archivo');
    if (!/\.(csv|txt)$/i.test(archivo.originalname)) {
      throw new BadRequestException('Sube el histórico como CSV (en Google Sheets: Archivo › Descargar › Valores separados por comas).');
    }
    return this.mcc.importar(archivo.buffer, q.simular === 'true', actor);
  }

  @Patch('control/:id')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  edicionRapida(@Param('id') id: string, @Body() dto: EdicionRapidaMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.edicionRapida(id, dto, actor);
  }

  // ── Registro individual ─────────────────────────────────────────────────
  @Get(':id')
  @RequierePermiso(PERMISO.MCC_VER)
  obtener(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.obtener(id, actor);
  }

  @Post()
  @RequierePermiso(PERMISO.MCC_CREAR)
  crear(@Body() dto: CrearMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.MCC_VER)
  editar(@Param('id') id: string, @Body() dto: EditarMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.editar(id, dto, actor);
  }

  @Post(':id/decidir')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  decidir(@Param('id') id: string, @Body() dto: DecidirMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.decidir(id, dto, actor);
  }

  @Post(':id/iniciar-ejecucion')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  iniciar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.iniciarEjecucion(id, actor);
  }

  @Post(':id/verificacion')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  verificacion(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.pasarVerificacion(id, actor);
  }

  @Post(':id/cerrar')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  cerrar(@Param('id') id: string, @Body() dto: CerrarMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.cerrar(id, dto, actor);
  }

  @Post(':id/comentario')
  @RequierePermiso(PERMISO.MCC_VER)
  comentar(@Param('id') id: string, @Body() dto: ComentarMCCDto, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.comentar(id, dto, actor);
  }

  @Post(':id/archivar')
  @RequierePermiso(PERMISO.MCC_GESTIONAR)
  archivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.mcc.archivar(id, true, actor);
  }

  // ── Evidencias (imagen o PDF del registro) ──────────────────────────────
  @Get(':id/evidencias')
  @RequierePermiso(PERMISO.MCC_VER)
  async listarEvidencias(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    await this.mcc.exigeAcceso(id, actor);
    return this.evidencias.listar('RegistroMCC', id);
  }

  @Post(':id/evidencias')
  @RequierePermiso(PERMISO.MCC_VER)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 26 * 1024 * 1024 } }))
  async agregarEvidencia(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body('descripcion') descripcion: string | undefined,
    @CurrentUser() actor: UsuarioActual,
  ) {
    if (!archivo) throw new BadRequestException('No se recibió ningún archivo');
    await this.mcc.exigeAcceso(id, actor, true);
    return this.evidencias.agregar('RegistroMCC', id, archivo, descripcion, actor);
  }

  @Delete(':id/evidencias/:evidenciaId')
  @RequierePermiso(PERMISO.MCC_VER)
  async quitarEvidencia(@Param('id') id: string, @Param('evidenciaId') evidenciaId: string, @CurrentUser() actor: UsuarioActual) {
    await this.mcc.exigeAcceso(id, actor, true);
    return this.evidencias.eliminar('RegistroMCC', id, evidenciaId, actor);
  }

  @Get(':id/evidencias/:evidenciaId/archivo')
  @RequierePermiso(PERMISO.MCC_VER)
  async descargarEvidencia(
    @Param('id') id: string,
    @Param('evidenciaId') evidenciaId: string,
    @CurrentUser() actor: UsuarioActual,
    @Res() res: Response,
  ) {
    await this.mcc.exigeAcceso(id, actor);
    const { stream, nombre, mimeType, tamano } = await this.evidencias.paraDescarga('RegistroMCC', id, evidenciaId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', tamano);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombre)}"`);
    stream.pipe(res);
  }
}
