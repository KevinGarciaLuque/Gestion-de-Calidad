import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoHallazgo, Prisma } from '@prisma/client';
import { AlcanceService } from '../auth/rbac/alcance.service';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import { normalizarContenido } from './analisis';
import type {
  AprobarPlanDto,
  ComentarioDto,
  CompletarAccionesDto,
  GuardarAnalisisDto,
  PlanAccionDto,
  ReabrirDto,
  ValidarHallazgoDto,
  VerificarEficaciaDto,
} from './dto/analisis.dto';
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
  analisisCausa: true,
  eventos: { orderBy: { fecha: 'asc' } },
} satisfies Prisma.HallazgoInclude;

type HallazgoFull = Prisma.HallazgoGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class HallazgosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  // ── Consultas ──────────────────────────────────────────────────────────

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
    const h = await this.exige(id);
    if (!(await this.puedeVer(h, actor))) throw new ForbiddenException('No tienes acceso a este hallazgo');
    const editar = await this.puedeEditar(h, actor);
    const gestionar = actor.esSuperAdmin || actor.permisos.includes(PERMISO.HALLAZGOS_CERRAR);

    return {
      hallazgo: this.detalle(h),
      analisis: h.analisisCausa,
      eventos: h.eventos,
      puede: {
        editar,
        gestionar,
        // Acciones de transición disponibles según estado
        validar: gestionar && ['ABIERTO', 'REABIERTO'].includes(h.estado) && !!h.responsableId,
        aprobarPlan: gestionar && h.estado === 'EN_ANALISIS',
        iniciarEjecucion: editar && h.estado === 'PLAN_APROBADO',
        completarAcciones: editar && h.estado === 'EN_EJECUCION',
        verificarEficacia: gestionar && h.estado === 'PENDIENTE_EFICACIA',
        reabrir: gestionar && h.estado === 'CERRADO',
      },
    };
  }

  // ── Alta y edición ─────────────────────────────────────────────────────

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
    const h = await this.exige(id);
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
        correccionInmediata: dto.correccionInmediata === undefined ? undefined : dto.correccionInmediata,
      },
    });
    await this.bitacora.registrar({
      accion: 'hallazgo.editar', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Hallazgo', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async archivar(id: string, arch: boolean, actor: UsuarioActual) {
    const h = await this.exige(id);
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.HALLAZGOS_CERRAR)) {
      throw new ForbiddenException('No tienes permiso');
    }
    await this.prisma.hallazgo.update({ where: { id }, data: { archivadoAt: arch ? new Date() : null } });
    return this.obtener(id, actor);
  }

  // ── Análisis de causa ──────────────────────────────────────────────────

  async guardarAnalisis(id: string, dto: GuardarAnalisisDto, actor: UsuarioActual) {
    const h = await this.exige(id);
    if (!(await this.puedeEditar(h, actor))) throw new ForbiddenException('No tienes permiso');
    if (['CERRADO'].includes(h.estado)) throw new BadRequestException('El hallazgo está cerrado');

    const contenido = normalizarContenido(dto.metodologia, dto.contenido) as Prisma.InputJsonValue;
    await this.prisma.analisisCausa.upsert({
      where: { hallazgoId: id },
      create: {
        hallazgoId: id,
        metodologia: dto.metodologia,
        contenido,
        causaInmediata: dto.causaInmediata?.trim() ?? null,
        causaContribuyente: dto.causaContribuyente?.trim() ?? null,
        causaRaiz: dto.causaRaiz?.trim() ?? null,
        comentariosEquipo: dto.comentariosEquipo?.trim() ?? null,
        elaboradoPorId: actor.id,
        elaboradoAt: new Date(),
      },
      update: {
        metodologia: dto.metodologia,
        contenido,
        causaInmediata: dto.causaInmediata?.trim() ?? null,
        causaContribuyente: dto.causaContribuyente?.trim() ?? null,
        causaRaiz: dto.causaRaiz?.trim() ?? null,
        comentariosEquipo: dto.comentariosEquipo?.trim() ?? null,
        elaboradoPorId: actor.id,
        elaboradoAt: new Date(),
      },
    });
    await this.bitacora.registrar({
      accion: 'hallazgo.analisis_causa', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Hallazgo', entidadId: id, valorNuevo: { metodologia: dto.metodologia },
    });
    return this.obtener(id, actor);
  }

  async guardarPlan(id: string, dto: PlanAccionDto, actor: UsuarioActual) {
    const h = await this.exige(id);
    if (!(await this.puedeEditar(h, actor))) throw new ForbiddenException('No tienes permiso');
    if (['CERRADO'].includes(h.estado)) throw new BadRequestException('El hallazgo está cerrado');
    await this.prisma.hallazgo.update({ where: { id }, data: { planAccion: dto.planAccion.trim() } });
    return this.obtener(id, actor);
  }

  async comentar(id: string, dto: ComentarioDto, actor: UsuarioActual) {
    const h = await this.exige(id);
    if (!(await this.puedeVer(h, actor))) throw new ForbiddenException('Sin acceso');
    await this.evento(id, 'comentario', dto.texto.trim(), null, actor);
    return this.obtener(id, actor);
  }

  // ── Máquina de estados ─────────────────────────────────────────────────

  async validar(id: string, dto: ValidarHallazgoDto, actor: UsuarioActual) {
    const h = await this.exigeGestion(id, actor);
    if (!['ABIERTO', 'REABIERTO'].includes(h.estado)) {
      throw new BadRequestException('Solo se valida un hallazgo abierto o reabierto');
    }
    if (!h.responsableId) throw new BadRequestException('Asigna un responsable de respuesta antes de validar');

    await this.prisma.hallazgo.update({
      where: { id },
      data: {
        estado: 'EN_ANALISIS',
        validadoPorId: actor.id,
        validadoAt: new Date(),
        correccionInmediata: dto.correccionInmediata?.trim() ?? h.correccionInmediata,
      },
    });
    await this.evento(id, 'validado', dto.comentario ?? null, 'EN_ANALISIS', actor);
    return this.obtener(id, actor);
  }

  async aprobarPlan(id: string, dto: AprobarPlanDto, actor: UsuarioActual) {
    const h = await this.exigeGestion(id, actor);
    if (h.estado !== 'EN_ANALISIS') throw new BadRequestException('El hallazgo no está en análisis');
    if (!h.analisisCausa?.causaRaiz?.trim()) {
      throw new BadRequestException('El análisis de causa debe tener una causa raíz identificada');
    }
    if (!h.planAccion?.trim()) throw new BadRequestException('Registra el plan de acción antes de aprobarlo');

    await this.prisma.hallazgo.update({
      where: { id },
      data: { estado: 'PLAN_APROBADO', planAprobadoPorId: actor.id, planAprobadoAt: new Date() },
    });
    await this.evento(id, 'plan_aprobado', dto.comentario ?? null, 'PLAN_APROBADO', actor);
    return this.obtener(id, actor);
  }

  async iniciarEjecucion(id: string, actor: UsuarioActual) {
    const h = await this.exige(id);
    if (!(await this.puedeEditar(h, actor))) throw new ForbiddenException('No tienes permiso');
    if (h.estado !== 'PLAN_APROBADO') throw new BadRequestException('El plan aún no está aprobado');
    await this.prisma.hallazgo.update({ where: { id }, data: { estado: 'EN_EJECUCION' } });
    await this.evento(id, 'en_ejecucion', null, 'EN_EJECUCION', actor);
    return this.obtener(id, actor);
  }

  async completarAcciones(id: string, dto: CompletarAccionesDto, actor: UsuarioActual) {
    const h = await this.exige(id);
    if (!(await this.puedeEditar(h, actor))) throw new ForbiddenException('No tienes permiso');
    if (h.estado !== 'EN_EJECUCION') throw new BadRequestException('El hallazgo no está en ejecución');
    await this.prisma.hallazgo.update({ where: { id }, data: { estado: 'PENDIENTE_EFICACIA' } });
    await this.evento(id, 'acciones_completas', dto.comentario ?? null, 'PENDIENTE_EFICACIA', actor);
    return this.obtener(id, actor);
  }

  async verificarEficacia(id: string, dto: VerificarEficaciaDto, actor: UsuarioActual) {
    const h = await this.exigeGestion(id, actor);
    if (h.estado !== 'PENDIENTE_EFICACIA') throw new BadRequestException('El hallazgo no está pendiente de eficacia');

    if (dto.eficaciaConfirmada) {
      await this.prisma.hallazgo.update({
        where: { id },
        data: {
          estado: 'CERRADO',
          eficaciaConfirmada: true,
          verificacionEficacia: dto.verificacionEficacia.trim(),
          verificadoPorId: actor.id,
          verificadoAt: new Date(),
          fechaCierre: new Date(),
        },
      });
      await this.evento(id, 'cerrado', dto.verificacionEficacia, 'CERRADO', actor);
    } else {
      await this.prisma.hallazgo.update({
        where: { id },
        data: {
          estado: 'REABIERTO',
          eficaciaConfirmada: false,
          verificacionEficacia: dto.verificacionEficacia.trim(),
          verificadoPorId: actor.id,
          verificadoAt: new Date(),
        },
      });
      await this.evento(id, 'eficacia_negativa', dto.verificacionEficacia, 'REABIERTO', actor);
    }
    await this.bitacora.registrar({
      accion: dto.eficaciaConfirmada ? 'hallazgo.cerrar' : 'hallazgo.eficacia_negativa',
      actorId: actor.id, actorEmail: actor.email, entidad: 'Hallazgo', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async reabrir(id: string, dto: ReabrirDto, actor: UsuarioActual) {
    const h = await this.exigeGestion(id, actor);
    if (h.estado !== 'CERRADO') throw new BadRequestException('Solo se reabre un hallazgo cerrado');
    await this.prisma.hallazgo.update({
      where: { id },
      data: { estado: 'REABIERTO', motivoReapertura: dto.motivo.trim(), fechaCierre: null, eficaciaConfirmada: null },
    });
    await this.evento(id, 'reabierto', dto.motivo, 'REABIERTO', actor);
    await this.bitacora.registrar({
      accion: 'hallazgo.reabrir', actorId: actor.id, actorEmail: actor.email, entidad: 'Hallazgo', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  // ── Auxiliares ─────────────────────────────────────────────────────────

  private async exige(id: string): Promise<HallazgoFull> {
    const h = await this.prisma.hallazgo.findUnique({ where: { id }, include: INCLUDE });
    if (!h) throw new NotFoundException('Hallazgo no encontrado');
    return h;
  }

  private async exigeGestion(id: string, actor: UsuarioActual): Promise<HallazgoFull> {
    const h = await this.exige(id);
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.HALLAZGOS_CERRAR)) {
      throw new ForbiddenException('Solo Calidad puede gestionar el ciclo del hallazgo');
    }
    if (!(await this.puedeVer(h, actor))) throw new ForbiddenException('Sin acceso a este hallazgo');
    return h;
  }

  private async evento(
    hallazgoId: string,
    tipo: string,
    detalle: string | null,
    estadoNuevo: EstadoHallazgo | null,
    actor: UsuarioActual,
  ) {
    await this.prisma.eventoHallazgo.create({
      data: { hallazgoId, tipo, detalle, estadoNuevo, actorId: actor.id, actorNombre: actor.nombre },
    });
  }

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
      planVencido: !!h.fechaCompromiso && h.fechaCompromiso.getTime() < Date.now() && h.estado !== 'CERRADO',
      sinResponsable: !h.responsableId && h.estado !== 'CERRADO',
      sinAnalisis:
        ['EN_ANALISIS', 'PLAN_APROBADO'].includes(h.estado) && !h.analisisCausa?.causaRaiz,
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
      fechaCierre: h.fechaCierre,
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
      correccionInmediata: h.correccionInmediata,
      planAccion: h.planAccion,
      validadoAt: h.validadoAt,
      planAprobadoAt: h.planAprobadoAt,
      verificacionEficacia: h.verificacionEficacia,
      eficaciaConfirmada: h.eficaciaConfirmada,
      verificadoAt: h.verificadoAt,
      motivoReapertura: h.motivoReapertura,
      creadoAt: h.creadoAt,
    };
  }
}
