import {
  BadRequestException,
  Body,
  Controller,
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
import { DocumentosService } from './documentos.service';
import {
  CrearDocumentoDto,
  EditarDocumentoDto,
  GuardarVersionDto,
  ListarDocumentosQuery,
  RevisionDocumentoDto,
} from './dto/documento.dto';

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentos: DocumentosService) {}

  @Get()
  @RequierePermiso(PERMISO.DOCUMENTOS_VER)
  listar(@Query() q: ListarDocumentosQuery, @CurrentUser() actor: UsuarioActual) {
    return this.documentos.listar(q, actor);
  }

  @Get('lista-maestra')
  @RequierePermiso(PERMISO.DOCUMENTOS_VER)
  listaMaestra(@CurrentUser() actor: UsuarioActual) {
    return this.documentos.listaMaestra(actor);
  }

  @Get(':id')
  @RequierePermiso(PERMISO.DOCUMENTOS_VER)
  obtener(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.documentos.obtener(id, actor);
  }

  @Get(':id/versiones/:versionId/archivo')
  @RequierePermiso(PERMISO.DOCUMENTOS_VER)
  async descargar(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser() actor: UsuarioActual,
    @Res() res: Response,
  ) {
    const { stream, nombre, mimeType, tamano } = await this.documentos.archivoParaDescarga(
      id,
      versionId,
      actor,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', tamano);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(nombre)}"`,
    );
    stream.pipe(res);
  }

  @Post()
  @RequierePermiso(PERMISO.DOCUMENTOS_CREAR)
  crear(@Body() dto: CrearDocumentoDto, @CurrentUser() actor: UsuarioActual) {
    return this.documentos.crear(dto, actor);
  }

  @Patch(':id')
  @RequierePermiso(PERMISO.DOCUMENTOS_EDITAR)
  editar(@Param('id') id: string, @Body() dto: EditarDocumentoDto, @CurrentUser() actor: UsuarioActual) {
    return this.documentos.editar(id, dto, actor);
  }

  @Post(':id/archivar')
  @RequierePermiso(PERMISO.DOCUMENTOS_ARCHIVAR)
  archivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.documentos.archivar(id, true, actor);
  }

  @Post(':id/desarchivar')
  @RequierePermiso(PERMISO.DOCUMENTOS_ARCHIVAR)
  desarchivar(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.documentos.archivar(id, false, actor);
  }

  @Put(':id/version')
  @RequierePermiso(PERMISO.DOCUMENTOS_EDITAR)
  guardarVersion(
    @Param('id') id: string,
    @Body() dto: GuardarVersionDto,
    @CurrentUser() actor: UsuarioActual,
  ) {
    return this.documentos.guardarVersion(id, dto, actor);
  }

  @Post(':id/archivo')
  @RequierePermiso(PERMISO.DOCUMENTOS_EDITAR)
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: 26 * 1024 * 1024 },
    }),
  )
  subirArchivo(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() actor: UsuarioActual,
  ) {
    if (!archivo) throw new BadRequestException('No se recibió ningún archivo');
    return this.documentos.subirArchivo(id, archivo, actor);
  }

  @Post(':id/enviar-revision')
  @RequierePermiso(PERMISO.DOCUMENTOS_EDITAR)
  enviarRevision(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    return this.documentos.enviarRevision(id, actor);
  }

  @Post(':id/devolver')
  @RequierePermiso(PERMISO.DOCUMENTOS_REVISAR)
  devolver(@Param('id') id: string, @Body() dto: RevisionDocumentoDto, @CurrentUser() actor: UsuarioActual) {
    return this.documentos.devolver(id, dto, actor);
  }

  @Post(':id/aprobar')
  @RequierePermiso(PERMISO.DOCUMENTOS_APROBAR)
  aprobar(@Param('id') id: string, @Body() dto: RevisionDocumentoDto, @CurrentUser() actor: UsuarioActual) {
    return this.documentos.aprobar(id, dto, actor);
  }
}
