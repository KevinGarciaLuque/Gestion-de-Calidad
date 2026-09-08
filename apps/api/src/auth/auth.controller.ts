import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config/configuration';
import { AuthService, type ResultadoSesion } from './auth.service';
import { limpiarRefreshCookie, ponerRefreshCookie, type RefreshCookieCfg } from './cookies';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser, Public } from './rbac/decorators';
import type { UsuarioActual } from './rbac/usuario-actual';
import { TokensService } from './tokens.service';

function datosCliente(req: Request) {
  return {
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

@Controller('auth')
export class AuthController {
  private readonly cookieCfg: RefreshCookieCfg;

  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
    config: ConfigService,
  ) {
    this.cookieCfg = config.get<AppConfig['refreshCookie']>('refreshCookie')!;
  }

  private responder(res: Response, resultado: ResultadoSesion) {
    ponerRefreshCookie(res, this.cookieCfg, resultado.tokens.refreshToken, this.tokens.refreshTtlMs);
    return {
      usuario: resultado.usuario,
      accessToken: resultado.tokens.accessToken,
      expiraEn: resultado.tokens.expiraEn,
    };
  }

  private leerRefresh(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[this.cookieCfg.name];
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.responder(res, await this.auth.login(dto, datosCliente(req)));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.leerRefresh(req);
    if (!token) throw new UnauthorizedException('Sin sesión');
    return this.responder(res, await this.auth.refresh(token, datosCliente(req)));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() usuario: UsuarioActual,
  ) {
    await this.auth.logout(this.leerRefresh(req), usuario);
    limpiarRefreshCookie(res, this.cookieCfg);
  }

  @Get('me')
  me(@CurrentUser() usuario: UsuarioActual): UsuarioActual {
    return usuario;
  }

  @Post('cambiar-password')
  @HttpCode(204)
  async cambiarPassword(
    @CurrentUser() usuario: UsuarioActual,
    @Body() dto: CambiarPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.cambiarPassword(usuario, dto);
    limpiarRefreshCookie(res, this.cookieCfg);
  }
}
