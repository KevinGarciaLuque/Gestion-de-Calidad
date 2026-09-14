import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { RespaldosService } from './respaldos.service';

@Controller('respaldos')
@RequierePermiso(PERMISO.RESPALDOS_GESTIONAR)
export class RespaldosController {
  constructor(private readonly respaldos: RespaldosService) {}

  @Get()
  listar() {
    return this.respaldos.listar();
  }

  @Post()
  crear(@CurrentUser() actor: UsuarioActual) {
    return this.respaldos.crear(true, { id: actor.id, email: actor.email });
  }

  @Get(':nombre/archivo')
  async descargar(@Param('nombre') nombre: string, @Res() res: Response) {
    const { stream, tamano } = await this.respaldos.archivoParaDescarga(nombre);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Length', tamano);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombre)}"`);
    stream.pipe(res);
  }
}
