import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { PrismaService } from '../prisma/prisma.service';
import type { CrearUnidadDto, EditarUnidadDto } from './dto/unidad.dto';

export interface NodoArbol {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  orden: number;
  responsable: { id: string; nombre: string } | null;
  hijos: NodoArbol[];
}

@Injectable()
export class OrganizacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  async arbol(): Promise<NodoArbol[]> {
    const unidades = await this.prisma.unidadOrganizativa.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      include: { responsable: { select: { id: true, nombre: true } } },
    });

    const porId = new Map<string, NodoArbol>();
    for (const u of unidades) {
      porId.set(u.id, {
        id: u.id,
        codigo: u.codigo,
        nombre: u.nombre,
        tipo: u.tipo,
        activo: u.activo,
        orden: u.orden,
        responsable: u.responsable,
        hijos: [],
      });
    }

    const raices: NodoArbol[] = [];
    for (const u of unidades) {
      const nodo = porId.get(u.id)!;
      if (u.padreId && porId.has(u.padreId)) {
        porId.get(u.padreId)!.hijos.push(nodo);
      } else {
        raices.push(nodo);
      }
    }
    return raices;
  }

  async obtener(id: string) {
    const unidad = await this.prisma.unidadOrganizativa.findUnique({
      where: { id },
      include: {
        padre: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
        _count: { select: { hijos: true } },
      },
    });
    if (!unidad) throw new NotFoundException('Unidad no encontrada');
    return unidad;
  }

  async crear(dto: CrearUnidadDto, actor: UsuarioActual) {
    if (dto.padreId) await this.exigeExiste(dto.padreId);
    if (dto.responsableId) await this.exigeUsuario(dto.responsableId);

    try {
      const unidad = await this.prisma.unidadOrganizativa.create({
        data: {
          codigo: dto.codigo.toUpperCase(),
          nombre: dto.nombre.trim(),
          tipo: dto.tipo,
          padreId: dto.padreId ?? null,
          responsableId: dto.responsableId ?? null,
          orden: dto.orden ?? 0,
        },
      });
      await this.bitacora.registrar({
        accion: 'organizacion.crear',
        actorId: actor.id,
        actorEmail: actor.email,
        entidad: 'UnidadOrganizativa',
        entidadId: unidad.id,
        valorNuevo: { codigo: unidad.codigo, nombre: unidad.nombre, tipo: unidad.tipo },
      });
      return unidad;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe una unidad con ese código');
      }
      throw e;
    }
  }

  async editar(id: string, dto: EditarUnidadDto, actor: UsuarioActual) {
    const antes = await this.prisma.unidadOrganizativa.findUnique({ where: { id } });
    if (!antes) throw new NotFoundException('Unidad no encontrada');

    if (dto.padreId) {
      if (dto.padreId === id) throw new BadRequestException('Una unidad no puede ser su propio padre');
      await this.exigeExiste(dto.padreId);
      if (await this.esDescendiente(dto.padreId, id)) {
        throw new BadRequestException('No puedes mover una unidad dentro de una de sus hijas');
      }
    }
    if (dto.responsableId) await this.exigeUsuario(dto.responsableId);

    const unidad = await this.prisma.unidadOrganizativa.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        tipo: dto.tipo,
        padreId: dto.padreId === undefined ? undefined : dto.padreId,
        responsableId: dto.responsableId === undefined ? undefined : dto.responsableId,
        orden: dto.orden,
      },
    });
    await this.bitacora.registrar({
      accion: 'organizacion.editar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'UnidadOrganizativa',
      entidadId: id,
      valorAnterior: { nombre: antes.nombre, tipo: antes.tipo, padreId: antes.padreId },
      valorNuevo: { nombre: unidad.nombre, tipo: unidad.tipo, padreId: unidad.padreId },
    });
    return unidad;
  }

  async cambiarEstado(id: string, activo: boolean, actor: UsuarioActual) {
    const unidad = await this.prisma.unidadOrganizativa.findUnique({ where: { id } });
    if (!unidad) throw new NotFoundException('Unidad no encontrada');

    await this.prisma.unidadOrganizativa.update({ where: { id }, data: { activo } });
    await this.bitacora.registrar({
      accion: activo ? 'organizacion.activar' : 'organizacion.desactivar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'UnidadOrganizativa',
      entidadId: id,
    });
    return this.obtener(id);
  }

  private async exigeExiste(id: string) {
    const u = await this.prisma.unidadOrganizativa.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Unidad padre no encontrada');
  }

  private async exigeUsuario(id: string) {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Usuario responsable no encontrado');
  }

  private async esDescendiente(posibleHijo: string, ancestro: string): Promise<boolean> {
    let actual: string | null = posibleHijo;
    while (actual) {
      if (actual === ancestro) return true;
      const u: { padreId: string | null } | null =
        await this.prisma.unidadOrganizativa.findUnique({
          where: { id: actual },
          select: { padreId: true },
        });
      actual = u?.padreId ?? null;
    }
    return false;
  }
}
