import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { EncuestasController } from './encuestas.controller';
import { EncuestasService } from './encuestas.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }])],
  controllers: [EncuestasController],
  providers: [EncuestasService],
})
export class EncuestasModule {}
