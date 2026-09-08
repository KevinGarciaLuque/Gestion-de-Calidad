import { Module } from '@nestjs/common';
import { AccionesModule } from '../acciones/acciones.module';
import { HallazgosController } from './hallazgos.controller';
import { HallazgosService } from './hallazgos.service';

@Module({
  imports: [AccionesModule],
  controllers: [HallazgosController],
  providers: [HallazgosService],
})
export class HallazgosModule {}
