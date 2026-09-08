import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/rbac/decorators';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly noti: NotificacionesService) {}

  @Get()
  listar(
    @CurrentUser() actor: UsuarioActual,
    @Query('soloNoLeidas') soloNoLeidas?: string,
  ) {
    return this.noti.listar(actor.id, { soloNoLeidas: soloNoLeidas === 'true' });
  }

  @Get('contador')
  contador(@CurrentUser() actor: UsuarioActual) {
    return this.noti.contarNoLeidas(actor.id).then((noLeidas) => ({ noLeidas }));
  }

  @Post(':id/leida')
  @HttpCode(204)
  async leida(@Param('id') id: string, @CurrentUser() actor: UsuarioActual) {
    await this.noti.marcarLeida(actor.id, id);
  }

  @Post('marcar-todas-leidas')
  @HttpCode(204)
  async todas(@CurrentUser() actor: UsuarioActual) {
    await this.noti.marcarTodasLeidas(actor.id);
  }
}
