import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { generarPasswordTemporal } from '../common/passwords';
import { hashPassword } from '../auth/hashing';
import { ROL } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AsignarRolDto,
  CrearUsuarioDto,
  EditarUsuarioDto,
  ListarUsuariosQuery,
} from './dto/usuario.dto';

const usuarioListado = {
  id: true,
  email: true,
  nombre: true,
  activo: true,
  debeCambiarPassword: true,
  ultimoAccesoAt: true,
  creadoAt: true,
  roles: {
    select: {
      id: true,
      rolCodigo: true,
      tipoAlcance: true,
      unidadId: true,
      procesoId: true,
      expiraAt: true,
      rol: { select: { nombre: true } },
      unidad: { select: { nombre: true } },
      proceso: { select: { nombre: true, codigo: true } },
    },
  },
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  async listar(q: ListarUsuariosQuery): Promise<Paginado<unknown>> {
    const where: Prisma.UsuarioWhereInput = {};
    if (q.q) {
      where.OR = [
        { nombre: { contains: q.q } },
        { email: { contains: q.q } },
      ];
    }
    if (typeof q.activo === 'boolean') where.activo = q.activo;

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        select: usuarioListado,
        orderBy: { nombre: 'asc' },
        skip: q.skip,
        take: q.porPagina,
      }),
      this.prisma.usuario.count({ where }),
    ]);
    return paginar(datos, total, q);
  }

  async obtener(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id }, select: usuarioListado });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async crear(dto: CrearUsuarioDto, actor: UsuarioActual) {
    const existe = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
    if (existe) throw new ConflictException('Ya existe un usuario con ese correo');

    const passwordPlano = dto.password ?? generarPasswordTemporal();
    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        nombre: dto.nombre.trim(),
        passwordHash: await hashPassword(passwordPlano),
        debeCambiarPassword: !dto.password,
      },
      select: usuarioListado,
    });

    await this.bitacora.registrar({
      accion: 'usuario.crear',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Usuario',
      entidadId: usuario.id,
      valorNuevo: { email: usuario.email, nombre: usuario.nombre },
    });

    return {
      usuario,
      passwordTemporal: dto.password ? undefined : passwordPlano,
    };
  }

  async editar(id: string, dto: EditarUsuarioDto, actor: UsuarioActual) {
    const antes = await this.prisma.usuario.findUnique({ where: { id } });
    if (!antes) throw new NotFoundException('Usuario no encontrado');

    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { nombre: dto.nombre?.trim() },
      select: usuarioListado,
    });
    await this.bitacora.registrar({
      accion: 'usuario.editar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Usuario',
      entidadId: id,
      valorAnterior: { nombre: antes.nombre },
      valorNuevo: { nombre: usuario.nombre },
    });
    return usuario;
  }

  async cambiarEstado(id: string, activo: boolean, actor: UsuarioActual) {
    if (id === actor.id && !activo) {
      throw new BadRequestException('No puedes desactivar tu propio usuario');
    }
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.usuario.update({ where: { id }, data: { activo } });
    if (!activo) {
      await this.prisma.refreshToken.updateMany({
        where: { usuarioId: id, revocadoAt: null },
        data: { revocadoAt: new Date() },
      });
    }
    await this.bitacora.registrar({
      accion: activo ? 'usuario.activar' : 'usuario.desactivar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Usuario',
      entidadId: id,
    });
    return this.obtener(id);
  }

  async resetearPassword(id: string, actor: UsuarioActual) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const passwordTemporal = generarPasswordTemporal();
    await this.prisma.usuario.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(passwordTemporal),
        debeCambiarPassword: true,
        intentosFallidos: 0,
        bloqueadoHasta: null,
      },
    });
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId: id, revocadoAt: null },
      data: { revocadoAt: new Date() },
    });
    await this.bitacora.registrar({
      accion: 'usuario.resetear_password',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Usuario',
      entidadId: id,
    });
    return { passwordTemporal };
  }

  async asignarRol(id: string, dto: AsignarRolDto, actor: UsuarioActual) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const rol = await this.prisma.rol.findUnique({ where: { codigo: dto.rolCodigo } });
    if (!rol) throw new NotFoundException('Rol no encontrado');

    if (dto.tipoAlcance === 'UNIDAD') {
      if (!dto.unidadId) throw new BadRequestException('Debes indicar la unidad del alcance');
      const unidad = await this.prisma.unidadOrganizativa.findUnique({ where: { id: dto.unidadId } });
      if (!unidad) throw new NotFoundException('Unidad organizativa no encontrada');
    }
    if (dto.tipoAlcance === 'PROCESO') {
      if (!dto.procesoId) throw new BadRequestException('Debes indicar el proceso del alcance');
      const proceso = await this.prisma.proceso.findUnique({ where: { id: dto.procesoId } });
      if (!proceso) throw new NotFoundException('Proceso no encontrado');
    }
    if (dto.rolCodigo === ROL.SUPER_ADMIN && dto.tipoAlcance !== 'GLOBAL') {
      throw new BadRequestException('El Super Administrador solo admite alcance global');
    }

    try {
      const asignacion = await this.prisma.usuarioRol.create({
        data: {
          usuarioId: id,
          rolCodigo: dto.rolCodigo,
          tipoAlcance: dto.tipoAlcance,
          unidadId: dto.tipoAlcance === 'UNIDAD' ? dto.unidadId : null,
          procesoId: dto.tipoAlcance === 'PROCESO' ? dto.procesoId : null,
          expiraAt: dto.expiraAt ? new Date(dto.expiraAt) : null,
        },
      });
      await this.bitacora.registrar({
        accion: 'usuario.asignar_rol',
        actorId: actor.id,
        actorEmail: actor.email,
        entidad: 'Usuario',
        entidadId: id,
        valorNuevo: {
          rol: dto.rolCodigo,
          alcance: dto.tipoAlcance,
          unidadId: dto.unidadId ?? null,
          procesoId: dto.procesoId ?? null,
        },
      });
      return asignacion;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('El usuario ya tiene ese rol con ese alcance');
      }
      throw e;
    }
  }

  async quitarRol(id: string, usuarioRolId: string, actor: UsuarioActual) {
    const asignacion = await this.prisma.usuarioRol.findFirst({
      where: { id: usuarioRolId, usuarioId: id },
    });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');

    if (
      id === actor.id &&
      asignacion.rolCodigo === ROL.SUPER_ADMIN &&
      asignacion.tipoAlcance === 'GLOBAL'
    ) {
      throw new ForbiddenException('No puedes quitarte a ti mismo el rol de Super Administrador');
    }

    await this.prisma.usuarioRol.delete({ where: { id: usuarioRolId } });
    await this.bitacora.registrar({
      accion: 'usuario.quitar_rol',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Usuario',
      entidadId: id,
      valorAnterior: { rol: asignacion.rolCodigo, alcance: asignacion.tipoAlcance },
    });
  }
}
