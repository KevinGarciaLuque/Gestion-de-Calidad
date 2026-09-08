import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioActual } from './usuario-actual';

/** Marca una ruta como pública (sin autenticación). */
export const PUBLIC_KEY = 'auth:public';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(PUBLIC_KEY, true);

/** Exige uno o varios permisos (el usuario debe tener TODOS). */
export const PERMISOS_KEY = 'auth:permisos';
export const RequierePermiso = (...permisos: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISOS_KEY, permisos);

/** Inyecta el usuario autenticado en un parámetro del controlador. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioActual => {
    const req = ctx.switchToHttp().getRequest<Request & { user: UsuarioActual }>();
    return req.user;
  },
);
