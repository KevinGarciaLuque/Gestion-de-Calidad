import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoVersionDocumento, Prisma } from '@prisma/client';
import { AlcanceService } from '../auth/rbac/alcance.service';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import { ambitoDe, type UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import { AlmacenamientoService } from '../common/almacenamiento/almacenamiento.service';
import type {
  CrearDocumentoDto,
  EditarDocumentoDto,
  GuardarVersionDto,
  ListarDocumentosQuery,
  RevisionDocumentoDto,
} from './dto/documento.dto';

const TRABAJO: EstadoVersionDocumento[] = ['BORRADOR', 'EN_REVISION'];
const EN_MS = 86_400_000;

type DocFull = Prisma.DocumentoGetPayload<{
  include: {
    proceso: { select: { id: true; codigo: true; nombre: true; areaId: true; responsableId: true; suplenteId: true } };
    area: { select: { id: true; nombre: true } };
    propietario: { select: { id: true; nombre: true } };
    versiones: {
      include: {
        archivo: true;
        propuestaPor: { select: { id: true; nombre: true } };
        revisor: { select: { id: true; nombre: true } };
        aprobador: { select: { id: true; nombre: true } };
      };
    };
  };
}>;

const INCLUDE = {
  proceso: {
    select: { id: true, codigo: true, nombre: true, areaId: true, responsableId: true, suplenteId: true },
  },
  area: { select: { id: true, nombre: true } },
  propietario: { select: { id: true, nombre: true } },
  versiones: {
    orderBy: { numero: 'desc' },
    include: {
      archivo: true,
      propuestaPor: { select: { id: true, nombre: true } },
      revisor: { select: { id: true, nombre: true } },
      aprobador: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.DocumentoInclude;

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: AlcanceService,
    private readonly almacen: AlmacenamientoService,
    private readonly bitacora: BitacoraService,
  ) {}

  // ── Permisos sobre un documento ─────────────────────────────────────────

  private async puede(actor: UsuarioActual, permiso: string, doc: DocFull): Promise<boolean> {
    if (actor.esSuperAdmin) return true;
    if (doc.procesoId && doc.proceso) {
      return this.alcance.puedeSobreProceso(actor, permiso, doc.proceso);
    }
    // Documento institucional (sin proceso)
    if (permiso === PERMISO.DOCUMENTOS_VER) {
      if (doc.restringido) return doc.propietarioId === actor.id || ambitoDe(actor, permiso).global;
      return actor.permisos.includes(permiso);
    }
    if (permiso === PERMISO.DOCUMENTOS_EDITAR && doc.propietarioId === actor.id) return true;
    return ambitoDe(actor, permiso).global;
  }

  private async exige(id: string, actor: UsuarioActual, permiso: string): Promise<DocFull> {
    const doc = await this.prisma.documento.findUnique({ where: { id }, include: INCLUDE });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    if (!(await this.puede(actor, permiso, doc))) {
      throw new ForbiddenException('No tienes permiso sobre este documento');
    }
    return doc;
  }

  // ── Consultas ──────────────────────────────────────────────────────────

  async listar(q: ListarDocumentosQuery, actor: UsuarioActual): Promise<Paginado<unknown>> {
    const procesosIds = await this.alcance.procesosVisiblesIds(actor, PERMISO.DOCUMENTOS_VER);
    const and: Prisma.DocumentoWhereInput[] = [];

    if (procesosIds !== null) {
      and.push({
        OR: [
          { procesoId: { in: procesosIds } },
          { AND: [{ procesoId: null }, { restringido: false }] },
          { propietarioId: actor.id },
        ],
      });
    }
    if (q.tipo) and.push({ tipo: q.tipo });
    if (q.procesoId) and.push({ procesoId: q.procesoId });
    if (q.areaId) and.push({ areaId: q.areaId });
    if (q.q) {
      and.push({
        OR: [
          { nombre: { contains: q.q } },
          { codigo: { contains: q.q } },
          { palabrasClave: { contains: q.q } },
        ],
      });
    }
    if (q.estado === 'ARCHIVADO') and.push({ NOT: { archivadoAt: null } });
    else and.push({ archivadoAt: null });

    if (q.estado === 'VIGENTE') and.push({ versiones: { some: { estado: 'VIGENTE' } } });
    if (q.estado === 'SIN_VIGENTE') and.push({ versiones: { none: { estado: 'VIGENTE' } } });
    if (q.estado === 'BORRADOR') and.push({ versiones: { some: { estado: 'BORRADOR' } } });
    if (q.estado === 'EN_REVISION') and.push({ versiones: { some: { estado: 'EN_REVISION' } } });

    const where: Prisma.DocumentoWhereInput = { AND: and };

    const [filas, total] = await this.prisma.$transaction([
      this.prisma.documento.findMany({
        where, include: INCLUDE,
        orderBy: [{ tipo: 'asc' }, { codigo: 'asc' }],
        skip: q.skip, take: q.porPagina,
      }),
      this.prisma.documento.count({ where }),
    ]);

    let datos = filas.map((d) => this.resumen(d));
    if (q.soloConAlerta) datos = datos.filter((d) => Object.values(d.alerta).some(Boolean));
    return paginar(datos, total, q);
  }

  async listaMaestra(actor: UsuarioActual) {
    const procesosIds = await this.alcance.procesosVisiblesIds(actor, PERMISO.DOCUMENTOS_VER);
    const docs = await this.prisma.documento.findMany({
      where: {
        archivadoAt: null,
        versiones: { some: { estado: 'VIGENTE' } },
        ...(procesosIds !== null
          ? {
              OR: [
                { procesoId: { in: procesosIds } },
                { AND: [{ procesoId: null }, { restringido: false }] },
                { propietarioId: actor.id },
              ],
            }
          : {}),
      },
      include: INCLUDE,
      orderBy: [{ tipo: 'asc' }, { codigo: 'asc' }],
    });

    return docs.map((d) => {
      const v = d.versiones.find((x) => x.estado === 'VIGENTE')!;
      return {
        id: d.id,
        codigo: d.codigo,
        nombre: d.nombre,
        tipo: d.tipo,
        version: v.numero,
        proceso: d.proceso ? { id: d.proceso.id, codigo: d.proceso.codigo } : null,
        area: d.area,
        propietario: d.propietario,
        fechaVigenciaDesde: v.fechaVigenciaDesde,
        proximaRevisionAt: v.proximaRevisionAt,
        tieneArchivo: !!v.archivoId,
      };
    });
  }

  async obtener(id: string, actor: UsuarioActual) {
    const doc = await this.exige(id, actor, PERMISO.DOCUMENTOS_VER);
    const vigente = doc.versiones.find((v) => v.estado === 'VIGENTE') ?? null;
    const trabajo = doc.versiones.find((v) => TRABAJO.includes(v.estado)) ?? null;

    return {
      documento: {
        id: doc.id,
        codigo: doc.codigo,
        nombre: doc.nombre,
        tipo: doc.tipo,
        proceso: doc.proceso ? { id: doc.proceso.id, codigo: doc.proceso.codigo, nombre: doc.proceso.nombre } : null,
        area: doc.area,
        propietario: doc.propietario,
        restringido: doc.restringido,
        palabrasClave: doc.palabrasClave,
        archivado: !!doc.archivadoAt,
        alerta: this.alerta(doc),
      },
      versionVigente: vigente ? this.version(vigente) : null,
      versionTrabajo: trabajo ? this.version(trabajo) : null,
      historial: doc.versiones.map((v) => this.version(v)),
      puede: {
        editar: await this.puede(actor, PERMISO.DOCUMENTOS_EDITAR, doc),
        revisar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.DOCUMENTOS_REVISAR),
        aprobar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.DOCUMENTOS_APROBAR),
        archivar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.DOCUMENTOS_ARCHIVAR),
      },
    };
  }

  // ── Alta y edición ─────────────────────────────────────────────────────

  async crear(dto: CrearDocumentoDto, actor: UsuarioActual) {
    if (await this.prisma.documento.findUnique({ where: { codigo: dto.codigo } })) {
      throw new ConflictException('Ya existe un documento con ese código');
    }
    if (dto.procesoId) {
      const proceso = await this.prisma.proceso.findUnique({ where: { id: dto.procesoId } });
      if (!proceso) throw new NotFoundException('Proceso no encontrado');
      if (!(await this.alcance.puedeSobreProceso(actor, PERMISO.DOCUMENTOS_CREAR, proceso))) {
        throw new ForbiddenException('No puedes crear documentos en este proceso');
      }
    } else if (!actor.esSuperAdmin && !ambitoDe(actor, PERMISO.DOCUMENTOS_CREAR).global) {
      throw new ForbiddenException('Necesitas permiso global para crear documentos institucionales');
    }
    await this.validarRefs(dto);

    const doc = await this.prisma.documento.create({
      data: {
        codigo: dto.codigo.toUpperCase(),
        nombre: dto.nombre.trim(),
        tipo: dto.tipo,
        procesoId: dto.procesoId ?? null,
        areaId: dto.areaId ?? null,
        propietarioId: dto.propietarioId ?? actor.id,
        palabrasClave: dto.palabrasClave?.trim() ?? null,
        versiones: { create: { numero: 1, estado: 'BORRADOR', propuestaPorId: actor.id } },
      },
    });
    await this.bitacora.registrar({
      accion: 'documento.crear',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Documento', entidadId: doc.id,
      valorNuevo: { codigo: doc.codigo, nombre: doc.nombre, tipo: doc.tipo },
    });
    return this.obtener(doc.id, actor);
  }

  async editar(id: string, dto: EditarDocumentoDto, actor: UsuarioActual) {
    const doc = await this.exige(id, actor, PERMISO.DOCUMENTOS_EDITAR);
    await this.validarRefs(dto);
    await this.prisma.documento.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        tipo: dto.tipo,
        procesoId: dto.procesoId === undefined ? undefined : dto.procesoId,
        areaId: dto.areaId === undefined ? undefined : dto.areaId,
        propietarioId: dto.propietarioId === undefined ? undefined : dto.propietarioId,
        restringido: dto.restringido,
        palabrasClave: dto.palabrasClave === undefined ? undefined : dto.palabrasClave,
      },
    });
    await this.bitacora.registrar({
      accion: 'documento.editar',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Documento', entidadId: id,
      valorAnterior: { nombre: doc.nombre, tipo: doc.tipo },
      valorNuevo: dto as Prisma.InputJsonValue,
    });
    return this.obtener(id, actor);
  }

  async archivar(id: string, arch: boolean, actor: UsuarioActual) {
    const doc = await this.prisma.documento.findUnique({ where: { id }, include: INCLUDE });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.DOCUMENTOS_ARCHIVAR)) {
      throw new ForbiddenException('No tienes permiso para archivar documentos');
    }
    await this.prisma.documento.update({ where: { id }, data: { archivadoAt: arch ? new Date() : null } });
    await this.bitacora.registrar({
      accion: arch ? 'documento.archivar' : 'documento.desarchivar',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Documento', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  // ── Versiones ──────────────────────────────────────────────────────────

  private async versionTrabajo(documentoId: string) {
    return this.prisma.documentoVersion.findFirst({
      where: { documentoId, estado: { in: TRABAJO } },
    });
  }

  async guardarVersion(id: string, dto: GuardarVersionDto, actor: UsuarioActual) {
    const doc = await this.exige(id, actor, PERMISO.DOCUMENTOS_EDITAR);
    if (dto.revisorId) await this.usuarioExiste(dto.revisorId);
    if (dto.aprobadorId) await this.usuarioExiste(dto.aprobadorId);

    const versiones = await this.prisma.documentoVersion.findMany({
      where: { documentoId: id }, orderBy: { numero: 'desc' },
    });
    let trabajo = versiones.find((v) => TRABAJO.includes(v.estado));
    if (trabajo?.estado === 'EN_REVISION') {
      throw new BadRequestException('La versión está en revisión; primero apruébala o devuélvela');
    }

    const proxima = dto.mesesProximaRevision
      ? (() => {
          const base = dto.fechaEmision ? new Date(dto.fechaEmision) : new Date();
          base.setMonth(base.getMonth() + dto.mesesProximaRevision);
          return base;
        })()
      : undefined;

    const data = {
      motivoCambio: dto.motivoCambio?.trim() ?? null,
      fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : null,
      proximaRevisionAt: proxima ?? null,
      revisorId: dto.revisorId ?? null,
      aprobadorId: dto.aprobadorId ?? null,
    };

    if (trabajo) {
      trabajo = await this.prisma.documentoVersion.update({ where: { id: trabajo.id }, data });
    } else {
      const numero = (versiones[0]?.numero ?? 0) + 1;
      const vigente = versiones.find((v) => v.estado === 'VIGENTE');
      trabajo = await this.prisma.documentoVersion.create({
        data: {
          documentoId: id,
          numero,
          estado: 'BORRADOR',
          propuestaPorId: actor.id,
          archivoId: vigente?.archivoId ?? null,
          ...data,
        },
      });
    }

    await this.bitacora.registrar({
      accion: 'documento.guardar_version',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'DocumentoVersion', entidadId: trabajo.id,
      valorNuevo: { documentoId: id, version: trabajo.numero },
    });
    void doc;
    return this.obtener(id, actor);
  }

  async subirArchivo(
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    actor: UsuarioActual,
  ) {
    await this.exige(id, actor, PERMISO.DOCUMENTOS_EDITAR);
    let trabajo = await this.versionTrabajo(id);
    if (!trabajo) {
      // Crear un borrador nuevo a partir de la vigente
      await this.guardarVersion(id, {}, actor);
      trabajo = await this.versionTrabajo(id);
    }
    if (!trabajo || trabajo.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se puede reemplazar el archivo de un borrador');
    }

    const guardado = await this.almacen.guardar(file.buffer, file.originalname, file.mimetype);
    const archivo = await this.prisma.archivoDocumento.create({
      data: {
        nombreOriginal: file.originalname,
        rutaRelativa: guardado.rutaRelativa,
        mimeType: file.mimetype,
        tamanoBytes: guardado.tamanoBytes,
        hashSha256: guardado.hashSha256,
        subidoPorId: actor.id,
      },
    });
    await this.prisma.documentoVersion.update({ where: { id: trabajo.id }, data: { archivoId: archivo.id } });

    await this.bitacora.registrar({
      accion: 'documento.subir_archivo',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'DocumentoVersion', entidadId: trabajo.id,
      valorNuevo: { archivo: file.originalname, hash: guardado.hashSha256 },
    });
    return this.obtener(id, actor);
  }

  async enviarRevision(id: string, actor: UsuarioActual) {
    const doc = await this.exige(id, actor, PERMISO.DOCUMENTOS_EDITAR);
    const trabajo = await this.versionTrabajo(id);
    if (!trabajo || trabajo.estado !== 'BORRADOR') {
      throw new BadRequestException('No hay un borrador para enviar a revisión');
    }
    if (!trabajo.archivoId) {
      throw new BadRequestException('Sube el archivo del documento antes de enviarlo a revisión');
    }
    await this.prisma.documentoVersion.update({
      where: { id: trabajo.id },
      data: { estado: 'EN_REVISION', enviadaRevisionAt: new Date(), comentarioRevision: null },
    });
    await this.bitacora.registrar({
      accion: 'documento.enviar_revision',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Documento', entidadId: id,
    });
    void doc;
    return this.obtener(id, actor);
  }

  async devolver(id: string, dto: RevisionDocumentoDto, actor: UsuarioActual) {
    await this.exigeModulo(actor, PERMISO.DOCUMENTOS_REVISAR);
    await this.prisma.documento.findUnique({ where: { id } });
    const trabajo = await this.versionTrabajo(id);
    if (!trabajo || trabajo.estado !== 'EN_REVISION') {
      throw new BadRequestException('No hay una versión en revisión');
    }
    await this.prisma.documentoVersion.update({
      where: { id: trabajo.id },
      data: {
        estado: 'BORRADOR',
        revisorId: actor.id,
        comentarioRevision: dto.comentario ?? null,
        enviadaRevisionAt: null,
      },
    });
    await this.bitacora.registrar({
      accion: 'documento.devolver',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Documento', entidadId: id,
      valorNuevo: { comentario: dto.comentario ?? null },
    });
    return this.obtener(id, actor);
  }

  async aprobar(id: string, dto: RevisionDocumentoDto, actor: UsuarioActual) {
    await this.exigeModulo(actor, PERMISO.DOCUMENTOS_APROBAR);
    const doc = await this.prisma.documento.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    const trabajo = await this.versionTrabajo(id);
    if (!trabajo || trabajo.estado !== 'EN_REVISION') {
      throw new BadRequestException('No hay una versión en revisión para aprobar');
    }

    const ahora = new Date();
    let proxima = trabajo.proximaRevisionAt;
    if (!proxima) {
      proxima = new Date(ahora);
      proxima.setMonth(proxima.getMonth() + 12);
    }

    await this.prisma.$transaction([
      this.prisma.documentoVersion.updateMany({
        where: { documentoId: id, estado: 'VIGENTE' },
        data: { estado: 'OBSOLETA' },
      }),
      this.prisma.documentoVersion.update({
        where: { id: trabajo.id },
        data: {
          estado: 'VIGENTE',
          aprobadorId: actor.id,
          aprobadaAt: ahora,
          fechaEmision: trabajo.fechaEmision ?? ahora,
          fechaVigenciaDesde: ahora,
          proximaRevisionAt: proxima,
          comentarioRevision: dto.comentario ?? trabajo.comentarioRevision,
        },
      }),
    ]);
    await this.bitacora.registrar({
      accion: 'documento.aprobar',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Documento', entidadId: id,
      valorNuevo: { version: trabajo.numero, proximaRevisionAt: proxima.toISOString() },
    });
    return this.obtener(id, actor);
  }

  async archivoParaDescarga(id: string, versionId: string, actor: UsuarioActual) {
    const doc = await this.exige(id, actor, PERMISO.DOCUMENTOS_VER);
    const version = doc.versiones.find((v) => v.id === versionId);
    if (!version || !version.archivo) throw new NotFoundException('Versión o archivo no encontrado');
    return {
      stream: await this.almacen.streamDe(version.archivo.rutaRelativa),
      nombre: version.archivo.nombreOriginal,
      mimeType: version.archivo.mimeType,
      tamano: version.archivo.tamanoBytes,
    };
  }

  // ── Auxiliares ─────────────────────────────────────────────────────────

  private async exigeModulo(actor: UsuarioActual, permiso: string) {
    if (!actor.esSuperAdmin && !actor.permisos.includes(permiso)) {
      throw new ForbiddenException(`No tienes permiso para esta acción (${permiso})`);
    }
  }

  private async usuarioExiste(uid: string) {
    if (!(await this.prisma.usuario.findUnique({ where: { id: uid } }))) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  private async validarRefs(dto: { procesoId?: string | null; areaId?: string | null; propietarioId?: string | null }) {
    if (dto.procesoId) {
      if (!(await this.prisma.proceso.findUnique({ where: { id: dto.procesoId } })))
        throw new NotFoundException('Proceso no encontrado');
    }
    if (dto.areaId) {
      if (!(await this.prisma.unidadOrganizativa.findUnique({ where: { id: dto.areaId } })))
        throw new NotFoundException('Área no encontrada');
    }
    if (dto.propietarioId) await this.usuarioExiste(dto.propietarioId);
  }

  private alerta(doc: DocFull) {
    const vig = doc.versiones.find((v) => v.estado === 'VIGENTE');
    const trabajo = doc.versiones.find((v) => TRABAJO.includes(v.estado));
    const hoy = Date.now();
    const rev = vig?.proximaRevisionAt?.getTime();
    return {
      sinVigente: !vig && !doc.archivadoAt,
      revisionVencida: !!rev && rev < hoy,
      revisionProxima: !!rev && rev >= hoy && rev < hoy + 30 * EN_MS,
      enRevision: trabajo?.estado === 'EN_REVISION',
      sinArchivo: !!vig && !vig.archivoId,
    };
  }

  private resumen(doc: DocFull) {
    const vig = doc.versiones.find((v) => v.estado === 'VIGENTE');
    const trabajo = doc.versiones.find((v) => TRABAJO.includes(v.estado));
    return {
      id: doc.id,
      codigo: doc.codigo,
      nombre: doc.nombre,
      tipo: doc.tipo,
      proceso: doc.proceso ? { id: doc.proceso.id, codigo: doc.proceso.codigo } : null,
      area: doc.area,
      propietario: doc.propietario,
      restringido: doc.restringido,
      archivado: !!doc.archivadoAt,
      versionVigente: vig?.numero ?? null,
      fechaVigenciaDesde: vig?.fechaVigenciaDesde ?? null,
      proximaRevisionAt: vig?.proximaRevisionAt ?? null,
      estadoTrabajo: trabajo?.estado ?? null,
      alerta: this.alerta(doc),
    };
  }

  private version(v: DocFull['versiones'][number]) {
    return {
      id: v.id,
      numero: v.numero,
      estado: v.estado,
      motivoCambio: v.motivoCambio,
      fechaEmision: v.fechaEmision,
      fechaVigenciaDesde: v.fechaVigenciaDesde,
      proximaRevisionAt: v.proximaRevisionAt,
      enviadaRevisionAt: v.enviadaRevisionAt,
      aprobadaAt: v.aprobadaAt,
      comentarioRevision: v.comentarioRevision,
      propuestaPor: v.propuestaPor,
      revisor: v.revisor,
      aprobador: v.aprobador,
      archivo: v.archivo
        ? {
            id: v.archivo.id,
            nombreOriginal: v.archivo.nombreOriginal,
            mimeType: v.archivo.mimeType,
            tamanoBytes: v.archivo.tamanoBytes,
            hashSha256: v.archivo.hashSha256,
            subidoAt: v.archivo.subidoAt,
          }
        : null,
      creadoAt: v.creadoAt,
    };
  }
}
