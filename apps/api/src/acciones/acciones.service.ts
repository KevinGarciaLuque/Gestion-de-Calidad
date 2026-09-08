import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoAccion, Prisma } from '@prisma/client';
import { AlcanceService } from '../auth/rbac/alcance.service';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AvanceDto,
  CancelarAccionDto,
  CrearAccionDto,
  EditarAccionDto,
  ListarAccionesQuery,
  VerificarAccionDto,
} from './dto/accion.dto';

const INCLUDE = {
  proceso: { select: { id: true, codigo: true, nombre: true, areaId: true, responsableId: true, suplenteId: true } },
  responsable: { select: { id: true, nombre: true } },
  verificadoPor: { select: { id: true, nombre: true } },
  colaboradores: { include: { usuario: { select: { id: true, nombre: true } } } },
  hallazgo: { select: { id: true, codigo: true, estado: true } },
  riesgo: { select: { id: true, codigo: true, descripcion: true } },
  medicion: { select: { id: true, etiqueta: true, indicador: { select: { id: true, codigo: true } } } },
  mcc: { select: { id: true, codigo: true, titulo: true } },
  avances: { orderBy: { fecha: 'desc' }, include: { por: { select: { id: true, nombre: true } } } },
} satisfies Prisma.AccionInclude;

type AccionFull = Prisma.AccionGetPayload<{ include: typeof INCLUDE }>;

const EN_MS = 86_400_000;

@Injectable()
export class AccionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
    private readonly noti: NotificacionesService,
  ) {}

  async listar(q: ListarAccionesQuery, actor: UsuarioActual): Promise<Paginado<unknown>> {
    const procesosIds = await this.alcance.procesosVisiblesIds(actor, PERMISO.ACCIONES_VER);
    const and: Prisma.AccionWhereInput[] = [];
    if (procesosIds !== null) {
      and.push({
        OR: [
          { procesoId: { in: procesosIds } },
          { procesoId: null },
          { responsableId: actor.id },
          { colaboradores: { some: { usuarioId: actor.id } } },
        ],
      });
    }
    if (q.tipo) and.push({ tipo: q.tipo });
    if (q.estado) and.push({ estado: q.estado });
    if (q.origen) and.push({ origen: q.origen });
    if (q.hallazgoId) and.push({ hallazgoId: q.hallazgoId });
    if (q.riesgoId) and.push({ riesgoId: q.riesgoId });
    if (q.mccId) and.push({ mccId: q.mccId });
    if (q.mias) and.push({ responsableId: actor.id });
    if (q.abiertas) and.push({ estado: { in: ['PENDIENTE', 'EN_CURSO', 'COMPLETADA'] }, archivadoAt: null });
    if (q.vencidas)
      and.push({ fechaCompromiso: { lt: new Date() }, estado: { in: ['PENDIENTE', 'EN_CURSO'] } });
    if (q.q) and.push({ OR: [{ descripcion: { contains: q.q } }, { codigo: { contains: q.q } }] });

    const where: Prisma.AccionWhereInput = and.length ? { AND: and } : {};
    const [filas, total] = await this.prisma.$transaction([
      this.prisma.accion.findMany({
        where, include: INCLUDE,
        orderBy: [{ archivadoAt: 'asc' }, { fechaCompromiso: 'asc' }, { creadoAt: 'desc' }],
        skip: q.skip, take: q.porPagina,
      }),
      this.prisma.accion.count({ where }),
    ]);
    return paginar(filas.map((a) => this.resumen(a)), total, q);
  }

  async obtener(id: string, actor: UsuarioActual) {
    const a = await this.exige(id);
    if (!(await this.puedeVer(a, actor))) throw new ForbiddenException('No tienes acceso a esta acción');
    return {
      accion: this.detalle(a),
      avances: a.avances.map((av) => ({
        id: av.id,
        fecha: av.fecha,
        avance: av.avance,
        comentario: av.comentario,
        estadoNuevo: av.estadoNuevo,
        por: av.por,
      })),
      puede: {
        editar: await this.puedeEditar(a, actor),
        verificar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.ACCIONES_VERIFICAR),
      },
    };
  }

  async crear(dto: CrearAccionDto, actor: UsuarioActual) {
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.ACCIONES_CREAR)) {
      throw new ForbiddenException('No tienes permiso para crear acciones');
    }
    const procesoId = await this.resolverProceso(dto);
    if (dto.responsableId) await this.usuarioExiste(dto.responsableId);
    for (const uid of dto.colaboradoresIds ?? []) await this.usuarioExiste(uid);

    const anio = new Date().getFullYear();
    const seq = (await this.prisma.accion.count({ where: { codigo: { startsWith: `A-${anio}-` } } })) + 1;
    const codigo = `A-${anio}-${String(seq).padStart(3, '0')}`;

    const a = await this.prisma.accion.create({
      data: {
        codigo,
        tipo: dto.tipo,
        descripcion: dto.descripcion.trim(),
        resultadoEsperado: dto.resultadoEsperado?.trim() ?? null,
        origen: dto.origen,
        origenLibre: dto.origenLibre?.trim() ?? null,
        hallazgoId: dto.hallazgoId ?? null,
        riesgoId: dto.riesgoId ?? null,
        medicionId: dto.medicionId ?? null,
        mccId: dto.mccId ?? null,
        procesoId,
        responsableId: dto.responsableId ?? null,
        fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : null,
        fechaCompromiso: dto.fechaCompromiso ? new Date(dto.fechaCompromiso) : null,
        prioridad: dto.prioridad ?? 'MEDIA',
        evidenciaRequerida: dto.evidenciaRequerida?.trim() ?? null,
        colaboradores: dto.colaboradoresIds?.length
          ? { create: dto.colaboradoresIds.map((usuarioId) => ({ usuarioId })) }
          : undefined,
      },
    });
    await this.bitacora.registrar({
      accion: 'accion.crear', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Accion', entidadId: a.id, valorNuevo: { codigo, tipo: dto.tipo, origen: dto.origen },
    });
    if (dto.responsableId && dto.responsableId !== actor.id) {
      await this.noti.notificar(dto.responsableId, {
        titulo: 'Nueva acción asignada',
        mensaje: `Se te asignó la acción ${codigo}: ${dto.descripcion.slice(0, 120)}`,
        entidad: 'Accion', entidadId: a.id, ruta: `/acciones/${a.id}`, nivel: 'AVISO',
      });
    }
    return this.obtener(a.id, actor);
  }

  async editar(id: string, dto: EditarAccionDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    if (!(await this.puedeEditar(a, actor))) throw new ForbiddenException('No tienes permiso sobre esta acción');
    if (['VERIFICADA', 'CANCELADA'].includes(a.estado)) throw new BadRequestException('La acción ya está cerrada');
    if (dto.responsableId) await this.usuarioExiste(dto.responsableId);
    for (const uid of dto.colaboradoresIds ?? []) await this.usuarioExiste(uid);

    await this.prisma.$transaction([
      this.prisma.accion.update({
        where: { id },
        data: {
          descripcion: dto.descripcion?.trim(),
          resultadoEsperado: dto.resultadoEsperado === undefined ? undefined : dto.resultadoEsperado,
          responsableId: dto.responsableId === undefined ? undefined : dto.responsableId,
          fechaInicio: dto.fechaInicio === undefined ? undefined : dto.fechaInicio ? new Date(dto.fechaInicio) : null,
          fechaCompromiso:
            dto.fechaCompromiso === undefined ? undefined : dto.fechaCompromiso ? new Date(dto.fechaCompromiso) : null,
          prioridad: dto.prioridad,
          evidenciaRequerida: dto.evidenciaRequerida === undefined ? undefined : dto.evidenciaRequerida,
        },
      }),
      ...(dto.colaboradoresIds
        ? [
            this.prisma.accionColaborador.deleteMany({ where: { accionId: id } }),
            this.prisma.accionColaborador.createMany({
              data: dto.colaboradoresIds.map((usuarioId) => ({ accionId: id, usuarioId })),
            }),
          ]
        : []),
    ]);
    await this.bitacora.registrar({
      accion: 'accion.editar', actorId: actor.id, actorEmail: actor.email, entidad: 'Accion', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async registrarAvance(id: string, dto: AvanceDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    if (!(await this.puedeEditar(a, actor))) throw new ForbiddenException('No tienes permiso sobre esta acción');
    if (['VERIFICADA', 'CANCELADA'].includes(a.estado)) throw new BadRequestException('La acción ya está cerrada');

    let nuevoEstado: EstadoAccion = a.estado;
    if (dto.avance >= 100) nuevoEstado = 'COMPLETADA';
    else if (dto.avance > 0) nuevoEstado = 'EN_CURSO';
    else nuevoEstado = 'PENDIENTE';

    await this.prisma.$transaction([
      this.prisma.accion.update({ where: { id }, data: { avance: dto.avance, estado: nuevoEstado } }),
      this.prisma.avanceAccion.create({
        data: {
          accionId: id,
          avance: dto.avance,
          comentario: dto.comentario?.trim() ?? null,
          estadoNuevo: nuevoEstado !== a.estado ? nuevoEstado : null,
          porId: actor.id,
          porNombre: actor.nombre,
        },
      }),
    ]);

    if (nuevoEstado === 'COMPLETADA' && a.hallazgoId) {
      await this.notificarHallazgo(a.hallazgoId);
    }
    await this.bitacora.registrar({
      accion: 'accion.avance', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Accion', entidadId: id, valorNuevo: { avance: dto.avance, estado: nuevoEstado },
    });
    return this.obtener(id, actor);
  }

  async verificar(id: string, dto: VerificarAccionDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.ACCIONES_VERIFICAR)) {
      throw new ForbiddenException('No tienes permiso para verificar acciones');
    }
    if (a.estado !== 'COMPLETADA') throw new BadRequestException('Solo se verifica una acción completada');

    if (dto.eficaz) {
      await this.prisma.accion.update({
        where: { id },
        data: {
          estado: 'VERIFICADA',
          eficaz: true,
          verificacionEficacia: dto.verificacionEficacia.trim(),
          verificadoPorId: actor.id,
          verificadoAt: new Date(),
          fechaCierre: new Date(),
        },
      });
    } else {
      await this.prisma.$transaction([
        this.prisma.accion.update({
          where: { id },
          data: {
            estado: 'EN_CURSO',
            avance: Math.min(a.avance, 80),
            eficaz: false,
            verificacionEficacia: dto.verificacionEficacia.trim(),
            verificadoPorId: actor.id,
            verificadoAt: new Date(),
          },
        }),
        this.prisma.avanceAccion.create({
          data: {
            accionId: id,
            avance: Math.min(a.avance, 80),
            comentario: `Eficacia NO confirmada: ${dto.verificacionEficacia.trim()}`,
            estadoNuevo: 'EN_CURSO',
            porId: actor.id,
            porNombre: actor.nombre,
          },
        }),
      ]);
    }
    await this.bitacora.registrar({
      accion: dto.eficaz ? 'accion.verificar_eficaz' : 'accion.verificar_no_eficaz',
      actorId: actor.id, actorEmail: actor.email, entidad: 'Accion', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async cancelar(id: string, dto: CancelarAccionDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    if (!(await this.puedeEditar(a, actor))) throw new ForbiddenException('No tienes permiso');
    if (['VERIFICADA', 'CANCELADA'].includes(a.estado)) throw new BadRequestException('La acción ya está cerrada');
    await this.prisma.$transaction([
      this.prisma.accion.update({ where: { id }, data: { estado: 'CANCELADA', fechaCierre: new Date() } }),
      this.prisma.avanceAccion.create({
        data: { accionId: id, avance: a.avance, comentario: `Cancelada: ${dto.motivo.trim()}`, estadoNuevo: 'CANCELADA', porId: actor.id, porNombre: actor.nombre },
      }),
    ]);
    await this.bitacora.registrar({
      accion: 'accion.cancelar', actorId: actor.id, actorEmail: actor.email, entidad: 'Accion', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async archivar(id: string, arch: boolean, actor: UsuarioActual) {
    const a = await this.exige(id);
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.ACCIONES_VERIFICAR)) {
      throw new ForbiddenException('No tienes permiso');
    }
    void a;
    await this.prisma.accion.update({ where: { id }, data: { archivadoAt: arch ? new Date() : null } });
    return this.obtener(id, actor);
  }

  /** Estado agregado de las acciones de un hallazgo (usado por HallazgosService). */
  async resumenPorHallazgo(hallazgoId: string) {
    const acciones = await this.prisma.accion.findMany({
      where: { hallazgoId, estado: { not: 'CANCELADA' } },
      select: { estado: true },
    });
    const total = acciones.length;
    const cerradas = acciones.filter((a) => ['COMPLETADA', 'VERIFICADA'].includes(a.estado)).length;
    return { total, cerradas, todasListas: total > 0 && total === cerradas };
  }

  // ── Auxiliares ─────────────────────────────────────────────────────────

  private async notificarHallazgo(hallazgoId: string) {
    const r = await this.resumenPorHallazgo(hallazgoId);
    if (r.todasListas) {
      await this.prisma.eventoHallazgo.create({
        data: {
          hallazgoId,
          tipo: 'comentario',
          detalle: 'Todas las acciones del plan están completas. El hallazgo puede pasar a verificación de eficacia.',
        },
      });
    }
  }

  private async exige(id: string): Promise<AccionFull> {
    const a = await this.prisma.accion.findUnique({ where: { id }, include: INCLUDE });
    if (!a) throw new NotFoundException('Acción no encontrada');
    return a;
  }

  private async resolverProceso(dto: CrearAccionDto): Promise<string | null> {
    if (dto.procesoId) {
      if (!(await this.prisma.proceso.findUnique({ where: { id: dto.procesoId } })))
        throw new NotFoundException('Proceso no encontrado');
      return dto.procesoId;
    }
    if (dto.hallazgoId) {
      const h = await this.prisma.hallazgo.findUnique({ where: { id: dto.hallazgoId }, select: { procesoId: true } });
      if (!h) throw new NotFoundException('Hallazgo no encontrado');
      return h.procesoId;
    }
    if (dto.riesgoId) {
      const r = await this.prisma.riesgo.findUnique({ where: { id: dto.riesgoId }, select: { procesoId: true } });
      if (!r) throw new NotFoundException('Riesgo no encontrado');
      return r.procesoId;
    }
    if (dto.medicionId) {
      const m = await this.prisma.medicionIndicador.findUnique({
        where: { id: dto.medicionId },
        select: { indicador: { select: { procesoId: true } } },
      });
      if (!m) throw new NotFoundException('Medición no encontrada');
      return m.indicador.procesoId;
    }
    if (dto.mccId && !(await this.prisma.registroMCC.findUnique({ where: { id: dto.mccId } })))
      throw new NotFoundException('Registro MCC no encontrado');
    return null;
  }

  private async usuarioExiste(uid: string) {
    if (!(await this.prisma.usuario.findUnique({ where: { id: uid } }))) throw new NotFoundException('Usuario no encontrado');
  }

  private async puedeVer(a: AccionFull, actor: UsuarioActual): Promise<boolean> {
    if (actor.esSuperAdmin) return true;
    if (a.responsableId === actor.id || a.colaboradores.some((c) => c.usuarioId === actor.id)) return true;
    if (a.proceso) return this.alcance.puedeSobreProceso(actor, PERMISO.ACCIONES_VER, a.proceso);
    return actor.permisos.includes(PERMISO.ACCIONES_VER);
  }

  private async puedeEditar(a: AccionFull, actor: UsuarioActual): Promise<boolean> {
    if (actor.esSuperAdmin) return true;
    if (!actor.permisos.includes(PERMISO.ACCIONES_EDITAR)) return false;
    if (a.responsableId === actor.id || a.colaboradores.some((c) => c.usuarioId === actor.id)) return true;
    if (a.proceso) return this.alcance.puedeSobreProceso(actor, PERMISO.ACCIONES_EDITAR, a.proceso);
    return true;
  }

  private alerta(a: AccionFull) {
    const hoy = Date.now();
    const abierta = ['PENDIENTE', 'EN_CURSO', 'COMPLETADA'].includes(a.estado);
    return {
      vencida: abierta && !!a.fechaCompromiso && a.fechaCompromiso.getTime() < hoy && a.estado !== 'COMPLETADA',
      proxima:
        abierta &&
        !!a.fechaCompromiso &&
        a.fechaCompromiso.getTime() >= hoy &&
        a.fechaCompromiso.getTime() < hoy + 7 * EN_MS,
      sinResponsable: !a.responsableId && abierta,
      esperaVerificacion: a.estado === 'COMPLETADA',
    };
  }

  private origenLegible(a: AccionFull): { tipo: string; ref: string | null; id: string | null; ruta: string | null } {
    if (a.hallazgo) return { tipo: 'Hallazgo', ref: a.hallazgo.codigo, id: a.hallazgo.id, ruta: `/hallazgos/${a.hallazgo.id}` };
    if (a.riesgo) return { tipo: 'Riesgo', ref: a.riesgo.codigo, id: a.riesgo.id, ruta: `/riesgos/${a.riesgo.id}` };
    if (a.medicion)
      return { tipo: 'Indicador', ref: `${a.medicion.indicador.codigo} · ${a.medicion.etiqueta}`, id: a.medicion.indicador.id, ruta: `/indicadores/${a.medicion.indicador.id}` };
    if (a.mcc) return { tipo: 'MCC', ref: a.mcc.codigo, id: a.mcc.id, ruta: `/mcc/${a.mcc.id}` };
    return { tipo: a.origen === 'COMITE' ? 'Comité' : 'Otro', ref: a.origenLibre, id: null, ruta: null };
  }

  private resumen(a: AccionFull) {
    return {
      id: a.id,
      codigo: a.codigo,
      tipo: a.tipo,
      descripcion: a.descripcion,
      estado: a.estado,
      prioridad: a.prioridad,
      avance: a.avance,
      responsable: a.responsable,
      proceso: a.proceso ? { id: a.proceso.id, codigo: a.proceso.codigo } : null,
      origen: this.origenLegible(a),
      fechaCompromiso: a.fechaCompromiso,
      fechaCierre: a.fechaCierre,
      archivado: !!a.archivadoAt,
      alerta: this.alerta(a),
    };
  }

  private detalle(a: AccionFull) {
    return {
      ...this.resumen(a),
      resultadoEsperado: a.resultadoEsperado,
      colaboradores: a.colaboradores.map((c) => c.usuario),
      fechaInicio: a.fechaInicio,
      evidenciaRequerida: a.evidenciaRequerida,
      verificacionEficacia: a.verificacionEficacia,
      eficaz: a.eficaz,
      verificadoPor: a.verificadoPor,
      verificadoAt: a.verificadoAt,
      creadoAt: a.creadoAt,
    };
  }
}
