import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { MccModule } from '../mcc/mcc.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  imports: [DashboardModule, MccModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
