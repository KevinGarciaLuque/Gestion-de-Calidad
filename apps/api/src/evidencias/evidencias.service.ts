import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AlmacenamientoService } from '../common/almacenamiento/almacenamiento.service';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { PrismaService } from '../prisma/prisma.service';

export type EntidadEvidencia = 'AuditoriaItem' | 'Hallazgo' | 'Accion';

@Injectable()
export class EvidenciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly almacen: AlmacenamientoService,
    private readonly bitacora: BitacoraService,
  ) {}

  listar(entidad: EntidadEvidencia, entidadId: string) {
    return this.prisma.evidencia.findMany({
      where: { entidad, entidadId },
      orderBy: { subidoAt: 'desc' },
      include: { subidoPor: { select: { id: true, nombre: true } } },
    });
  }

  async agregar(
    entidad: EntidadEvidencia,
    entidadId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    descripcion: string | undefined,
    actor: UsuarioActual,
  ) {
    const g = await this.almacen.guardar(file.buffer, file.originalname, file.mimetype);
    const ev = await this.prisma.evidencia.create({
      data: {
        entidad,
        entidadId,
        nombreOriginal: file.originalname,
        rutaRelativa: g.rutaRelativa,
        mimeType: file.mimetype,
        tamanoBytes: g.tamanoBytes,
        hashSha256: g.hashSha256,
        descripcion: descripcion ?? null,
        subidoPorId: actor.id,
      },
    });
    await this.bitacora.registrar({
      accion: 'evidencia.agregar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad,
      entidadId,
      valorNuevo: { archivo: file.originalname, hash: g.hashSha256 },
    });
    return ev;
  }

  async eliminar(entidad: EntidadEvidencia, entidadId: string, evidenciaId: string, actor: UsuarioActual) {
    const ev = await this.prisma.evidencia.findFirst({ where: { id: evidenciaId, entidad, entidadId } });
    if (!ev) throw new NotFoundException('Evidencia no encontrada');
    if (ev.subidoPorId !== actor.id && !actor.esSuperAdmin) {
      throw new ForbiddenException('Solo quien la subió puede eliminarla');
    }
    await this.prisma.evidencia.delete({ where: { id: evidenciaId } });
    await this.almacen.eliminar(ev.rutaRelativa);
    await this.bitacora.registrar({
      accion: 'evidencia.eliminar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad,
      entidadId,
    });
  }

  async paraDescarga(entidad: EntidadEvidencia, entidadId: string, evidenciaId: string) {
    const ev = await this.prisma.evidencia.findFirst({ where: { id: evidenciaId, entidad, entidadId } });
    if (!ev) throw new NotFoundException('Evidencia no encontrada');
    return {
      stream: await this.almacen.streamDe(ev.rutaRelativa),
      nombre: ev.nombreOriginal,
      mimeType: ev.mimeType,
      tamano: ev.tamanoBytes,
    };
  }
}
