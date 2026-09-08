import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { PERMISOS } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { PrismaService } from '../prisma/prisma.service';
import type { CrearRolDto, EditarRolDto, FijarPermisosDto } from './dto/rol.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  async listar() {
    const roles = await this.prisma.rol.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      include: {
        permisos: { select: { permisoCodigo: true } },
        _count: { select: { asignados: true } },
      },
    });
    return roles.map((r) => ({
      codigo: r.codigo,
      nombre: r.nombre,
      descripcion: r.descripcion,
      esSistema: r.esSistema,
      activo: r.activo,
      orden: r.orden,
      permisos: r.permisos.map((p) => p.permisoCodigo),
      usuariosAsignados: r._count.asignados,
    }));
  }

  async obtener(codigo: string) {
    const rol = await this.prisma.rol.findUnique({
      where: { codigo },
      include: { permisos: { select: { permisoCodigo: true } } },
    });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    return { ...rol, permisos: rol.permisos.map((p) => p.permisoCodigo) };
  }

  catalogoPermisos() {
    const modulos = new Map<string, typeof PERMISOS>();
    for (const p of PERMISOS) {
      if (!modulos.has(p.modulo)) modulos.set(p.modulo, []);
      modulos.get(p.modulo)!.push(p);
    }
    return [...modulos.entries()].map(([modulo, permisos]) => ({ modulo, permisos }));
  }

  async crear(dto: CrearRolDto, actor: UsuarioActual) {
    const existe = await this.prisma.rol.findUnique({ where: { codigo: dto.codigo } });
    if (existe) throw new ConflictException('Ya existe un rol con ese código');

    const rol = await this.prisma.rol.create({
      data: { codigo: dto.codigo, nombre: dto.nombre, descripcion: dto.descripcion, orden: 100 },
    });
    await this.bitacora.registrar({
      accion: 'rol.crear',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Rol',
      entidadId: rol.codigo,
      valorNuevo: { nombre: rol.nombre },
    });
    return this.obtener(rol.codigo);
  }

  async editar(codigo: string, dto: EditarRolDto, actor: UsuarioActual) {
    const rol = await this.prisma.rol.findUnique({ where: { codigo } });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    if (rol.esSistema && dto.activo === false) {
      throw new BadRequestException('Un rol de sistema no se puede desactivar');
    }

    await this.prisma.rol.update({
      where: { codigo },
      data: { nombre: dto.nombre, descripcion: dto.descripcion, activo: dto.activo },
    });
    await this.bitacora.registrar({
      accion: 'rol.editar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Rol',
      entidadId: codigo,
      valorAnterior: { nombre: rol.nombre, activo: rol.activo },
      valorNuevo: { nombre: dto.nombre ?? rol.nombre, activo: dto.activo ?? rol.activo },
    });
    return this.obtener(codigo);
  }

  async eliminar(codigo: string, actor: UsuarioActual) {
    const rol = await this.prisma.rol.findUnique({
      where: { codigo },
      include: { _count: { select: { asignados: true } } },
    });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    if (rol.esSistema) throw new BadRequestException('Un rol de sistema no se puede eliminar');
    if (rol._count.asignados > 0) {
      throw new BadRequestException('El rol está asignado a usuarios; quítalo primero');
    }

    await this.prisma.rol.delete({ where: { codigo } });
    await this.bitacora.registrar({
      accion: 'rol.eliminar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Rol',
      entidadId: codigo,
      valorAnterior: { nombre: rol.nombre },
    });
  }

  async fijarPermisos(codigo: string, dto: FijarPermisosDto, actor: UsuarioActual) {
    const rol = await this.prisma.rol.findUnique({ where: { codigo } });
    if (!rol) throw new NotFoundException('Rol no encontrado');

    const validos = new Set(PERMISOS.map((p) => p.codigo));
    const desconocidos = dto.permisos.filter((p) => !validos.has(p));
    if (desconocidos.length > 0) {
      throw new BadRequestException(`Permisos desconocidos: ${desconocidos.join(', ')}`);
    }

    await this.prisma.$transaction([
      this.prisma.rolPermiso.deleteMany({ where: { rolCodigo: codigo } }),
      this.prisma.rolPermiso.createMany({
        data: dto.permisos.map((permisoCodigo) => ({ rolCodigo: codigo, permisoCodigo })),
      }),
    ]);
    await this.bitacora.registrar({
      accion: 'rol.fijar_permisos',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Rol',
      entidadId: codigo,
      valorNuevo: { permisos: dto.permisos },
    });
    return this.obtener(codigo);
  }
}
