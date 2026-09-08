import { Injectable, Logger } from '@nestjs/common';
import type { NivelNotificacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CorreoService } from '../common/correo/correo.service';

export interface NuevaNotificacion {
  nivel?: NivelNotificacion;
  titulo: string;
  mensaje: string;
  entidad?: string;
  entidadId?: string;
  ruta?: string;
  /** Clave para no duplicar la misma alerta al mismo usuario. */
  claveDedup?: string;
  /** Enviar también por correo si el usuario tiene email. */
  correo?: boolean;
}

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
  ) {}

  /** Crea (o re-surface) una notificación para un usuario. Devuelve 1 si generó algo nuevo. */
  async notificar(usuarioId: string, n: NuevaNotificacion): Promise<number> {
    if (!usuarioId) return 0;
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { activo: true, email: true },
    });
    if (!usuario || !usuario.activo) return 0;

    let creada = false;
    if (n.claveDedup) {
      const existente = await this.prisma.notificacion.findUnique({
        where: { usuarioId_claveDedup: { usuarioId, claveDedup: n.claveDedup } },
      });
      if (existente) {
        // Re-surface si ya está leída y hace más de 20 h que se creó/actualizó.
        const antiguedadHoras = (Date.now() - existente.creadoAt.getTime()) / 3_600_000;
        if (existente.leidaAt && antiguedadHoras > 20) {
          await this.prisma.notificacion.update({
            where: { id: existente.id },
            data: { leidaAt: null, creadoAt: new Date(), mensaje: n.mensaje, nivel: n.nivel ?? existente.nivel },
          });
          creada = true;
        }
      } else {
        await this.prisma.notificacion.create({
          data: {
            usuarioId,
            nivel: n.nivel ?? 'AVISO',
            titulo: n.titulo,
            mensaje: n.mensaje,
            entidad: n.entidad ?? null,
            entidadId: n.entidadId ?? null,
            ruta: n.ruta ?? null,
            claveDedup: n.claveDedup,
          },
        });
        creada = true;
      }
    } else {
      await this.prisma.notificacion.create({
        data: {
          usuarioId,
          nivel: n.nivel ?? 'AVISO',
          titulo: n.titulo,
          mensaje: n.mensaje,
          entidad: n.entidad ?? null,
          entidadId: n.entidadId ?? null,
          ruta: n.ruta ?? null,
        },
      });
      creada = true;
    }

    if (creada && n.correo && usuario.email) {
      void this.correo.enviar(usuario.email, n.titulo, `<p>${n.mensaje}</p>`);
    }
    return creada ? 1 : 0;
  }

  async notificarVarios(usuarioIds: string[], n: NuevaNotificacion): Promise<number> {
    let c = 0;
    for (const uid of [...new Set(usuarioIds)]) c += await this.notificar(uid, n);
    return c;
  }

  async listar(usuarioId: string, opts: { soloNoLeidas?: boolean; limite?: number }) {
    return this.prisma.notificacion.findMany({
      where: { usuarioId, ...(opts.soloNoLeidas ? { leidaAt: null } : {}) },
      orderBy: [{ leidaAt: 'asc' }, { creadoAt: 'desc' }],
      take: opts.limite ?? 50,
    });
  }

  async contarNoLeidas(usuarioId: string): Promise<number> {
    return this.prisma.notificacion.count({ where: { usuarioId, leidaAt: null } });
  }

  async marcarLeida(usuarioId: string, id: string) {
    await this.prisma.notificacion.updateMany({
      where: { id, usuarioId },
      data: { leidaAt: new Date() },
    });
  }

  async marcarTodasLeidas(usuarioId: string) {
    await this.prisma.notificacion.updateMany({
      where: { usuarioId, leidaAt: null },
      data: { leidaAt: new Date() },
    });
  }
}
