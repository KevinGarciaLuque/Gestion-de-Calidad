import { Controller, Get } from '@nestjs/common';
import { RequierePermiso } from '../auth/rbac/decorators';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @RequierePermiso(PERMISO.DASHBOARD_VER)
  resumen() {
    return this.dashboard.resumen();
  }
}
