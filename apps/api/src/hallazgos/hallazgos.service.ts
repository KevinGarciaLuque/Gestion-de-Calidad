import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AlcanceService } from '../auth/rbac/alcance.service';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CrearHallazgoDto,
  EditarHallazgoDto,
  ListarHallazgosQuery,
} from './dto/hallazgo.dto';

const INCLUDE = {
  proceso: { select: { id: true, codigo: true, nombre: true, areaId: true, responsableId: true, suplenteId: true } },
  area: { select: { id: true, nombre: true } },
  responsable: { select: { id: true, nombre: true } },
  detectadoPor: { select: { id: true, nombre: true } },
  auditoria: { select: { id: true, codigo: true } },
} satisfies Prisma.HallazgoInclude;

type HallazgoFull = Prisma.HallazgoGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class HallazgosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  async listar(q: ListarHallazgosQuery, actor: UsuarioActual): Promise<Paginado<unknown>> {
    const procesosIds = await this.alcance.procesosVisiblesIds(actor, PERMISO.HALLAZGOS_VER);
    const and: Prisma.HallazgoWhereInput[] = [];
    if (procesosIds !== null) {
      and.push({ OR: [{ procesoId: { in: procesosIds } }, { procesoId: null }, { responsableId: actor.id }, { detectadoPorId: actor.id }] });
    }
    if (q.origen) and.push({ origen: q.origen });
    if (q.clasificacion) and.push({ clasificacion: q.clasificacion });
    if (q.estado) and.push({ estado: q.estado });
    if (q.procesoId) and.push({ procesoId: q.procesoId });
    if (q.auditoriaId) and.push({ auditoriaId: q.auditoriaId });
    if (q.q) and.push({ OR: [{ descripcion: { contains: q.q } }, { codigo: { contains: q.q } }] });
    if (q.abiertos) and.push({ estado: { not: 'CERRADO' }, archivadoAt: null });

    const where: Prisma.HallazgoWhereInput = and.length ? { AND: and } : {};
    const [filas, total] = await this.prisma.$transaction([
      this.prisma.hallazgo.findMany({
        where, include: INCLUDE,
        orderBy: [{ archivadoAt: 'asc' }, { fechaDeteccion: 'desc' }],
        skip: q.skip, take: q.porPagina,
      }),
      this.prisma.hallazgo.count({ where }),
    ]);
    return paginar(filas.map((h) => this.resumen(h)), total, q);
  }

  async obtener(id: string, actor: UsuarioActual) {
    const h = await this.prisma.hallazgo.findUnique({ where: { id }, include: INCLUDE });
    if (!h) throw new NotFoundException('Hallazgo no encontrado');
    if (!(await this.puedeVer(h, actor))) throw new ForbiddenException('No tienes acceso a este hallazgo');
    return {
      hallazgo: this.detalle(h),
      puede: {
        editar: await this.puedeEditar(h, actor),
        cerrar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.HALLAZGOS_CERRAR),
      },
    };
  }

  async crear(dto: CrearHallazgoDto, actor: UsuarioActual) {
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.HALLAZGOS_CREAR)) {
      throw new ForbiddenException('No tienes permiso para registrar hallazgos');
    }
    if (dto.procesoId && !(await this.prisma.proceso.findUnique({ where: { id: dto.procesoId } })))
      throw new NotFoundException('Proceso no encontrado');
    if (dto.responsableId && !(await this.prisma.usuario.findUnique({ where: { id: dto.responsableId } })))
      throw new NotFoundException('Responsable no encontrado');

    const anio = new Date().getFullYear();
    const seq = (await this.prisma.hallazgo.count({ where: { codigo: { startsWith: `H-${anio}-` } } })) + 1;
    const codigo = dto.codigo?.toUpperCase() ?? `H-${anio}-${String(seq).padStart(3, '0')}`;
    if (await this.prisma.hallazgo.findUnique({ where: { codigo } })) {
      throw new ConflictException('Ya existe un hallazgo con ese código');
    }

    const h = await this.prisma.hallazgo.create({
      data: {
        codigo,
        origen: dto.origen,
        procesoId: dto.procesoId ?? null,
        areaId: dto.areaId ?? null,
        descripcion: dto.descripcion.trim(),
        clasificacion: dto.clasificacion,
        requisito: dto.requisito?.trim() ?? null,
        evidencia: dto.evidencia?.trim() ?? null,
        detectadoPorId: actor.id,
        responsableId: dto.responsableId ?? null,
        fechaCompromiso: dto.fechaCompromiso ? new Date(dto.fechaCompromiso) : null,
        prioridad: dto.prioridad ?? 'MEDIA',
      },
    });
    await this.bitacora.registrar({
      accion: 'hallazgo.crear', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Hallazgo', entidadId: h.id, valorNuevo: { codigo, origen: dto.origen },
    });
    return this.obtener(h.id, actor);
  }

  async editar(id: string, dto: EditarHallazgoDto, actor: UsuarioActual) {
    const h = await this.prisma.hallazgo.findUnique({ where: { id }, include: INCLUDE });
    if (!h) throw new NotFoundException('Hallazgo no encontrado');
    if (!(await this.puedeEditar(h, actor))) throw new ForbiddenException('No tienes permiso sobre este hallazgo');
    if (dto.responsableId && !(await this.prisma.usuario.findUnique({ where: { id: dto.responsableId } })))
      throw new NotFoundException('Responsable no encontrado');

    await this.prisma.hallazgo.update({
      where: { id },
      data: {
        descripcion: dto.descripcion?.trim(),
        clasificacion: dto.clasificacion,
        requisito: dto.requisito === undefined ? undefined : dto.requisito,
        prioridad: dto.prioridad,
        responsableId: dto.responsableId === undefined ? undefined : dto.responsableId,
        fechaCompromiso:
          dto.fechaCompromiso === undefined ? undefined : dto.fechaCompromiso ? new Date(dto.fechaCompromiso) : null,
        estado: dto.estado,
      },
    });
    await this.bitacora.registrar({
      accion: 'hallazgo.editar', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Hallazgo', entidadId: id, valorNuevo: dto as Prisma.InputJsonValue,
    });
    return this.obtener(id, actor);
  }

  async archivar(id: string, arch: boolean, actor: UsuarioActual) {
    const h = await this.prisma.hallazgo.findUnique({ where: { id } });
    if (!h) throw new NotFoundException('Hallazgo no encontrado');
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.HALLAZGOS_CERRAR)) {
      throw new ForbiddenException('No tienes permiso');
    }
    await this.prisma.hallazgo.update({ where: { id }, data: { archivadoAt: arch ? new Date() : null } });
    return this.obtener(id, actor);
  }

  // ── Auxiliares ─────────────────────────────────────────────────────────

  private async puedeVer(h: HallazgoFull, actor: UsuarioActual): Promise<boolean> {
    if (actor.esSuperAdmin) return true;
    if (h.responsableId === actor.id || h.detectadoPorId === actor.id) return true;
    if (h.proceso) return this.alcance.puedeSobreProceso(actor, PERMISO.HALLAZGOS_VER, h.proceso);
    return actor.permisos.includes(PERMISO.HALLAZGOS_VER);
  }

  private async puedeEditar(h: HallazgoFull, actor: UsuarioActual): Promise<boolean> {
    if (actor.esSuperAdmin) return true;
    if (!actor.permisos.includes(PERMISO.HALLAZGOS_EDITAR)) return false;
    if (h.responsableId === actor.id) return true;
    if (h.proceso) return this.alcance.puedeSobreProceso(actor, PERMISO.HALLAZGOS_EDITAR, h.proceso);
    return true;
  }

  private alerta(h: HallazgoFull) {
    return {
      planVencido:
        !!h.fechaCompromiso && h.fechaCompromiso.getTime() < Date.now() && h.estado !== 'CERRADO',
      sinResponsable: !h.responsableId && h.estado !== 'CERRADO',
    };
  }

  private resumen(h: HallazgoFull) {
    return {
      id: h.id,
      codigo: h.codigo,
      origen: h.origen,
      descripcion: h.descripcion,
      clasificacion: h.clasificacion,
      estado: h.estado,
      prioridad: h.prioridad,
      proceso: h.proceso ? { id: h.proceso.id, codigo: h.proceso.codigo } : null,
      area: h.area,
      responsable: h.responsable,
      auditoria: h.auditoria,
      fechaDeteccion: h.fechaDeteccion,
      fechaCompromiso: h.fechaCompromiso,
      archivado: !!h.archivadoAt,
      alerta: this.alerta(h),
    };
  }

  private detalle(h: HallazgoFull) {
    return {
      ...this.resumen(h),
      requisito: h.requisito,
      evidencia: h.evidencia,
      detectadoPor: h.detectadoPor,
      creadoAt: h.creadoAt,
    };
  }
}
