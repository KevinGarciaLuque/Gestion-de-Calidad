import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoVersionProceso, Prisma } from '@prisma/client';
import { AlcanceService } from '../auth/rbac/alcance.service';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import { ambitoDe, type UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import type { GuardarFichaDto } from './dto/ficha.dto';
import type {
  AprobarDto,
  CrearProcesoDto,
  CrearRelacionDto,
  EditarProcesoDto,
  ListarProcesosQuery,
  RevisionDto,
} from './dto/proceso.dto';
import { calcularSemaforo } from './semaforo';

const VERSION_TRABAJO: EstadoVersionProceso[] = ['BORRADOR', 'EN_REVISION'];

@Injectable()
export class ProcesosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  // ── Consultas ─────────────────────────────────────────────────────────────

  async listar(q: ListarProcesosQuery, actor: UsuarioActual): Promise<Paginado<unknown>> {
    const filtroAlcance = await this.alcance.filtroProcesos(actor, PERMISO.PROCESOS_VER);
    const and: Prisma.ProcesoWhereInput[] = [];
    if (filtroAlcance) and.push(filtroAlcance as Prisma.ProcesoWhereInput);
    if (q.tipo) and.push({ tipo: q.tipo });
    if (q.estado) and.push({ estado: q.estado });
    if (q.areaId) and.push({ areaId: q.areaId });
    if (q.q) {
      and.push({ OR: [{ nombre: { contains: q.q } }, { codigo: { contains: q.q } }] });
    }
    const where: Prisma.ProcesoWhereInput = and.length ? { AND: and } : {};

    const [filas, total] = await this.prisma.$transaction([
      this.prisma.proceso.findMany({
        where,
        orderBy: [{ tipo: 'asc' }, { codigo: 'asc' }],
        skip: q.skip,
        take: q.porPagina,
        include: {
          area: { select: { id: true, nombre: true } },
          responsable: { select: { id: true, nombre: true } },
          versiones: { select: { estado: true, numero: true } },
        },
      }),
      this.prisma.proceso.count({ where }),
    ]);

    return paginar(filas.map((p) => this.resumen(p)), total, q);
  }

  async mapa(actor: UsuarioActual) {
    const filtroAlcance = await this.alcance.filtroProcesos(actor, PERMISO.PROCESOS_VER);
    const where: Prisma.ProcesoWhereInput = {
      estado: { not: 'ARCHIVADO' },
      ...(filtroAlcance ? { AND: [filtroAlcance as Prisma.ProcesoWhereInput] } : {}),
    };

    const procesos = await this.prisma.proceso.findMany({
      where,
      orderBy: { codigo: 'asc' },
      include: {
        area: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
        versiones: { select: { estado: true, numero: true } },
      },
    });

    const columnas = ['ESTRATEGICO', 'MISIONAL', 'APOYO'] as const;
    return columnas.map((tipo) => ({
      tipo,
      procesos: procesos.filter((p) => p.tipo === tipo).map((p) => this.resumen(p)),
    }));
  }

  async obtener(id: string, actor: UsuarioActual) {
    const proceso = await this.prisma.proceso.findUnique({
      where: { id },
      include: {
        area: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true, email: true } },
        suplente: { select: { id: true, nombre: true, email: true } },
        versiones: {
          orderBy: { numero: 'desc' },
          include: { propuestaPor: { select: { id: true, nombre: true } } },
        },
        relaciones: {
          include: { destino: { select: { id: true, codigo: true, nombre: true } } },
        },
        relacionadoPor: {
          include: { origen: { select: { id: true, codigo: true, nombre: true } } },
        },
      },
    });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');

    if (!(await this.alcance.puedeSobreProceso(actor, PERMISO.PROCESOS_VER, proceso))) {
      throw new ForbiddenException('No tienes acceso a este proceso');
    }

    const vigente = proceso.versiones.find((v) => v.estado === 'APROBADA') ?? null;
    const trabajo = proceso.versiones.find((v) => VERSION_TRABAJO.includes(v.estado)) ?? null;

    const puede = {
      editar: await this.alcance.puedeSobreProceso(actor, PERMISO.PROCESOS_EDITAR, proceso),
      revisar: ambitoDe(actor, PERMISO.PROCESOS_REVISAR).global || actor.permisos.includes(PERMISO.PROCESOS_REVISAR),
      aprobar: ambitoDe(actor, PERMISO.PROCESOS_APROBAR).global || actor.permisos.includes(PERMISO.PROCESOS_APROBAR),
      archivar: actor.permisos.includes(PERMISO.PROCESOS_ARCHIVAR) || actor.esSuperAdmin,
    };

    return {
      proceso: {
        id: proceso.id,
        codigo: proceso.codigo,
        nombre: proceso.nombre,
        tipo: proceso.tipo,
        objetivo: proceso.objetivo,
        estado: proceso.estado,
        area: proceso.area,
        responsable: proceso.responsable,
        suplente: proceso.suplente,
        ultimaAprobacionAt: proceso.ultimaAprobacionAt,
        proximaRevisionAt: proceso.proximaRevisionAt,
        semaforo: calcularSemaforo({
          archivado: proceso.estado === 'ARCHIVADO',
          responsableId: proceso.responsableId,
          tieneVersionAprobada: !!vigente,
          proximaRevisionAt: proceso.proximaRevisionAt,
        }),
      },
      versionVigente: vigente,
      versionTrabajo: trabajo,
      historial: proceso.versiones.map((v) => ({
        id: v.id,
        numero: v.numero,
        estado: v.estado,
        propuestaPor: v.propuestaPor,
        enviadaRevisionAt: v.enviadaRevisionAt,
        aprobadaAt: v.aprobadaAt,
        comentarioRevision: v.comentarioRevision,
        creadoAt: v.creadoAt,
      })),
      relaciones: [
        ...proceso.relaciones.map((r) => ({
          id: r.id,
          sentido: 'saliente' as const,
          tipo: r.tipo,
          proceso: r.destino,
          descripcion: r.descripcion,
        })),
        ...proceso.relacionadoPor.map((r) => ({
          id: r.id,
          sentido: 'entrante' as const,
          tipo: r.tipo,
          proceso: r.origen,
          descripcion: r.descripcion,
        })),
      ],
      puede,
    };
  }

  private resumen(p: {
    id: string;
    codigo: string;
    nombre: string;
    tipo: string;
    estado: string;
    responsableId: string | null;
    proximaRevisionAt: Date | null;
    area: { id: string; nombre: string } | null;
    responsable: { id: string; nombre: string } | null;
    versiones: { estado: EstadoVersionProceso; numero: number }[];
  }) {
    const vigente = p.versiones.find((v) => v.estado === 'APROBADA');
    const trabajo = p.versiones.find((v) => VERSION_TRABAJO.includes(v.estado));
    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      tipo: p.tipo,
      estado: p.estado,
      area: p.area,
      responsable: p.responsable,
      versionVigente: vigente?.numero ?? null,
      enRevision: trabajo?.estado === 'EN_REVISION',
      tieneCambiosEnCurso: !!trabajo,
      semaforo: calcularSemaforo({
        archivado: p.estado === 'ARCHIVADO',
        responsableId: p.responsableId,
        tieneVersionAprobada: !!vigente,
        proximaRevisionAt: p.proximaRevisionAt,
      }),
    };
  }

  // ── Alta y edición de identificación ─────────────────────────────────────

  async crear(dto: CrearProcesoDto, actor: UsuarioActual) {
    if (await this.prisma.proceso.findUnique({ where: { codigo: dto.codigo } })) {
      throw new ConflictException('Ya existe un proceso con ese código');
    }
    await this.validarReferencias(dto);

    const proceso = await this.prisma.proceso.create({
      data: {
        codigo: dto.codigo.toUpperCase(),
        nombre: dto.nombre.trim(),
        tipo: dto.tipo,
        objetivo: dto.objetivo.trim(),
        areaId: dto.areaId ?? null,
        responsableId: dto.responsableId ?? null,
        suplenteId: dto.suplenteId ?? null,
        estado: 'BORRADOR',
        versiones: {
          create: { numero: 1, estado: 'BORRADOR', alcance: '', propuestaPorId: actor.id },
        },
      },
    });

    await this.bitacora.registrar({
      accion: 'proceso.crear',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Proceso',
      entidadId: proceso.id,
      valorNuevo: { codigo: proceso.codigo, nombre: proceso.nombre, tipo: proceso.tipo },
    });
    return this.obtener(proceso.id, actor);
  }

  async editarIdentificacion(id: string, dto: EditarProcesoDto, actor: UsuarioActual) {
    const proceso = await this.exigeProceso(id);
    await this.exigePermisoSobre(actor, PERMISO.PROCESOS_EDITAR, proceso);
    await this.validarReferencias(dto);

    await this.prisma.proceso.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        tipo: dto.tipo,
        objetivo: dto.objetivo?.trim(),
        areaId: dto.areaId === undefined ? undefined : dto.areaId,
        responsableId: dto.responsableId === undefined ? undefined : dto.responsableId,
        suplenteId: dto.suplenteId === undefined ? undefined : dto.suplenteId,
      },
    });
    await this.bitacora.registrar({
      accion: 'proceso.editar_identificacion',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Proceso',
      entidadId: id,
      valorAnterior: {
        nombre: proceso.nombre,
        tipo: proceso.tipo,
        responsableId: proceso.responsableId,
      },
      valorNuevo: dto as Prisma.InputJsonValue,
    });
    return this.obtener(id, actor);
  }

  // ── Ficha (contenido versionado) ────────────────────────────────────────

  async guardarFicha(id: string, dto: GuardarFichaDto, actor: UsuarioActual) {
    const proceso = await this.exigeProceso(id);
    await this.exigePermisoSobre(actor, PERMISO.PROCESOS_EDITAR, proceso);

    const versiones = await this.prisma.procesoVersion.findMany({
      where: { procesoId: id },
      orderBy: { numero: 'desc' },
    });
    const trabajo = versiones.find((v) => VERSION_TRABAJO.includes(v.estado));

    const contenido = {
      alcance: dto.alcance,
      entradas: dto.entradas as unknown as Prisma.InputJsonValue,
      actividades: dto.actividades as unknown as Prisma.InputJsonValue,
      salidas: dto.salidas as unknown as Prisma.InputJsonValue,
      recursos: dto.recursos as unknown as Prisma.InputJsonValue,
      notas: dto.notas ?? null,
    };

    if (trabajo?.estado === 'EN_REVISION') {
      throw new BadRequestException('La versión está en revisión; primero debe aprobarse o devolverse');
    }

    let version;
    if (trabajo) {
      version = await this.prisma.procesoVersion.update({
        where: { id: trabajo.id },
        data: contenido,
      });
    } else {
      const numero = (versiones[0]?.numero ?? 0) + 1;
      version = await this.prisma.procesoVersion.create({
        data: { procesoId: id, numero, estado: 'BORRADOR', propuestaPorId: actor.id, ...contenido },
      });
    }

    await this.bitacora.registrar({
      accion: 'proceso.guardar_ficha',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'ProcesoVersion',
      entidadId: version.id,
      valorNuevo: { procesoId: id, version: version.numero },
    });
    return this.obtener(id, actor);
  }

  async enviarRevision(id: string, actor: UsuarioActual) {
    const proceso = await this.exigeProceso(id);
    await this.exigePermisoSobre(actor, PERMISO.PROCESOS_EDITAR, proceso);
    const trabajo = await this.versionTrabajo(id);
    if (!trabajo || trabajo.estado !== 'BORRADOR') {
      throw new BadRequestException('No hay un borrador para enviar a revisión');
    }
    if (!trabajo.alcance.trim() || (trabajo.actividades as unknown[]).length === 0) {
      throw new BadRequestException('Completa al menos el alcance y una actividad antes de enviar');
    }

    await this.prisma.procesoVersion.update({
      where: { id: trabajo.id },
      data: {
        estado: 'EN_REVISION',
        enviadaRevisionAt: new Date(),
        propuestaPorId: trabajo.propuestaPorId ?? actor.id,
        comentarioRevision: null,
      },
    });
    await this.bitacora.registrar({
      accion: 'proceso.enviar_revision',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Proceso',
      entidadId: id,
      valorNuevo: { version: trabajo.numero },
    });
    return this.obtener(id, actor);
  }

  async devolver(id: string, dto: RevisionDto, actor: UsuarioActual) {
    await this.exigeProceso(id);
    this.exigePermisoGlobalOModulo(actor, PERMISO.PROCESOS_REVISAR);
    const trabajo = await this.versionTrabajo(id);
    if (!trabajo || trabajo.estado !== 'EN_REVISION') {
      throw new BadRequestException('No hay una versión en revisión');
    }
    await this.prisma.procesoVersion.update({
      where: { id: trabajo.id },
      data: {
        estado: 'BORRADOR',
        revisadaPorId: actor.id,
        comentarioRevision: dto.comentario ?? null,
        enviadaRevisionAt: null,
      },
    });
    await this.bitacora.registrar({
      accion: 'proceso.devolver',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Proceso',
      entidadId: id,
      valorNuevo: { version: trabajo.numero, comentario: dto.comentario ?? null },
    });
    return this.obtener(id, actor);
  }

  async aprobar(id: string, dto: AprobarDto, actor: UsuarioActual) {
    await this.exigeProceso(id);
    this.exigePermisoGlobalOModulo(actor, PERMISO.PROCESOS_APROBAR);
    const trabajo = await this.versionTrabajo(id);
    if (!trabajo || trabajo.estado !== 'EN_REVISION') {
      throw new BadRequestException('No hay una versión en revisión para aprobar');
    }

    const meses = dto.mesesProximaRevision ?? 12;
    const ahora = new Date();
    const proxima = new Date(ahora);
    proxima.setMonth(proxima.getMonth() + meses);

    await this.prisma.$transaction([
      this.prisma.procesoVersion.updateMany({
        where: { procesoId: id, estado: 'APROBADA' },
        data: { estado: 'OBSOLETA' },
      }),
      this.prisma.procesoVersion.update({
        where: { id: trabajo.id },
        data: {
          estado: 'APROBADA',
          aprobadaPorId: actor.id,
          aprobadaAt: ahora,
          comentarioRevision: dto.comentario ?? trabajo.comentarioRevision,
        },
      }),
      this.prisma.proceso.update({
        where: { id },
        data: { estado: 'VIGENTE', ultimaAprobacionAt: ahora, proximaRevisionAt: proxima },
      }),
    ]);

    await this.bitacora.registrar({
      accion: 'proceso.aprobar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Proceso',
      entidadId: id,
      valorNuevo: { version: trabajo.numero, proximaRevisionAt: proxima.toISOString() },
    });
    return this.obtener(id, actor);
  }

  async archivar(id: string, archivar: boolean, actor: UsuarioActual) {
    const proceso = await this.exigeProceso(id);
    this.exigePermisoGlobalOModulo(actor, PERMISO.PROCESOS_ARCHIVAR);

    const tieneAprobada = await this.prisma.procesoVersion.count({
      where: { procesoId: id, estado: 'APROBADA' },
    });
    await this.prisma.proceso.update({
      where: { id },
      data: {
        estado: archivar ? 'ARCHIVADO' : tieneAprobada ? 'VIGENTE' : 'BORRADOR',
        archivadoAt: archivar ? new Date() : null,
      },
    });
    await this.bitacora.registrar({
      accion: archivar ? 'proceso.archivar' : 'proceso.desarchivar',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Proceso',
      entidadId: id,
      valorAnterior: { estado: proceso.estado },
    });
    return this.obtener(id, actor);
  }

  // ── Relaciones ──────────────────────────────────────────────────────────

  async agregarRelacion(id: string, dto: CrearRelacionDto, actor: UsuarioActual) {
    const proceso = await this.exigeProceso(id);
    await this.exigePermisoSobre(actor, PERMISO.PROCESOS_EDITAR, proceso);
    if (dto.destinoId === id) throw new BadRequestException('Un proceso no se relaciona consigo mismo');
    if (!(await this.prisma.proceso.findUnique({ where: { id: dto.destinoId } }))) {
      throw new NotFoundException('El proceso relacionado no existe');
    }
    try {
      await this.prisma.procesoRelacion.create({
        data: { origenId: id, destinoId: dto.destinoId, tipo: dto.tipo, descripcion: dto.descripcion },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Esa relación ya existe');
      }
      throw e;
    }
    await this.bitacora.registrar({
      accion: 'proceso.agregar_relacion',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Proceso',
      entidadId: id,
      valorNuevo: { destinoId: dto.destinoId, tipo: dto.tipo },
    });
    return this.obtener(id, actor);
  }

  async quitarRelacion(id: string, relacionId: string, actor: UsuarioActual) {
    const proceso = await this.exigeProceso(id);
    await this.exigePermisoSobre(actor, PERMISO.PROCESOS_EDITAR, proceso);
    const rel = await this.prisma.procesoRelacion.findFirst({
      where: { id: relacionId, origenId: id },
    });
    if (!rel) throw new NotFoundException('Relación no encontrada');
    await this.prisma.procesoRelacion.delete({ where: { id: relacionId } });
    await this.bitacora.registrar({
      accion: 'proceso.quitar_relacion',
      actorId: actor.id,
      actorEmail: actor.email,
      entidad: 'Proceso',
      entidadId: id,
    });
    return this.obtener(id, actor);
  }

  // ── Auxiliares ──────────────────────────────────────────────────────────

  private async exigeProceso(id: string) {
    const proceso = await this.prisma.proceso.findUnique({ where: { id } });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');
    return proceso;
  }

  private async versionTrabajo(procesoId: string) {
    return this.prisma.procesoVersion.findFirst({
      where: { procesoId, estado: { in: VERSION_TRABAJO } },
    });
  }

  private async exigePermisoSobre(
    actor: UsuarioActual,
    permiso: string,
    proceso: { id: string; areaId: string | null; responsableId: string | null; suplenteId: string | null },
  ) {
    if (!(await this.alcance.puedeSobreProceso(actor, permiso, proceso))) {
      throw new ForbiddenException('No tienes permiso sobre este proceso');
    }
  }

  private exigePermisoGlobalOModulo(actor: UsuarioActual, permiso: string) {
    if (actor.esSuperAdmin) return;
    if (!actor.permisos.includes(permiso)) {
      throw new ForbiddenException(`No tienes permiso para esta acción (${permiso})`);
    }
  }

  private async validarReferencias(dto: {
    areaId?: string | null;
    responsableId?: string | null;
    suplenteId?: string | null;
  }) {
    if (dto.areaId) {
      const u = await this.prisma.unidadOrganizativa.findUnique({ where: { id: dto.areaId } });
      if (!u) throw new NotFoundException('Área no encontrada');
    }
    for (const uid of [dto.responsableId, dto.suplenteId]) {
      if (uid) {
        const u = await this.prisma.usuario.findUnique({ where: { id: uid } });
        if (!u) throw new NotFoundException('Usuario (responsable/suplente) no encontrado');
      }
    }
  }
}
