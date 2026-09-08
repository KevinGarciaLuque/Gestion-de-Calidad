import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../config/configuration';
import { UsuarioContextoService } from './usuario-contexto.service';
import type { UsuarioActual } from './rbac/usuario-actual';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly contexto: UsuarioContextoService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<AppConfig['jwt']>('jwt')!.accessSecret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<UsuarioActual> {
    const usuario = await this.contexto.construir(payload.sub);
    if (!usuario) {
      throw new UnauthorizedException('Sesión no válida');
    }
    return usuario;
  }
}
