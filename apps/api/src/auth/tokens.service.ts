import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { generarTokenOpaco, hashToken } from './hashing';
import type { AccessTokenPayload } from './jwt.strategy';

interface DatosCliente {
  ip?: string | null;
  userAgent?: string | null;
}

export interface ParTokens {
  usuarioId: string;
  accessToken: string;
  refreshToken: string;
  expiraEn: number; // segundos de vida del access token
}

const TTL_A_MS: Record<string, number> = {};
function ttlEnMs(ttl: string): number {
  if (TTL_A_MS[ttl]) return TTL_A_MS[ttl];
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return 15 * 60_000;
  const n = Number(m[1]);
  const factor = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]]!;
  return (TTL_A_MS[ttl] = n * factor);
}

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);
  private readonly cfg: AppConfig['jwt'];

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.cfg = config.get<AppConfig['jwt']>('jwt')!;
  }

  private firmarAccess(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.cfg.accessSecret,
      // jsonwebtoken acepta cadenas tipo "15m"; el tipo espera number|StringValue.
      expiresIn: this.cfg.accessTtl as unknown as number,
    });
  }

  /** Emite un nuevo par de tokens iniciando una familia de refresh. */
  async emitirParaLogin(
    usuario: { id: string; email: string },
    cliente: DatosCliente,
  ): Promise<ParTokens> {
    return this.emitirPar(usuario, randomUUID(), cliente);
  }

  private async emitirPar(
    usuario: { id: string; email: string },
    familia: string,
    cliente: DatosCliente,
  ): Promise<ParTokens> {
    const refreshToken = generarTokenOpaco();
    const expiraAt = new Date(Date.now() + ttlEnMs(this.cfg.refreshTtl));

    await this.prisma.refreshToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashToken(refreshToken),
        familia,
        expiraAt,
        userAgent: cliente.userAgent ?? null,
        ip: cliente.ip ?? null,
      },
    });

    return {
      usuarioId: usuario.id,
      accessToken: this.firmarAccess({ sub: usuario.id, email: usuario.email }),
      refreshToken,
      expiraEn: Math.floor(ttlEnMs(this.cfg.accessTtl) / 1000),
    };
  }

  /** Rota un refresh token válido. Detecta reutilización y revoca la familia completa. */
  async rotar(refreshTokenPlano: string, cliente: DatosCliente): Promise<ParTokens> {
    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshTokenPlano) },
      include: { usuario: true },
    });

    if (!registro) {
      throw new UnauthorizedException('Refresh token no válido');
    }

    // Token ya rotado o revocado → posible robo: se revoca toda la familia.
    if (registro.revocadoAt || registro.expiraAt < new Date()) {
      await this.prisma.refreshToken.updateMany({
        where: { familia: registro.familia, revocadoAt: null },
        data: { revocadoAt: new Date() },
      });
      this.logger.warn(
        `Reutilización de refresh token detectada (familia ${registro.familia}); familia revocada.`,
      );
      throw new UnauthorizedException('Sesión expirada, vuelve a iniciar sesión');
    }

    if (!registro.usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const nuevo = await this.emitirPar(
      { id: registro.usuario.id, email: registro.usuario.email },
      registro.familia,
      cliente,
    );

    await this.prisma.refreshToken.update({
      where: { id: registro.id },
      data: { revocadoAt: new Date(), reemplazadoPor: hashToken(nuevo.refreshToken) },
    });

    return nuevo;
  }

  /** Revoca un refresh token concreto (logout). */
  async revocar(refreshTokenPlano: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshTokenPlano), revocadoAt: null },
      data: { revocadoAt: new Date() },
    });
  }

  /** Revoca todas las sesiones de un usuario. */
  async revocarTodas(usuarioId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId, revocadoAt: null },
      data: { revocadoAt: new Date() },
    });
  }

  get refreshTtlMs(): number {
    return ttlEnMs(this.cfg.refreshTtl);
  }
}
