import { Controller, Get, Query } from '@nestjs/common';
import { RequierePermiso } from '../../auth/rbac/decorators';
import { PERMISO } from '../../auth/rbac/permisos.catalog';
import { BitacoraQueryService, ListarBitacoraQuery } from './bitacora.query';

@Controller('bitacora')
export class BitacoraController {
  constructor(private readonly bitacora: BitacoraQueryService) {}

  @Get()
  @RequierePermiso(PERMISO.BITACORA_VER)
  listar(@Query() q: ListarBitacoraQuery) {
    return this.bitacora.listar(q);
  }
}
