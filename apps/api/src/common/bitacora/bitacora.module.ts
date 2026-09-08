import { Global, Module } from '@nestjs/common';
import { BitacoraController } from './bitacora.controller';
import { BitacoraQueryService } from './bitacora.query';
import { BitacoraService } from './bitacora.service';

@Global()
@Module({
  controllers: [BitacoraController],
  providers: [BitacoraService, BitacoraQueryService],
  exports: [BitacoraService],
})
export class BitacoraModule {}
