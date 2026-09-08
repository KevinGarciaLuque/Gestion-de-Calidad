import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoAuditoria, Prisma, type ResultadoItem } from '@prisma/client';
import { AlcanceService } from '../auth/rbac/alcance.service';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CancelarDto,
  CrearAuditoriaDto,
  CrearProgramaDto,
  EditarAuditoriaDto,
  EditarProgramaDto,
  GenerarHallazgoDto,
  InformeDto,
  ItemChecklistDto,
  ListarAuditoriasQuery,
  ReprogramarDto,
  ResultadoItemDto,
} from './dto/auditoria.dto';

const INCLUDE = {
  programa: { select: { id: true, anio: true, nombre: true } },
  proceso: { select: { id: true, codigo: true, nombre: true, areaId: true, responsableId: true, suplenteId: true } },
  area: { select: { id: true, nombre: true } },
  auditorLider: { select: { id: true, nombre: true } },
  equipo: { include: { usuario: { select: { id: true, nombre: true } } } },
  items: { orderBy: { orden: 'asc' }, include: { proceso: { select: { id: true, codigo: true } }, hallazgos: { select: { id: true, codigo: true, clasificacion: true } } } },
  hallazgos: {
    select: { id: true, codigo: true, clasificacion: true, estado: true, descripcion: true, responsable: { select: { id: true, nombre: true } } },
  },
} satisfies Prisma.AuditoriaInclude;

type AudFull = Prisma.AuditoriaGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class AuditoriasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  // ── Programa ─────────────────────────────────────────────────────────────

  async programa(anio: number, actor: UsuarioActual) {
    const prog = await this.prisma.programaAuditoria.findUnique({ where: { anio } });
    const auditorias = await this.prisma.auditoria.findMany({
      where: {
        OR: [
          { programa: { anio } },
          {
            programaId: null,
            fechaPlanificada: { gte: new Date(anio, 0, 1), lt: new Date(anio + 1, 0, 1) },
          },
        ],
      },
      include: INCLUDE,
      orderBy: { fechaPlanificada: 'asc' },
    });
    const visibles = await this.filtrarVisibles(auditorias, actor);
    return {
      anio,
      programa: prog,
      auditorias: visibles.map((a) => this.resumen(a)),
      puedeGestionar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.AUDITORIAS_PLANIFICAR),
    };
  }

  async crearPrograma(dto: CrearProgramaDto, actor: UsuarioActual) {
    this.exigeModulo(actor, PERMISO.AUDITORIAS_PLANIFICAR);
    if (await this.prisma.programaAuditoria.findUnique({ where: { anio: dto.anio } })) {
      throw new ConflictException(`Ya existe un programa para ${dto.anio}`);
    }
    const prog = await this.prisma.programaAuditoria.create({
      data: { anio: dto.anio, nombre: dto.nombre.trim(), objetivo: dto.objetivo?.trim() ?? null },
    });
    await this.bitacora.registrar({
      accion: 'auditoria.programa_crear', actorId: actor.id, actorEmail: actor.email,
      entidad: 'ProgramaAuditoria', entidadId: prog.id, valorNuevo: { anio: prog.anio },
    });
    return this.programa(dto.anio, actor);
  }

  async editarPrograma(id: string, dto: EditarProgramaDto, actor: UsuarioActual) {
    this.exigeModulo(actor, PERMISO.AUDITORIAS_PLANIFICAR);
    const prog = await this.prisma.programaAuditoria.update({
      where: { id },
      data: { nombre: dto.nombre?.trim(), objetivo: dto.objetivo?.trim() },
    });
    return this.programa(prog.anio, actor);
  }

  async aprobarPrograma(id: string, actor: UsuarioActual) {
    this.exigeModulo(actor, PERMISO.AUDITORIAS_PLANIFICAR);
    const prog = await this.prisma.programaAuditoria.update({
      where: { id },
      data: { estado: 'APROBADO', aprobadoPorId: actor.id, aprobadoAt: new Date() },
    });
    await this.bitacora.registrar({
      accion: 'auditoria.programa_aprobar', actorId: actor.id, actorEmail: actor.email,
      entidad: 'ProgramaAuditoria', entidadId: id,
    });
    return this.programa(prog.anio, actor);
  }

  // ── Auditorías ───────────────────────────────────────────────────────────

  async listar(q: ListarAuditoriasQuery, actor: UsuarioActual): Promise<Paginado<unknown>> {
    const and: Prisma.AuditoriaWhereInput[] = [];
    if (q.anio) {
      and.push({
        OR: [
          { programa: { anio: q.anio } },
          { fechaPlanificada: { gte: new Date(q.anio, 0, 1), lt: new Date(q.anio + 1, 0, 1) } },
        ],
      });
    }
    if (q.estado) and.push({ estado: q.estado });
    if (q.procesoId) and.push({ procesoId: q.procesoId });
    if (q.q) and.push({ OR: [{ codigo: { contains: q.q } }, { objetivo: { contains: q.q } }] });

    const todas = await this.prisma.auditoria.findMany({
      where: and.length ? { AND: and } : {},
      include: INCLUDE,
      orderBy: { fechaPlanificada: 'desc' },
    });
    const visibles = await this.filtrarVisibles(todas, actor);
    const total = visibles.length;
    const pagina = visibles.slice(q.skip, q.skip + q.porPagina).map((a) => this.resumen(a));
    return paginar(pagina, total, q);
  }

  async obtener(id: string, actor: UsuarioActual) {
    const a = await this.prisma.auditoria.findUnique({ where: { id }, include: INCLUDE });
    if (!a) throw new NotFoundException('Auditoría no encontrada');
    if (!(await this.puedeVer(a, actor))) throw new ForbiddenException('No tienes acceso a esta auditoría');

    const ejecutar = await this.puedeEjecutar(a, actor);
    return {
      auditoria: this.detalle(a),
      checklist: a.items.map((it) => ({
        id: it.id,
        orden: it.orden,
        criterio: it.criterio,
        proceso: it.proceso,
        resultado: it.resultado,
        notas: it.notas,
        hallazgos: it.hallazgos,
      })),
      hallazgos: a.hallazgos,
      resumen: this.resumenChecklist(a),
      puede: {
        planificar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.AUDITORIAS_PLANIFICAR),
        ejecutar,
        aprobarInforme: actor.esSuperAdmin || actor.permisos.includes(PERMISO.AUDITORIAS_APROBAR_INFORME),
        cerrar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.AUDITORIAS_CERRAR),
        crearHallazgo: actor.esSuperAdmin || actor.permisos.includes(PERMISO.HALLAZGOS_CREAR),
      },
    };
  }

  async crear(dto: CrearAuditoriaDto, actor: UsuarioActual) {
    this.exigeModulo(actor, PERMISO.AUDITORIAS_PLANIFICAR);
    if (await this.prisma.auditoria.findUnique({ where: { codigo: dto.codigo } })) {
      throw new ConflictException('Ya existe una auditoría con ese código');
    }
    if (dto.programaId && !(await this.prisma.programaAuditoria.findUnique({ where: { id: dto.programaId } }))) {
      throw new NotFoundException('Programa no encontrado');
    }
    await this.validarRefs(dto);

    const a = await this.prisma.auditoria.create({
      data: {
        codigo: dto.codigo.toUpperCase(),
        programaId: dto.programaId ?? null,
        tipo: dto.tipo,
        procesoId: dto.procesoId ?? null,
        areaId: dto.areaId ?? null,
        objetivo: dto.objetivo.trim(),
        alcance: dto.alcance.trim(),
        criterios: dto.criterios.trim(),
        auditorLiderId: dto.auditorLiderId ?? null,
        fechaPlanificada: new Date(dto.fechaPlanificada),
        equipo: dto.equipoIds?.length
          ? { create: dto.equipoIds.map((usuarioId) => ({ usuarioId })) }
          : undefined,
      },
    });
    await this.bitacora.registrar({
      accion: 'auditoria.crear', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Auditoria', entidadId: a.id, valorNuevo: { codigo: a.codigo },
    });
    return this.obtener(a.id, actor);
  }

  async editar(id: string, dto: EditarAuditoriaDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    this.exigeModulo(actor, PERMISO.AUDITORIAS_PLANIFICAR);
    if (['CERRADA', 'CANCELADA'].includes(a.estado)) {
      throw new BadRequestException('La auditoría ya está cerrada o cancelada');
    }
    await this.validarRefs(dto);

    await this.prisma.$transaction([
      this.prisma.auditoria.update({
        where: { id },
        data: {
          tipo: dto.tipo,
          procesoId: dto.procesoId === undefined ? undefined : dto.procesoId,
          areaId: dto.areaId === undefined ? undefined : dto.areaId,
          objetivo: dto.objetivo?.trim(),
          alcance: dto.alcance?.trim(),
          criterios: dto.criterios?.trim(),
          auditorLiderId: dto.auditorLiderId === undefined ? undefined : dto.auditorLiderId,
        },
      }),
      ...(dto.equipoIds
        ? [
            this.prisma.auditoriaAuditor.deleteMany({ where: { auditoriaId: id } }),
            this.prisma.auditoriaAuditor.createMany({
              data: dto.equipoIds.map((usuarioId) => ({ auditoriaId: id, usuarioId })),
            }),
          ]
        : []),
    ]);
    await this.bitacora.registrar({
      accion: 'auditoria.editar', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Auditoria', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async reprogramar(id: string, dto: ReprogramarDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    this.exigeModulo(actor, PERMISO.AUDITORIAS_PLANIFICAR);
    if (!['PLANIFICADA', 'EN_CURSO'].includes(a.estado)) {
      throw new BadRequestException('Solo se puede reprogramar una auditoría planificada o en curso');
    }
    const log = (a.reprogramaciones as unknown[]) ?? [];
    log.push({
      fechaAnterior: a.fechaPlanificada.toISOString(),
      fechaNueva: new Date(dto.fechaNueva).toISOString(),
      motivo: dto.motivo,
      fecha: new Date().toISOString(),
      porId: actor.id,
    });
    await this.prisma.auditoria.update({
      where: { id },
      data: { fechaPlanificada: new Date(dto.fechaNueva), reprogramaciones: log as Prisma.InputJsonValue },
    });
    await this.bitacora.registrar({
      accion: 'auditoria.reprogramar', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Auditoria', entidadId: id, valorNuevo: { fechaNueva: dto.fechaNueva, motivo: dto.motivo },
    });
    return this.obtener(id, actor);
  }

  async cancelar(id: string, dto: CancelarDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    this.exigeModulo(actor, PERMISO.AUDITORIAS_CERRAR);
    if (['CERRADA', 'CANCELADA'].includes(a.estado)) throw new BadRequestException('Ya está cerrada o cancelada');
    await this.prisma.auditoria.update({ where: { id }, data: { estado: 'CANCELADA' } });
    await this.bitacora.registrar({
      accion: 'auditoria.cancelar', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Auditoria', entidadId: id, valorNuevo: { motivo: dto.motivo },
    });
    return this.obtener(id, actor);
  }

  // ── Checklist ────────────────────────────────────────────────────────────

  async agregarItem(id: string, dto: ItemChecklistDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    await this.exigeEjecutar(a, actor);
    if (['EJECUTADA', 'INFORME_APROBADO', 'CERRADA', 'CANCELADA'].includes(a.estado)) {
      throw new BadRequestException('La ejecución ya finalizó; no se pueden agregar ítems');
    }
    const max = await this.prisma.auditoriaItem.aggregate({ where: { auditoriaId: id }, _max: { orden: true } });
    const item = await this.prisma.auditoriaItem.create({
      data: {
        auditoriaId: id,
        orden: dto.orden ?? (max._max.orden ?? 0) + 1,
        criterio: dto.criterio.trim(),
        procesoId: dto.procesoId ?? a.procesoId,
      },
    });
    await this.bitacora.registrar({
      accion: 'auditoria.item_agregar', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Auditoria', entidadId: id, valorNuevo: { itemId: item.id },
    });
    return this.obtener(id, actor);
  }

  async quitarItem(id: string, itemId: string, actor: UsuarioActual) {
    const a = await this.exige(id);
    await this.exigeEjecutar(a, actor);
    const item = await this.prisma.auditoriaItem.findFirst({ where: { id: itemId, auditoriaId: id }, include: { hallazgos: true } });
    if (!item) throw new NotFoundException('Ítem no encontrado');
    if (item.hallazgos.length) throw new BadRequestException('El ítem tiene un hallazgo asociado; no se puede eliminar');
    await this.prisma.auditoriaItem.delete({ where: { id: itemId } });
    return this.obtener(id, actor);
  }

  async iniciar(id: string, actor: UsuarioActual) {
    const a = await this.exige(id);
    await this.exigeEjecutar(a, actor);
    if (a.estado !== 'PLANIFICADA') throw new BadRequestException('La auditoría no está planificada');
    if ((await this.prisma.auditoriaItem.count({ where: { auditoriaId: id } })) === 0) {
      throw new BadRequestException('Agrega al menos un ítem al checklist antes de iniciar');
    }
    await this.prisma.auditoria.update({ where: { id }, data: { estado: 'EN_CURSO', fechaInicioReal: new Date() } });
    await this.bitacora.registrar({
      accion: 'auditoria.iniciar', actorId: actor.id, actorEmail: actor.email, entidad: 'Auditoria', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async registrarResultado(id: string, itemId: string, dto: ResultadoItemDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    await this.exigeEjecutar(a, actor);
    if (a.estado !== 'EN_CURSO') throw new BadRequestException('La auditoría no está en curso');
    const item = await this.prisma.auditoriaItem.findFirst({ where: { id: itemId, auditoriaId: id } });
    if (!item) throw new NotFoundException('Ítem no encontrado');
    await this.prisma.auditoriaItem.update({
      where: { id: itemId },
      data: { resultado: dto.resultado, notas: dto.notas?.trim() ?? null },
    });
    return this.obtener(id, actor);
  }

  async finalizarEjecucion(id: string, actor: UsuarioActual) {
    const a = await this.exige(id);
    await this.exigeEjecutar(a, actor);
    if (a.estado !== 'EN_CURSO') throw new BadRequestException('La auditoría no está en curso');
    const pendientes = a.items.filter((it) => it.resultado === 'PENDIENTE').length;
    if (pendientes > 0) throw new BadRequestException(`Faltan ${pendientes} ítem(s) por evaluar`);

    const resumen = this.textoResumen(a);
    await this.prisma.auditoria.update({
      where: { id },
      data: { estado: 'EJECUTADA', fechaFinReal: new Date(), informeResumen: a.informeResumen ?? resumen },
    });
    await this.bitacora.registrar({
      accion: 'auditoria.finalizar', actorId: actor.id, actorEmail: actor.email, entidad: 'Auditoria', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  // ── Hallazgos desde checklist ────────────────────────────────────────────

  async generarHallazgo(id: string, itemId: string, dto: GenerarHallazgoDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    await this.exigeEjecutar(a, actor);
    this.exigeModulo(actor, PERMISO.HALLAZGOS_CREAR);
    const item = await this.prisma.auditoriaItem.findFirst({ where: { id: itemId, auditoriaId: id }, include: { hallazgos: true } });
    if (!item) throw new NotFoundException('Ítem no encontrado');
    if (item.hallazgos.length) throw new ConflictException('Este ítem ya tiene un hallazgo');
    if (!['NO_CUMPLE', 'OBSERVACION'].includes(item.resultado)) {
      throw new BadRequestException('Solo se generan hallazgos de ítems con resultado "no cumple" u "observación"');
    }
    if (dto.responsableId) await this.usuarioExiste(dto.responsableId);

    const anio = new Date().getFullYear();
    const seq = (await this.prisma.hallazgo.count({ where: { codigo: { startsWith: `H-${anio}-` } } })) + 1;
    const codigo = `H-${anio}-${String(seq).padStart(3, '0')}`;

    const h = await this.prisma.hallazgo.create({
      data: {
        codigo,
        origen: 'AUDITORIA',
        auditoriaId: id,
        auditoriaItemId: itemId,
        procesoId: item.procesoId ?? a.procesoId,
        areaId: a.areaId,
        descripcion: (dto.descripcion ?? item.notas ?? item.criterio).trim(),
        clasificacion: dto.clasificacion,
        requisito: dto.requisito?.trim() ?? item.criterio.slice(0, 190),
        evidencia: item.notas,
        detectadoPorId: actor.id,
        responsableId: dto.responsableId ?? null,
        fechaCompromiso: dto.fechaCompromiso ? new Date(dto.fechaCompromiso) : null,
        prioridad: dto.prioridad ?? 'MEDIA',
      },
    });
    await this.bitacora.registrar({
      accion: 'hallazgo.crear_desde_auditoria', actorId: actor.id, actorEmail: actor.email,
      entidad: 'Hallazgo', entidadId: h.id, valorNuevo: { codigo, auditoria: a.codigo },
    });
    return this.obtener(id, actor);
  }

  // ── Informe ──────────────────────────────────────────────────────────────

  async editarInforme(id: string, dto: InformeDto, actor: UsuarioActual) {
    const a = await this.exige(id);
    await this.exigeEjecutar(a, actor);
    if (!['EJECUTADA'].includes(a.estado)) throw new BadRequestException('El informe se edita cuando la auditoría está ejecutada');
    await this.prisma.auditoria.update({
      where: { id },
      data: { informeResumen: dto.resumen, informeConclusiones: dto.conclusiones },
    });
    return this.obtener(id, actor);
  }

  async aprobarInforme(id: string, actor: UsuarioActual) {
    const a = await this.exige(id);
    this.exigeModulo(actor, PERMISO.AUDITORIAS_APROBAR_INFORME);
    if (a.estado !== 'EJECUTADA') throw new BadRequestException('La auditoría debe estar ejecutada');
    await this.prisma.auditoria.update({
      where: { id },
      data: { estado: 'INFORME_APROBADO', informeAprobadoPorId: actor.id, informeAprobadoAt: new Date() },
    });
    await this.bitacora.registrar({
      accion: 'auditoria.informe_aprobar', actorId: actor.id, actorEmail: actor.email, entidad: 'Auditoria', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async cerrar(id: string, actor: UsuarioActual) {
    const a = await this.exige(id);
    this.exigeModulo(actor, PERMISO.AUDITORIAS_CERRAR);
    if (a.estado !== 'INFORME_APROBADO') throw new BadRequestException('El informe debe estar aprobado');
    const sinResponsable = a.hallazgos.filter((h) => !h.responsable && h.estado !== 'CERRADO').length;
    if (sinResponsable > 0) {
      throw new BadRequestException(`Hay ${sinResponsable} hallazgo(s) sin responsable asignado`);
    }
    await this.prisma.auditoria.update({ where: { id }, data: { estado: 'CERRADA' } });
    await this.bitacora.registrar({
      accion: 'auditoria.cerrar', actorId: actor.id, actorEmail: actor.email, entidad: 'Auditoria', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  // ── Auxiliares ───────────────────────────────────────────────────────────

  private async exige(id: string): Promise<AudFull> {
    const a = await this.prisma.auditoria.findUnique({ where: { id }, include: INCLUDE });
    if (!a) throw new NotFoundException('Auditoría no encontrada');
    return a;
  }

  private exigeModulo(actor: UsuarioActual, permiso: string) {
    if (!actor.esSuperAdmin && !actor.permisos.includes(permiso)) {
      throw new ForbiddenException(`No tienes permiso para esta acción (${permiso})`);
    }
  }

  private esEquipo(a: AudFull, actor: UsuarioActual): boolean {
    return a.auditorLiderId === actor.id || a.equipo.some((e) => e.usuarioId === actor.id);
  }

  private async puedeVer(a: AudFull, actor: UsuarioActual): Promise<boolean> {
    if (actor.esSuperAdmin) return true;
    if (this.esEquipo(a, actor)) return true;
    if (a.proceso) return this.alcance.puedeSobreProceso(actor, PERMISO.AUDITORIAS_VER, a.proceso);
    return actor.permisos.includes(PERMISO.AUDITORIAS_VER);
  }

  private async puedeEjecutar(a: AudFull, actor: UsuarioActual): Promise<boolean> {
    if (actor.esSuperAdmin) return true;
    if (!actor.permisos.includes(PERMISO.AUDITORIAS_EJECUTAR)) return false;
    return this.esEquipo(a, actor) || actor.permisos.includes(PERMISO.AUDITORIAS_PLANIFICAR);
  }

  private async exigeEjecutar(a: AudFull, actor: UsuarioActual) {
    if (!(await this.puedeEjecutar(a, actor))) {
      throw new ForbiddenException('Solo el equipo auditor puede ejecutar esta auditoría');
    }
  }

  private async filtrarVisibles(lista: AudFull[], actor: UsuarioActual): Promise<AudFull[]> {
    const out: AudFull[] = [];
    for (const a of lista) if (await this.puedeVer(a, actor)) out.push(a);
    return out;
  }

  private async usuarioExiste(uid: string) {
    if (!(await this.prisma.usuario.findUnique({ where: { id: uid } }))) throw new NotFoundException('Usuario no encontrado');
  }

  private async validarRefs(dto: { procesoId?: string | null; areaId?: string | null; auditorLiderId?: string | null; equipoIds?: string[] }) {
    if (dto.procesoId && !(await this.prisma.proceso.findUnique({ where: { id: dto.procesoId } })))
      throw new NotFoundException('Proceso no encontrado');
    if (dto.areaId && !(await this.prisma.unidadOrganizativa.findUnique({ where: { id: dto.areaId } })))
      throw new NotFoundException('Área no encontrada');
    for (const uid of [dto.auditorLiderId, ...(dto.equipoIds ?? [])]) if (uid) await this.usuarioExiste(uid);
  }

  private resumenChecklist(a: AudFull) {
    const c = { PENDIENTE: 0, CUMPLE: 0, NO_CUMPLE: 0, OBSERVACION: 0, NO_APLICA: 0 } as Record<ResultadoItem, number>;
    for (const it of a.items) c[it.resultado]++;
    const evaluables = c.CUMPLE + c.NO_CUMPLE + c.OBSERVACION;
    const hall = { mayores: 0, menores: 0, observaciones: 0, oportunidades: 0 };
    for (const h of a.hallazgos) {
      if (h.clasificacion === 'NO_CONFORMIDAD_MAYOR') hall.mayores++;
      else if (h.clasificacion === 'NO_CONFORMIDAD_MENOR') hall.menores++;
      else if (h.clasificacion === 'OBSERVACION') hall.observaciones++;
      else hall.oportunidades++;
    }
    return {
      total: a.items.length,
      ...c,
      cumplimiento: evaluables ? Math.round((c.CUMPLE / evaluables) * 100) : null,
      hallazgos: hall,
    };
  }

  private textoResumen(a: AudFull): string {
    const r = this.resumenChecklist(a);
    return [
      `Auditoría ${a.codigo} (${a.tipo}).`,
      `Se evaluaron ${r.total} criterios: ${r.CUMPLE} conformes, ${r.NO_CUMPLE} no conformes, ${r.OBSERVACION} observaciones, ${r.NO_APLICA} no aplican.`,
      r.cumplimiento != null ? `Cumplimiento: ${r.cumplimiento}%.` : '',
      `Hallazgos: ${r.hallazgos.mayores} no conformidades mayores, ${r.hallazgos.menores} menores, ${r.hallazgos.observaciones} observaciones, ${r.hallazgos.oportunidades} oportunidades de mejora.`,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private resumen(a: AudFull) {
    const r = this.resumenChecklist(a);
    return {
      id: a.id,
      codigo: a.codigo,
      tipo: a.tipo,
      estado: a.estado,
      objetivo: a.objetivo,
      proceso: a.proceso ? { id: a.proceso.id, codigo: a.proceso.codigo, nombre: a.proceso.nombre } : null,
      area: a.area,
      auditorLider: a.auditorLider,
      fechaPlanificada: a.fechaPlanificada,
      fechaFinReal: a.fechaFinReal,
      programa: a.programa,
      totalItems: r.total,
      cumplimiento: r.cumplimiento,
      hallazgosAbiertos: a.hallazgos.filter((h) => h.estado !== 'CERRADO').length,
      vencida:
        ['PLANIFICADA', 'EN_CURSO'].includes(a.estado) && a.fechaPlanificada.getTime() < Date.now(),
    };
  }

  private detalle(a: AudFull) {
    return {
      ...this.resumen(a),
      alcance: a.alcance,
      criterios: a.criterios,
      equipo: a.equipo.map((e) => e.usuario),
      fechaInicioReal: a.fechaInicioReal,
      reprogramaciones: a.reprogramaciones,
      informeResumen: a.informeResumen,
      informeConclusiones: a.informeConclusiones,
      informeAprobadoAt: a.informeAprobadoAt,
      creadoAt: a.creadoAt,
    };
  }
}
