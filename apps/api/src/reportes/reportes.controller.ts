import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@RequierePermiso(PERMISO.REPORTES_VER)
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get()
  catalogo() {
    return this.reportes.catalogo();
  }

  @Get('ejecutivo')
  ejecutivo() {
    return this.reportes.ejecutivo();
  }

  @Get(':tipo')
  async generar(
    @Param('tipo') tipo: string,
    @Query('formato') formato: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const reporte = await this.reportes.generar(tipo);
    if (formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${tipo}-${reporte.generadoAt.slice(0, 10)}.csv"`,
      );
      return this.reportes.toCsv(reporte);
    }
    return reporte;
  }
}
