import { Global, Module } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';

@Global()
@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
