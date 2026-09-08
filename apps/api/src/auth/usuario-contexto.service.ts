import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ROL } from './rbac/permisos.catalog';
import type { UsuarioActual } from './rbac/usuario-actual';

/** Construye el contexto (permisos + alcances) de un usuario a partir de la base. */
@Injectable()
export class UsuarioContextoService {
  constructor(private readonly prisma: PrismaService) {}

  async construir(usuarioId: string): Promise<UsuarioActual | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        roles: {
          include: { rol: { include: { permisos: true } } },
        },
      },
    });

    if (!usuario || !usuario.activo) return null;

    const ahora = new Date();
    const rolesVigentes = usuario.roles.filter(
      (r) => !r.expiraAt || r.expiraAt > ahora,
    );

    const esSuperAdmin = rolesVigentes.some((r) => r.rolCodigo === ROL.SUPER_ADMIN);

    const permisos = new Set<string>();
    for (const asignacion of rolesVigentes) {
      if (!asignacion.rol.activo) continue;
      for (const rp of asignacion.rol.permisos) permisos.add(rp.permisoCodigo);
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      esSuperAdmin,
      permisos: [...permisos],
      alcances: rolesVigentes.map((r) => ({
        rolCodigo: r.rolCodigo,
        tipoAlcance: r.tipoAlcance,
        unidadId: r.unidadId,
        procesoId: r.procesoId,
      })),
      debeCambiarPassword: usuario.debeCambiarPassword,
    };
  }
}
