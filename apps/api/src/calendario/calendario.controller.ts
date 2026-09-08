import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/rbac/decorators';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { CalendarioService } from './calendario.service';

@Controller('calendario')
export class CalendarioController {
  constructor(private readonly calendario: CalendarioService) {}

  @Get()
  eventos(
    @CurrentUser() actor: UsuarioActual,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const d = desde ? new Date(desde) : new Date(Date.now() - 30 * 86_400_000);
    const h = hasta ? new Date(hasta) : new Date(Date.now() + 90 * 86_400_000);
    if (isNaN(d.getTime()) || isNaN(h.getTime())) throw new BadRequestException('Fechas no válidas');
    return this.calendario.eventos(actor, d, h);
  }
}
