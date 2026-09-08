import { Module } from '@nestjs/common';
import { RiesgosController } from './riesgos.controller';
import { RiesgosService } from './riesgos.service';

@Module({
  controllers: [RiesgosController],
  providers: [RiesgosService],
})
export class RiesgosModule {}
