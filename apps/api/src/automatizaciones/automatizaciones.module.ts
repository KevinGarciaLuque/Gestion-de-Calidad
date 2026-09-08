import { Module } from '@nestjs/common';
import { AutomatizacionesController } from './automatizaciones.controller';
import { AutomatizacionesService } from './automatizaciones.service';

@Module({
  controllers: [AutomatizacionesController],
  providers: [AutomatizacionesService],
})
export class AutomatizacionesModule {}
