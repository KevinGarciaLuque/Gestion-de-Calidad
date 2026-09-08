import { Global, Module } from '@nestjs/common';
import { EvidenciasService } from './evidencias.service';

@Global()
@Module({
  providers: [EvidenciasService],
  exports: [EvidenciasService],
})
export class EvidenciasModule {}
