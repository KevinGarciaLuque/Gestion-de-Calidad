import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CambiarPasswordDto } from './dto/cambiar-password.dto';
import type { LoginDto } from './dto/login.dto';
import { hashPassword, verifyPassword } from './hashing';
import type { UsuarioActual } from './rbac/usuario-actual';
import { TokensService, type ParTokens } from './tokens.service';
import { UsuarioContextoService } from './usuario-contexto.service';

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

interface DatosCliente {
  ip?: string | null;
  userAgent?: string | null;
}

export interface ResultadoSesion {
  usuario: UsuarioActual;
  tokens: ParTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly contexto: UsuarioContextoService,
    private readonly bitacora: BitacoraService,
  ) {}

  async login(dto: LoginDto, cliente: DatosCliente): Promise<ResultadoSesion> {
    const generico = new UnauthorizedException('Correo o contraseña incorrectos');
    const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email } });

    if (!usuario) {
      // Se verifica igual para no filtrar por tiempo si el correo existe o no.
      await verifyPassword('$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$0000000000000000000000', dto.password);
      throw generico;
    }

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      throw new ForbiddenException(
        `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo más tarde.`,
      );
    }

    const ok = await verifyPassword(usuario.passwordHash, dto.password);
    if (!ok) {
      const intentos = usuario.intentosFallidos + 1;
      const bloquear = intentos >= MAX_INTENTOS;
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          intentosFallidos: bloquear ? 0 : intentos,
          bloqueadoHasta: bloquear
            ? new Date(Date.now() + BLOQUEO_MINUTOS * 60_000)
            : null,
        },
      });
      await this.bitacora.registrar({
        accion: 'auth.login_fallido',
        actorId: usuario.id,
        actorEmail: usuario.email,
        entidad: 'Usuario',
        entidadId: usuario.id,
        ip: cliente.ip,
        userAgent: cliente.userAgent,
      });
      throw generico;
    }

    if (!usuario.activo) {
      throw new ForbiddenException('Tu usuario está inactivo. Contacta al administrador.');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { intentosFallidos: 0, bloqueadoHasta: null, ultimoAccesoAt: new Date() },
    });

    const tokens = await this.tokens.emitirParaLogin(
      { id: usuario.id, email: usuario.email },
      cliente,
    );
    const contexto = await this.contexto.construir(usuario.id);
    if (!contexto) throw generico;

    await this.bitacora.registrar({
      accion: 'auth.login',
      actorId: usuario.id,
      actorEmail: usuario.email,
      entidad: 'Usuario',
      entidadId: usuario.id,
      ip: cliente.ip,
      userAgent: cliente.userAgent,
    });

    return { usuario: contexto, tokens };
  }

  async refresh(refreshToken: string, cliente: DatosCliente): Promise<ResultadoSesion> {
    const tokens = await this.tokens.rotar(refreshToken, cliente);
    const usuario = await this.contexto.construir(tokens.usuarioId);
    if (!usuario) throw new UnauthorizedException('Sesión no válida');
    return { usuario, tokens };
  }

  async logout(refreshToken: string | undefined, usuario: UsuarioActual | undefined): Promise<void> {
    if (refreshToken) await this.tokens.revocar(refreshToken);
    if (usuario) {
      await this.bitacora.registrar({
        accion: 'auth.logout',
        actorId: usuario.id,
        actorEmail: usuario.email,
      });
    }
  }

  async cambiarPassword(usuario: UsuarioActual, dto: CambiarPasswordDto): Promise<void> {
    const registro = await this.prisma.usuario.findUnique({ where: { id: usuario.id } });
    if (!registro) throw new UnauthorizedException();

    const ok = await verifyPassword(registro.passwordHash, dto.passwordActual);
    if (!ok) throw new ForbiddenException('La contraseña actual no es correcta');

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        passwordHash: await hashPassword(dto.passwordNueva),
        debeCambiarPassword: false,
      },
    });
    await this.tokens.revocarTodas(usuario.id);
    await this.bitacora.registrar({
      accion: 'auth.password_cambiada',
      actorId: usuario.id,
      actorEmail: usuario.email,
      entidad: 'Usuario',
      entidadId: usuario.id,
    });
  }
}
