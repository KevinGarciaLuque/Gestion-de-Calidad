import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type CategoriaRiesgo, type MatrizRiesgo } from '@prisma/client';
import { AlcanceService } from '../auth/rbac/alcance.service';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import { categoriaDe, nivelDe, requiereTratamientoFormal } from './calculo';
import type {
  CerrarRiesgoDto,
  ConfigurarMatrizDto,
  CrearRiesgoDto,
  EditarRiesgoDto,
  ListarRiesgosQuery,
  ReevaluarRiesgoDto,
  RevisarRiesgoDto,
} from './dto/riesgo.dto';

type RiesgoFull = Prisma.RiesgoGetPayload<{
  include: {
    proceso: { select: { id: true; codigo: true; nombre: true; areaId: true; responsableId: true; suplenteId: true } };
    responsable: { select: { id: true; nombre: true } };
  };
}>;

const INCLUDE = {
  proceso: {
    select: { id: true, codigo: true, nombre: true, areaId: true, responsableId: true, suplenteId: true },
  },
  responsable: { select: { id: true, nombre: true } },
} satisfies Prisma.RiesgoInclude;

const EN_MS = 86_400_000;

@Injectable()
export class RiesgosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  // ── Matriz ───────────────────────────────────────────────────────────────

  async matriz(): Promise<MatrizRiesgo> {
    const m = await this.prisma.matrizRiesgo.findUnique({ where: { id: 1 } });
    if (!m) throw new NotFoundException('La matriz de riesgo no está configurada');
    return m;
  }

  async configurarMatriz(dto: ConfigurarMatrizDto, actor: UsuarioActual) {
    if (!(dto.umbralMedio < dto.umbralAlto && dto.umbralAlto < dto.umbralCritico)) {
      throw new BadRequestException('Los umbrales deben ser crecientes (medio < alto < crítico)');
    }
    const m = await this.prisma.matrizRiesgo.update({
      where: { id: 1 },
      data: {
        escalaProbabilidad: dto.escalaProbabilidad as unknown as Prisma.InputJsonValue,
        escalaImpacto: dto.escalaImpacto as unknown as Prisma.InputJsonValue,
        umbralMedio: dto.umbralMedio,
        umbralAlto: dto.umbralAlto,
        umbralCritico: dto.umbralCritico,
        mesesRevisionDefault: dto.mesesRevisionDefault,
      },
    });
    await this.recalcularCategorias(m);
    await this.bitacora.registrar({
      accion: 'riesgos.configurar_matriz',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'MatrizRiesgo', entidadId: '1',
      valorNuevo: { umbralMedio: m.umbralMedio, umbralAlto: m.umbralAlto, umbralCritico: m.umbralCritico },
    });
    return m;
  }

  private async recalcularCategorias(m: MatrizRiesgo) {
    const riesgos = await this.prisma.riesgo.findMany();
    for (const r of riesgos) {
      const catI = categoriaDe(r.nivelInherente, m);
      const catR = r.nivelResidual != null ? categoriaDe(r.nivelResidual, m) : null;
      if (catI !== r.categoriaInherente || catR !== r.categoriaResidual) {
        await this.prisma.riesgo.update({
          where: { id: r.id },
          data: { categoriaInherente: catI, categoriaResidual: catR },
        });
      }
    }
  }

  // ── Consultas ────────────────────────────────────────────────────────────

  async listar(q: ListarRiesgosQuery, actor: UsuarioActual): Promise<Paginado<unknown>> {
    const procesosIds = await this.alcance.procesosVisiblesIds(actor, PERMISO.RIESGOS_VER);
    const and: Prisma.RiesgoWhereInput[] = [];
    if (procesosIds) and.push({ procesoId: { in: procesosIds } });
    if (q.procesoId) and.push({ procesoId: q.procesoId });
    if (q.tipo) and.push({ tipo: q.tipo });
    if (q.estado) and.push({ estado: q.estado });
    if (q.categoria) {
      and.push({ OR: [{ categoriaResidual: q.categoria }, { categoriaResidual: null, categoriaInherente: q.categoria }] });
    }
    if (q.q) and.push({ OR: [{ descripcion: { contains: q.q } }, { codigo: { contains: q.q } }] });
    const where: Prisma.RiesgoWhereInput = and.length ? { AND: and } : {};

    const [filas, total] = await this.prisma.$transaction([
      this.prisma.riesgo.findMany({
        where, include: INCLUDE,
        orderBy: [{ archivadoAt: 'asc' }, { nivelInherente: 'desc' }],
        skip: q.skip, take: q.porPagina,
      }),
      this.prisma.riesgo.count({ where }),
    ]);

    let datos = filas.map((r) => this.resumen(r));
    if (q.soloConAlerta) {
      datos = datos.filter((d) => Object.values(d.alerta).some((v) => v === true));
    }
    return paginar(datos, total, q);
  }

  async mapaCalor(actor: UsuarioActual, tipo: 'RIESGO' | 'OPORTUNIDAD') {
    const m = await this.matriz();
    const procesosIds = await this.alcance.procesosVisiblesIds(actor, PERMISO.RIESGOS_VER);
    const riesgos = await this.prisma.riesgo.findMany({
      where: {
        tipo,
        archivadoAt: null,
        estado: { not: 'CERRADO' },
        ...(procesosIds ? { procesoId: { in: procesosIds } } : {}),
      },
      include: INCLUDE,
    });

    const probs = (m.escalaProbabilidad as { valor: number; etiqueta: string }[]).sort((a, b) => a.valor - b.valor);
    const imps = (m.escalaImpacto as { valor: number; etiqueta: string }[]).sort((a, b) => a.valor - b.valor);

    const celdas = probs.map((p) =>
      imps.map((i) => {
        const nivel = nivelDe(p.valor, i.valor);
        const enCelda = riesgos.filter((r) => {
          const prob = r.probabilidadResidual ?? r.probabilidadInherente;
          const imp = r.impactoResidual ?? r.impactoInherente;
          return prob === p.valor && imp === i.valor;
        });
        return {
          probabilidad: p.valor,
          impacto: i.valor,
          nivel,
          categoria: categoriaDe(nivel, m),
          riesgos: enCelda.map((r) => ({ id: r.id, codigo: r.codigo, descripcion: r.descripcion })),
        };
      }),
    );

    return {
      escalaProbabilidad: probs,
      escalaImpacto: imps,
      umbrales: { umbralMedio: m.umbralMedio, umbralAlto: m.umbralAlto, umbralCritico: m.umbralCritico },
      nivelMaximo: Math.max(...probs.map((p) => p.valor)) * Math.max(...imps.map((i) => i.valor)),
      celdas,
      total: riesgos.length,
    };
  }

  async transversales(actor: UsuarioActual) {
    const procesosIds = await this.alcance.procesosVisiblesIds(actor, PERMISO.RIESGOS_VER);
    const riesgos = await this.prisma.riesgo.findMany({
      where: { archivadoAt: null, ...(procesosIds ? { procesoId: { in: procesosIds } } : {}) },
      include: INCLUDE,
    });

    const grupos = new Map<string, RiesgoFull[]>();
    for (const r of riesgos) {
      const clave = r.descripcion.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave)!.push(r);
    }

    return [...grupos.values()]
      .filter((g) => new Set(g.map((r) => r.procesoId)).size >= 2)
      .map((g) => ({
        descripcion: g[0].descripcion,
        procesos: g.map((r) => ({
          riesgoId: r.id,
          codigo: r.codigo,
          proceso: { id: r.proceso.id, codigo: r.proceso.codigo, nombre: r.proceso.nombre },
          categoria: r.categoriaResidual ?? r.categoriaInherente,
        })),
      }));
  }

  async obtener(id: string, actor: UsuarioActual) {
    const r = await this.prisma.riesgo.findUnique({
      where: { id },
      include: {
        ...INCLUDE,
        revisiones: {
          orderBy: { fecha: 'desc' },
          include: { revisadoPor: { select: { id: true, nombre: true } } },
        },
      },
    });
    if (!r) throw new NotFoundException('Riesgo no encontrado');
    if (!(await this.alcance.puedeSobreProceso(actor, PERMISO.RIESGOS_VER, r.proceso))) {
      throw new ForbiddenException('No tienes acceso a este riesgo');
    }
    const m = await this.matriz();

    return {
      riesgo: this.detalle(r, m),
      revisiones: r.revisiones,
      matriz: {
        escalaProbabilidad: m.escalaProbabilidad,
        escalaImpacto: m.escalaImpacto,
        umbrales: { umbralMedio: m.umbralMedio, umbralAlto: m.umbralAlto, umbralCritico: m.umbralCritico },
      },
      puede: {
        editar: await this.alcance.puedeSobreProceso(actor, PERMISO.RIESGOS_EDITAR, r.proceso),
        cerrar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.RIESGOS_CERRAR),
        archivar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.RIESGOS_ARCHIVAR),
      },
    };
  }

  // ── Alta y edición ───────────────────────────────────────────────────────

  async crear(dto: CrearRiesgoDto, actor: UsuarioActual) {
    if (await this.prisma.riesgo.findUnique({ where: { codigo: dto.codigo } })) {
      throw new ConflictException('Ya existe un riesgo con ese código');
    }
    const proceso = await this.prisma.proceso.findUnique({ where: { id: dto.procesoId } });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');
    if (!(await this.alcance.puedeSobreProceso(actor, PERMISO.RIESGOS_CREAR, proceso))) {
      throw new ForbiddenException('No puedes registrar riesgos en este proceso');
    }
    const m = await this.matriz();
    this.validarEscala(m, dto.probabilidadInherente, dto.impactoInherente);

    const nivel = nivelDe(dto.probabilidadInherente, dto.impactoInherente);
    const revision = new Date();
    revision.setMonth(revision.getMonth() + m.mesesRevisionDefault);

    const r = await this.prisma.riesgo.create({
      data: {
        codigo: dto.codigo.toUpperCase(),
        tipo: dto.tipo,
        procesoId: dto.procesoId,
        descripcion: dto.descripcion.trim(),
        causa: dto.causa?.trim() ?? null,
        consecuencia: dto.consecuencia?.trim() ?? null,
        probabilidadInherente: dto.probabilidadInherente,
        impactoInherente: dto.impactoInherente,
        nivelInherente: nivel,
        categoriaInherente: categoriaDe(nivel, m),
        estado: 'IDENTIFICADO',
        fechaRevision: revision,
      },
      include: INCLUDE,
    });
    await this.bitacora.registrar({
      accion: 'riesgo.crear',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Riesgo', entidadId: r.id,
      valorNuevo: { codigo: r.codigo, tipo: r.tipo, categoria: r.categoriaInherente },
    });
    return this.obtener(r.id, actor);
  }

  async editar(id: string, dto: EditarRiesgoDto, actor: UsuarioActual) {
    const r = await this.exige(id, actor, PERMISO.RIESGOS_EDITAR);
    const m = await this.matriz();

    if (dto.estado && ['CERRADO', 'MATERIALIZADO'].includes(dto.estado)) {
      throw new BadRequestException('Usa las acciones de cerrar / materializar para ese cambio de estado');
    }
    if (dto.responsableId) {
      const u = await this.prisma.usuario.findUnique({ where: { id: dto.responsableId } });
      if (!u) throw new NotFoundException('Responsable no encontrado');
    }

    const prob = dto.probabilidadInherente ?? r.probabilidadInherente;
    const imp = dto.impactoInherente ?? r.impactoInherente;
    if (dto.probabilidadInherente || dto.impactoInherente) this.validarEscala(m, prob, imp);
    const nivelInh = nivelDe(prob, imp);

    await this.prisma.riesgo.update({
      where: { id },
      data: {
        descripcion: dto.descripcion?.trim(),
        causa: dto.causa === undefined ? undefined : dto.causa,
        consecuencia: dto.consecuencia === undefined ? undefined : dto.consecuencia,
        probabilidadInherente: dto.probabilidadInherente,
        impactoInherente: dto.impactoInherente,
        nivelInherente: nivelInh,
        categoriaInherente: categoriaDe(nivelInh, m),
        controles: dto.controles === undefined ? undefined : dto.controles,
        eficaciaControl: dto.eficaciaControl,
        planTratamiento: dto.planTratamiento === undefined ? undefined : dto.planTratamiento,
        responsableId: dto.responsableId === undefined ? undefined : dto.responsableId,
        fechaCompromiso:
          dto.fechaCompromiso === undefined
            ? undefined
            : dto.fechaCompromiso
              ? new Date(dto.fechaCompromiso)
              : null,
        estado: dto.estado,
      },
    });
    await this.bitacora.registrar({
      accion: 'riesgo.editar',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Riesgo', entidadId: id,
      valorNuevo: dto as Prisma.InputJsonValue,
    });
    return this.obtener(id, actor);
  }

  async reevaluar(id: string, dto: ReevaluarRiesgoDto, actor: UsuarioActual) {
    const r = await this.exige(id, actor, PERMISO.RIESGOS_EDITAR);
    const m = await this.matriz();
    this.validarEscala(m, dto.probabilidadResidual, dto.impactoResidual);

    const nivel = nivelDe(dto.probabilidadResidual, dto.impactoResidual);
    const categoria = categoriaDe(nivel, m);
    const proxima = new Date();
    proxima.setMonth(proxima.getMonth() + (dto.mesesProximaRevision ?? m.mesesRevisionDefault));

    await this.prisma.$transaction([
      this.prisma.riesgo.update({
        where: { id },
        data: {
          probabilidadResidual: dto.probabilidadResidual,
          impactoResidual: dto.impactoResidual,
          nivelResidual: nivel,
          categoriaResidual: categoria,
          ultimaRevisionAt: new Date(),
          fechaRevision: proxima,
          requiereReevaluacion: false,
          estado: r.estado === 'IDENTIFICADO' ? 'EN_TRATAMIENTO' : r.estado,
        },
      }),
      this.prisma.revisionRiesgo.create({
        data: {
          riesgoId: id,
          revisadoPorId: actor.id,
          comentario: dto.comentario ?? null,
          probabilidad: dto.probabilidadResidual,
          impacto: dto.impactoResidual,
          nivel,
          categoria,
          esResidual: true,
        },
      }),
    ]);
    await this.bitacora.registrar({
      accion: 'riesgo.reevaluar',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Riesgo', entidadId: id,
      valorNuevo: { nivelResidual: nivel, categoria },
    });
    return this.obtener(id, actor);
  }

  async revisar(id: string, dto: RevisarRiesgoDto, actor: UsuarioActual) {
    const r = await this.exige(id, actor, PERMISO.RIESGOS_EDITAR);
    const m = await this.matriz();
    const proxima = new Date();
    proxima.setMonth(proxima.getMonth() + (dto.mesesProximaRevision ?? m.mesesRevisionDefault));

    await this.prisma.$transaction([
      this.prisma.riesgo.update({
        where: { id },
        data: { ultimaRevisionAt: new Date(), fechaRevision: proxima, requiereReevaluacion: false },
      }),
      this.prisma.revisionRiesgo.create({
        data: {
          riesgoId: id,
          revisadoPorId: actor.id,
          comentario: dto.comentario ?? null,
          probabilidad: r.probabilidadResidual ?? r.probabilidadInherente,
          impacto: r.impactoResidual ?? r.impactoInherente,
          nivel: r.nivelResidual ?? r.nivelInherente,
          categoria: r.categoriaResidual ?? r.categoriaInherente,
          esResidual: false,
        },
      }),
    ]);
    await this.bitacora.registrar({
      accion: 'riesgo.revisar',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Riesgo', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async marcarReevaluacion(id: string, valor: boolean, actor: UsuarioActual) {
    await this.exige(id, actor, PERMISO.RIESGOS_EDITAR);
    await this.prisma.riesgo.update({ where: { id }, data: { requiereReevaluacion: valor } });
    await this.bitacora.registrar({
      accion: valor ? 'riesgo.solicitar_reevaluacion' : 'riesgo.quitar_reevaluacion',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Riesgo', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async cerrar(id: string, dto: CerrarRiesgoDto, actor: UsuarioActual) {
    const r = await this.prisma.riesgo.findUnique({ where: { id }, include: INCLUDE });
    if (!r) throw new NotFoundException('Riesgo no encontrado');
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.RIESGOS_CERRAR)) {
      throw new ForbiddenException('No tienes permiso para cerrar riesgos');
    }
    const categoria = r.categoriaResidual ?? r.categoriaInherente;
    if (requiereTratamientoFormal(categoria) && (!r.responsableId || !r.planTratamiento)) {
      throw new BadRequestException(
        'Un riesgo alto o crítico necesita responsable y plan de tratamiento antes de cerrarse',
      );
    }

    await this.prisma.$transaction([
      this.prisma.riesgo.update({ where: { id }, data: { estado: 'CERRADO', ultimaRevisionAt: new Date() } }),
      this.prisma.revisionRiesgo.create({
        data: { riesgoId: id, revisadoPorId: actor.id, comentario: dto.comentario, esResidual: false },
      }),
    ]);
    await this.bitacora.registrar({
      accion: 'riesgo.cerrar',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Riesgo', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async reabrir(id: string, actor: UsuarioActual) {
    const r = await this.prisma.riesgo.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Riesgo no encontrado');
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.RIESGOS_CERRAR)) {
      throw new ForbiddenException('No tienes permiso');
    }
    await this.prisma.riesgo.update({ where: { id }, data: { estado: 'MONITOREADO' } });
    await this.bitacora.registrar({
      accion: 'riesgo.reabrir',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Riesgo', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  async archivar(id: string, arch: boolean, actor: UsuarioActual) {
    const r = await this.prisma.riesgo.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Riesgo no encontrado');
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.RIESGOS_ARCHIVAR)) {
      throw new ForbiddenException('No tienes permiso para archivar riesgos');
    }
    await this.prisma.riesgo.update({ where: { id }, data: { archivadoAt: arch ? new Date() : null } });
    await this.bitacora.registrar({
      accion: arch ? 'riesgo.archivar' : 'riesgo.desarchivar',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Riesgo', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  // ── Auxiliares ───────────────────────────────────────────────────────────

  private async exige(id: string, actor: UsuarioActual, permiso: string): Promise<RiesgoFull> {
    const r = await this.prisma.riesgo.findUnique({ where: { id }, include: INCLUDE });
    if (!r) throw new NotFoundException('Riesgo no encontrado');
    if (!(await this.alcance.puedeSobreProceso(actor, permiso, r.proceso))) {
      throw new ForbiddenException('No tienes permiso sobre este riesgo');
    }
    return r;
  }

  private validarEscala(m: MatrizRiesgo, prob: number, imp: number) {
    const probs = (m.escalaProbabilidad as { valor: number }[]).map((x) => x.valor);
    const imps = (m.escalaImpacto as { valor: number }[]).map((x) => x.valor);
    if (!probs.includes(prob)) throw new BadRequestException('Probabilidad fuera de la escala configurada');
    if (!imps.includes(imp)) throw new BadRequestException('Impacto fuera de la escala configurada');
  }

  private alerta(r: RiesgoFull) {
    const hoy = Date.now();
    const categoria = r.categoriaResidual ?? r.categoriaInherente;
    const abierto = r.estado !== 'CERRADO';
    return {
      revisionVencida: abierto && !!r.fechaRevision && r.fechaRevision.getTime() < hoy,
      revisionProxima:
        abierto &&
        !!r.fechaRevision &&
        r.fechaRevision.getTime() >= hoy &&
        r.fechaRevision.getTime() < hoy + 30 * EN_MS,
      planVencido:
        !!r.fechaCompromiso &&
        r.fechaCompromiso.getTime() < hoy &&
        ['IDENTIFICADO', 'EN_TRATAMIENTO'].includes(r.estado),
      faltaTratamiento:
        abierto && requiereTratamientoFormal(categoria) && (!r.responsableId || !r.planTratamiento),
      requiereReevaluacion: r.requiereReevaluacion,
      sinResidual:
        abierto && r.nivelResidual == null && ['EN_TRATAMIENTO', 'MONITOREADO'].includes(r.estado),
    };
  }

  private resumen(r: RiesgoFull) {
    return {
      id: r.id,
      codigo: r.codigo,
      tipo: r.tipo,
      descripcion: r.descripcion,
      estado: r.estado,
      proceso: { id: r.proceso.id, codigo: r.proceso.codigo, nombre: r.proceso.nombre },
      responsable: r.responsable,
      nivelInherente: r.nivelInherente,
      categoriaInherente: r.categoriaInherente,
      nivelResidual: r.nivelResidual,
      categoriaResidual: r.categoriaResidual,
      categoriaEfectiva: (r.categoriaResidual ?? r.categoriaInherente) as CategoriaRiesgo,
      fechaRevision: r.fechaRevision,
      archivado: !!r.archivadoAt,
      alerta: this.alerta(r),
    };
  }

  private detalle(r: RiesgoFull, m: MatrizRiesgo) {
    return {
      ...this.resumen(r),
      causa: r.causa,
      consecuencia: r.consecuencia,
      probabilidadInherente: r.probabilidadInherente,
      impactoInherente: r.impactoInherente,
      probabilidadResidual: r.probabilidadResidual,
      impactoResidual: r.impactoResidual,
      controles: r.controles,
      eficaciaControl: r.eficaciaControl,
      planTratamiento: r.planTratamiento,
      fechaCompromiso: r.fechaCompromiso,
      ultimaRevisionAt: r.ultimaRevisionAt,
      creadoAt: r.creadoAt,
      mesesRevisionDefault: m.mesesRevisionDefault,
    };
  }
}
