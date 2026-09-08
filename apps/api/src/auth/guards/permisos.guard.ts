import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISOS_KEY } from '../rbac/decorators';
import { tienePermiso, type UsuarioActual } from '../rbac/usuario-actual';

/** Verifica los permisos exigidos con @RequierePermiso(). El usuario debe tenerlos todos. */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<string[]>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requeridos || requeridos.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: UsuarioActual }>();
    const usuario = req.user;
    if (!usuario) throw new ForbiddenException('Sin sesión');

    const faltantes = requeridos.filter((p) => !tienePermiso(usuario, p));
    if (faltantes.length > 0) {
      throw new ForbiddenException(
        `No tienes permiso para esta acción (falta: ${faltantes.join(', ')})`,
      );
    }
    return true;
  }
}
