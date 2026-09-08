import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CerrarMCCDto,
  ComentarMCCDto,
  CrearMCCDto,
  DecidirMCCDto,
  EditarMCCDto,
  ListarMCCQuery,
} from './dto/mcc.dto';

const INCLUDE = {
  area: { select: { id: true, nombre: true } },
  propuestoPor: { select: { id: true, nombre: true } },
  gestionadoPor: { select: { id: true, nombre: true } },
  eventos: { orderBy: { fecha: 'asc' } },
  acciones: {
    select: { id: true, codigo: true, descripcion: true, estado: true, avance: true, responsable: { select: { nombre: true } } },
  },
} satisfies Prisma.RegistroMCCInclude;

type MCCFull = Prisma.RegistroMCCGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class MccService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  async listar(q: ListarMCCQuery, actor: UsuarioActual): Promise<Paginado<unknown>> {
    const and: Prisma.RegistroMCCWhereInput[] = [];
    // Los colaboradores solo ven los suyos; el resto (con mcc.ver) ve todos.
    if (!actor.permisos.includes(PERMISO.MCC_GESTIONAR) && !actor.esSuperAdmin) {
      // ver limitado: propios + los que ya están en ejecución/cerrados (transparencia)
      and.push({ OR: [{ propuestoPorId: actor.id }, { estado: { in: ['EN_EJECUCION', 'VERIFICACION', 'CERRADO'] } }] });
    }
    if (q.origen) and.push({ origen: q.origen });
    if (q.estado) and.push({ estado: q.estado as never });
    if (q.mios) and.push({ propuestoPorId: actor.id });
    if (q.q) and.push({ OR: [{ titulo: { contains: q.q } }, { codigo: { contains: q.q } }] });

    const where: Prisma.RegistroMCCWhereInput = and.length ? { AND: and } : {};
    const [filas, total] = await this.prisma.$transaction([
      this.prisma.registroMCC.findMany({
        where, include: INCLUDE, orderBy: [{ archivadoAt: 'asc' }, { creadoAt: 'desc' }],
        skip: q.skip, take: q.porPagina,
      }),
      this.prisma.registroMCC.count({ where }),
    ]);
    return paginar(filas.map((m) => this.resumen(m)), total, q);
  }

  async obtener(id: string, actor: UsuarioActual) {
    const m = await this.exige(id);
    const gestiona = actor.esSuperAdmin || actor.permisos.includes(PERMISO.MCC_GESTIONAR);
    if (!gestiona && m.propuestoPorId !== actor.id && !['EN_EJECUCION', 'VERIFICACION', 'CERRADO'].includes(m.estado)) {
      throw new ForbiddenException('No tienes acceso a este registro');
    }
    return {
      registro: this.detalle(m),
      eventos: m.eventos,
      acciones: m.acciones,
      puede: {
        editar: gestiona || (m.propuestoPorId === actor.id && m.estado === 'NUEVO'),
        gestionar: gestiona,
        crearAccion: (actor.esSuperAdmin || actor.permisos.includes(PERMISO.ACCIONES_CREAR)) && m.estado === 'EN_EJECUCION',
      },
    };
  }

  async crear(dto: CrearMCCDto, actor: UsuarioActual) {
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.MCC_CREAR)) {
      throw new ForbiddenException('No tienes permiso para proponer mejoras');
    }
    if (dto.areaId && !(await this.prisma.unidadOrganizativa.findUnique({ where: { id: dto.areaId } })))
      throw new NotFoundException('Área no encontrada');

    const anio = new Date().getFullYear();
    const seq = (await this.prisma.registroMCC.count({ where: { codigo: { startsWith: `MCC-${anio}-` } } })) + 1;
    const codigo = `MCC-${anio}-${String(seq).padStart(3, '0')}`;

    const m = await this.prisma.registroMCC.create({
      data: {
        codigo,
        titulo: dto.titulo.trim(),
        descripcion: dto.descripcion.trim(),
        origen: dto.origen,
        origenDetalle: dto.origenDetalle?.trim() ?? null,
        areaId: dto.areaId ?? null,
        propuestoPorId: actor.id,
        eventos: { create: { tipo: 'creado', detalle: 'Registro creado', estadoNuevo: 'NUEVO', actorNombre: actor.nombre } },
      },
    });
    await this.bitacora.registrar({
      accion: 'mcc.crear', actorId: actor.id, actorEmail: actor.email,
      entidad: 'RegistroMCC', entidadId: m.id, valorNuevo: { codigo, titulo: dto.titulo },
    });
    return this.obtener(m.id, actor);
  }

  async editar(id: string, dto: EditarMCCDto, actor: UsuarioActual) {
    const m = await this.exige(id);
    const puede = actor.esSuperAdmin || actor.permisos.includes(PERMISO.MCC_GESTIONAR) || (m.propuestoPorId === actor.id && m.estado === 'NUEVO');
    if (!puede) throw new ForbiddenException('No puedes editar este registro');
    await this.prisma.registroMCC.update({
      where: { id },
      data: {
        titulo: dto.titulo?.trim(),
        descripcion: dto.descripcion?.trim(),
        areaId: dto.areaId === undefined ? undefined : dto.areaId,
      },
    });
    return this.obtener(id, actor);
  }

  async decidir(id: string, dto: DecidirMCCDto, actor: UsuarioActual) {
    const m = await this.exigeGestion(id, actor);
    if (!['NUEVO', 'EN_REVISION'].includes(m.estado)) throw new BadRequestException('El registro ya tiene una decisión');
    const estado = dto.procede ? 'ACEPTADO' : 'NO_PROCEDE';
    await this.prisma.$transaction([
      this.prisma.registroMCC.update({
        where: { id },
        data: {
          estado,
          impacto: dto.impacto ?? null,
          prioridad: dto.prioridad ?? null,
          decisionJustificacion: dto.justificacion.trim(),
          clasificadoPorId: actor.id,
          ...(dto.procede ? {} : { fechaCierre: new Date() }),
        },
      }),
      this.prisma.eventoMCC.create({
        data: { mccId: id, tipo: dto.procede ? 'aceptado' : 'no_procede', detalle: dto.justificacion, estadoNuevo: estado, actorNombre: actor.nombre },
      }),
    ]);
    await this.bitacora.registrar({
      accion: dto.procede ? 'mcc.aceptar' : 'mcc.rechazar', actorId: actor.id, actorEmail: actor.email,
      entidad: 'RegistroMCC', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async iniciarEjecucion(id: string, actor: UsuarioActual) {
    const m = await this.exigeGestion(id, actor);
    if (m.estado !== 'ACEPTADO') throw new BadRequestException('El registro no está aceptado');
    await this.transicion(id, 'EN_EJECUCION', 'en_ejecucion', null, actor);
    return this.obtener(id, actor);
  }

  async pasarVerificacion(id: string, actor: UsuarioActual) {
    const m = await this.exigeGestion(id, actor);
    if (m.estado !== 'EN_EJECUCION') throw new BadRequestException('El registro no está en ejecución');
    await this.transicion(id, 'VERIFICACION', 'verificacion', null, actor);
    return this.obtener(id, actor);
  }

  async cerrar(id: string, dto: CerrarMCCDto, actor: UsuarioActual) {
    const m = await this.exigeGestion(id, actor);
    if (!['VERIFICACION', 'EN_EJECUCION'].includes(m.estado)) throw new BadRequestException('El registro no está en verificación');
    await this.prisma.$transaction([
      this.prisma.registroMCC.update({
        where: { id },
        data: {
          estado: 'CERRADO',
          evaluacionResultado: dto.evaluacionResultado.trim(),
          aprendizaje: dto.aprendizaje?.trim() ?? null,
          fechaCierre: new Date(),
        },
      }),
      this.prisma.eventoMCC.create({
        data: { mccId: id, tipo: 'cerrado', detalle: dto.evaluacionResultado, estadoNuevo: 'CERRADO', actorNombre: actor.nombre },
      }),
    ]);
    await this.bitacora.registrar({
      accion: 'mcc.cerrar', actorId: actor.id, actorEmail: actor.email, entidad: 'RegistroMCC', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async comentar(id: string, dto: ComentarMCCDto, actor: UsuarioActual) {
    await this.obtener(id, actor); // valida acceso
    await this.prisma.eventoMCC.create({
      data: { mccId: id, tipo: 'comentario', detalle: dto.texto.trim(), actorNombre: actor.nombre },
    });
    return this.obtener(id, actor);
  }

  async archivar(id: string, arch: boolean, actor: UsuarioActual) {
    await this.exigeGestion(id, actor);
    await this.prisma.registroMCC.update({ where: { id }, data: { archivadoAt: arch ? new Date() : null } });
    return this.obtener(id, actor);
  }

  // ── Auxiliares ─────────────────────────────────────────────────────────

  private async exige(id: string): Promise<MCCFull> {
    const m = await this.prisma.registroMCC.findUnique({ where: { id }, include: INCLUDE });
    if (!m) throw new NotFoundException('Registro MCC no encontrado');
    return m;
  }

  private async exigeGestion(id: string, actor: UsuarioActual): Promise<MCCFull> {
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.MCC_GESTIONAR)) {
      throw new ForbiddenException('Solo Calidad gestiona los registros MCC');
    }
    return this.exige(id);
  }

  private async transicion(id: string, estado: string, tipo: string, detalle: string | null, actor: UsuarioActual) {
    await this.prisma.$transaction([
      this.prisma.registroMCC.update({ where: { id }, data: { estado: estado as never } }),
      this.prisma.eventoMCC.create({ data: { mccId: id, tipo, detalle, estadoNuevo: estado as never, actorNombre: actor.nombre } }),
    ]);
    await this.bitacora.registrar({
      accion: `mcc.${tipo}`, actorId: actor.id, actorEmail: actor.email, entidad: 'RegistroMCC', entidadId: id,
    });
  }

  private resumen(m: MCCFull) {
    return {
      id: m.id,
      codigo: m.codigo,
      titulo: m.titulo,
      origen: m.origen,
      estado: m.estado,
      prioridad: m.prioridad,
      impacto: m.impacto,
      area: m.area,
      propuestoPor: m.propuestoPor,
      accionesTotal: m.acciones.length,
      accionesCerradas: m.acciones.filter((a) => ['COMPLETADA', 'VERIFICADA'].includes(a.estado)).length,
      creadoAt: m.creadoAt,
      fechaCierre: m.fechaCierre,
      archivado: !!m.archivadoAt,
    };
  }

  private detalle(m: MCCFull) {
    return {
      ...this.resumen(m),
      descripcion: m.descripcion,
      origenDetalle: m.origenDetalle,
      decisionJustificacion: m.decisionJustificacion,
      evaluacionResultado: m.evaluacionResultado,
      aprendizaje: m.aprendizaje,
      gestionadoPor: m.gestionadoPor,
    };
  }
}
