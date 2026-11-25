import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type EstadoMCC, type TipoRegistroMCC } from '@prisma/client';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CamposControlDto,
  CerrarMCCDto,
  ComentarMCCDto,
  CrearMCCDto,
  DecidirMCCDto,
  EdicionRapidaMCCDto,
  EditarMCCDto,
  EscalarMCCDto,
  FiltrosControlQuery,
  ListarControlQuery,
  ListarMCCQuery,
} from './dto/mcc.dto';
import {
  acypDe,
  calcularTablero,
  esCritico,
  estadoDesdeEstatus,
  estatusDe,
  plazoDe,
  porcentajeCumplimiento,
  type EstatusControl,
  type FilaControl,
} from './mcc-control';
import { interpretarFila, mapearEncabezados, normalizar, parseCsv, type RegistroImportado } from './mcc-import';

const INCLUDE = {
  area: { select: { id: true, nombre: true } },
  propuestoPor: { select: { id: true, nombre: true } },
  gestionadoPor: { select: { id: true, nombre: true } },
  eventos: { orderBy: { fecha: 'asc' } },
  acciones: {
    select: { id: true, codigo: true, descripcion: true, estado: true, avance: true, responsable: { select: { nombre: true } } },
  },
  hallazgo: { select: { id: true, codigo: true, estado: true, clasificacion: true } },
} satisfies Prisma.RegistroMCCInclude;

/** Tipos que pueden escalarse a hallazgo formal (las felicitaciones y sugerencias no). */
const TIPOS_ESCALABLES: TipoRegistroMCC[] = ['NO_CONFORMIDAD', 'SALIDA_NO_CONFORME', 'ENTRADA_NO_CONFORME', 'QUEJA', 'OTRO'];

type MCCFull = Prisma.RegistroMCCGetPayload<{ include: typeof INCLUDE }>;

/** Lo mínimo para calcular el tablero y la tabla de control. */
const SELECT_CONTROL = {
  id: true,
  codigo: true,
  codigoTipo: true,
  titulo: true,
  descripcion: true,
  tipoRegistro: true,
  estado: true,
  fechaRecepcion: true,
  creadoAt: true,
  macroproceso: true,
  areaResponsable: true,
  area: { select: { id: true, nombre: true } },
  impacto: true,
  prioridad: true,
  requiereAcyp: true,
  acypCodigo: true,
  compromisosAdquiridos: true,
  compromisosCumplidos: true,
  fechaLimite: true,
  fechaCierre: true,
  costoCalidad: true,
  responsableNombre: true,
  notaEvidencia: true,
  acciones: { select: { estado: true } },
  hallazgo: { select: { id: true, codigo: true, estado: true } },
} satisfies Prisma.RegistroMCCSelect;

type FilaBD = Prisma.RegistroMCCGetPayload<{ select: typeof SELECT_CONTROL }>;

const PREFIJO_TIPO: Partial<Record<TipoRegistroMCC, string>> = {
  NO_CONFORMIDAD: 'NC',
  SALIDA_NO_CONFORME: 'SNC',
  ENTRADA_NO_CONFORME: 'ENC',
  SUGERENCIA: 'SUG',
  FELICITACION: 'FEL',
};

const ACCION_TERMINADA = ['COMPLETADA', 'VERIFICADA'];

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

/** Mismos textos que usa la hoja original (y que reconoce el importador). */
const ETIQUETA_TIPO_REG: Record<TipoRegistroMCC, string> = {
  NO_CONFORMIDAD: 'NO CONFORMIDAD',
  SALIDA_NO_CONFORME: 'SALIDA NO CONFORME',
  ENTRADA_NO_CONFORME: 'ENTRADA NO CONFORME',
  QUEJA: 'QUEJA',
  FELICITACION: 'FELICITACIÓN',
  SUGERENCIA: 'SUGERENCIA',
  OTRO: 'OTRO',
};
const ETIQUETA_ESTATUS_EXP: Record<EstatusControl, string> = {
  ABIERTO: 'ABIERTO',
  EN_SEGUIMIENTO: 'EN SEGUIMIENTO',
  CERRADO: 'CERRADO',
  DESESTIMADO: 'DESESTIMADO',
  SIN_ESTADO: '',
};

/** Encabezados idénticos a los de la hoja del Control MCC: el archivo exportado se puede volver a importar. */
export const COLUMNAS_EXPORTACION = [
  { key: 'codigo', label: 'ID' },
  { key: 'tipo', label: 'Tipo de Registro' },
  { key: 'codigoTipo', label: 'Código' },
  { key: 'gestorCalidad', label: 'Gestor de Calidad' },
  { key: 'fechaRecepcion', label: 'Fecha y Hora de Recepción' },
  { key: 'mes', label: 'Mes' },
  { key: 'usuarioEncuentra', label: 'Usuario que Encuentra' },
  { key: 'areaReporta', label: 'Área que Reporta' },
  { key: 'fuente', label: 'Fuente' },
  { key: 'fuenteSecundaria', label: 'Fuente Secundaria' },
  { key: 'numeroExpediente', label: 'N° Expediente' },
  { key: 'turno', label: 'Turno' },
  { key: 'problema', label: '¿Cuál es el Problema Principal?' },
  { key: 'descripcion', label: 'Descripción del Hallazgo' },
  { key: 'macroproceso', label: 'Macroproceso / Parte Interesada' },
  { key: 'areaResponsable', label: 'Área o Servicio Responsable' },
  { key: 'procesoAfectado', label: 'Proceso Afectado' },
  { key: 'subproceso', label: 'Subproceso' },
  { key: 'procedimiento', label: 'Procedimiento' },
  { key: 'subrogado', label: 'Subrogado' },
  { key: 'impacto', label: 'Impacto' },
  { key: 'dondeImpacto', label: '¿Dónde Impactó?' },
  { key: 'causaRaiz', label: 'Causa-Raíz' },
  { key: 'porque1', label: '¿Por qué #1?' },
  { key: 'porque2', label: '¿Por qué #2?' },
  { key: 'porque3', label: '¿Por qué #3?' },
  { key: 'porque4', label: '¿Por qué #4?' },
  { key: 'porque5', label: '¿Por qué #5?' },
  { key: 'requiereAcyp', label: '¿Requiere ACyP?' },
  { key: 'acypCodigo', label: 'ID ACyP' },
  { key: 'compAdq', label: 'Comp. Adq.' },
  { key: 'compCump', label: 'Comp. Cump.' },
  { key: 'pctCump', label: '% Cump.' },
  { key: 'escalamiento', label: 'Escalamiento' },
  { key: 'costos', label: '¿Costos?' },
  { key: 'costo', label: 'Costo (L)' },
  { key: 'phva', label: 'PHVA' },
  { key: 'logros', label: 'Logros Obtenidos' },
  { key: 'leanDefecto', label: 'LEAN · Defecto' },
  { key: 'leanRetrabajo', label: 'LEAN · Retrabajo' },
  { key: 'leanEspera', label: 'LEAN · Espera' },
  { key: 'leanMovimiento', label: 'LEAN · Movimiento' },
  { key: 'responsable', label: 'Responsable' },
  { key: 'fechaNotificacion', label: 'Fecha Notificación' },
  { key: 'fechaCompRespuesta', label: 'Fecha Comp. Respuesta' },
  { key: 'fechaLimite', label: 'Fecha Límite / Cierre Máx.' },
  { key: 'fechaCierre', label: 'Fecha Cierre Real' },
  { key: 'estatus', label: 'Estatus de Cierre' },
  { key: 'indicador', label: 'Indicador de Criterio' },
  { key: 'validacion', label: 'Validación Calidad' },
  { key: 'notaEvidencia', label: 'Nota de Evidencia' },
  { key: 'hallazgo', label: 'Hallazgo formal' },
] as const;

/** "2026-11-01" (o ISO completo) → medianoche local de ese día; evita el corrimiento de UTC. */
function fechaLocal(s: string): Date {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
}

/** dd/mm/aaaa [hh:mm] en hora local. */
function formatoFecha(d: Date, hora = false): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const base = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  return hora && (d.getHours() || d.getMinutes()) ? `${base} ${p(d.getHours())}:${p(d.getMinutes())}` : base;
}

@Injectable()
export class MccService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  private gestiona(actor: UsuarioActual) {
    return actor.esSuperAdmin || actor.permisos.includes(PERMISO.MCC_GESTIONAR);
  }

  /** Los colaboradores solo ven los suyos + los que ya están en ejecución/cerrados (transparencia). */
  private visibilidad(actor: UsuarioActual): Prisma.RegistroMCCWhereInput | null {
    if (this.gestiona(actor)) return null;
    return { OR: [{ propuestoPorId: actor.id }, { estado: { in: ['EN_EJECUCION', 'VERIFICACION', 'CERRADO'] } }] };
  }

  async listar(q: ListarMCCQuery, actor: UsuarioActual): Promise<Paginado<unknown>> {
    const and: Prisma.RegistroMCCWhereInput[] = [];
    const vis = this.visibilidad(actor);
    if (vis) and.push(vis);
    if (q.origen) and.push({ origen: q.origen });
    if (q.estado) and.push({ estado: q.estado as never });
    if (q.mios) and.push({ propuestoPorId: actor.id });
    if (q.q) and.push({ OR: [{ titulo: { contains: q.q } }, { codigo: { contains: q.q } }, { codigoTipo: { contains: q.q } }] });

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
    const gestiona = this.gestiona(actor);
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
        escalar:
          gestiona &&
          (actor.esSuperAdmin || actor.permisos.includes(PERMISO.HALLAZGOS_CREAR)) &&
          !m.hallazgo &&
          !!m.tipoRegistro && TIPOS_ESCALABLES.includes(m.tipoRegistro) &&
          !['CERRADO', 'NO_PROCEDE'].includes(m.estado),
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

    const control = this.datosControl(dto);
    const estado: EstadoMCC = dto.estatus && this.gestiona(actor) ? estadoDesdeEstatus(dto.estatus) : 'NUEVO';
    const codigoTipo = dto.codigoTipo?.trim()
      ? dto.codigoTipo.trim().toUpperCase()
      : dto.tipoRegistro ? await this.siguienteCodigoTipo(dto.tipoRegistro, anio) : null;
    const areaId = dto.areaId ?? (dto.areaResponsable ? await this.buscarAreaId(dto.areaResponsable) : null);

    const m = await this.prisma.registroMCC.create({
      data: {
        ...control,
        codigo,
        codigoTipo,
        titulo: dto.titulo.trim(),
        descripcion: dto.descripcion.trim(),
        origen: dto.origen,
        origenDetalle: dto.origenDetalle?.trim() ?? null,
        areaId,
        propuestoPorId: actor.id,
        estado,
        fechaRecepcion: control.fechaRecepcion ?? new Date(),
        fechaCierre: control.fechaCierre ?? (estado === 'CERRADO' || estado === 'NO_PROCEDE' ? new Date() : null),
        eventos: { create: { tipo: 'creado', detalle: 'Registro creado', estadoNuevo: estado, actorNombre: actor.nombre } },
      },
    });
    await this.bitacora.registrar({
      accion: 'mcc.crear', actorId: actor.id, actorEmail: actor.email,
      entidad: 'RegistroMCC', entidadId: m.id, valorNuevo: { codigo, codigoTipo, titulo: dto.titulo },
    });
    await this.alertarNuevo(m.id, codigoTipo ?? codigo, dto, actor);
    return this.obtener(m.id, actor);
  }

  async editar(id: string, dto: EditarMCCDto, actor: UsuarioActual) {
    const m = await this.exige(id);
    const gestiona = this.gestiona(actor);
    const puede = gestiona || (m.propuestoPorId === actor.id && m.estado === 'NUEVO');
    if (!puede) throw new ForbiddenException('No puedes editar este registro');
    if (gestiona && estatusDe(m.estado) !== dto.estatus) this.validarCierreEscalado(m, dto.estatus); // antes de guardar nada
    const control = this.datosControl(dto);
    if (dto.areaResponsable && dto.areaId === undefined) {
      const areaId = await this.buscarAreaId(dto.areaResponsable);
      if (areaId) control.areaId = areaId;
    }
    await this.prisma.registroMCC.update({
      where: { id },
      data: {
        ...control,
        titulo: dto.titulo?.trim(),
        descripcion: dto.descripcion?.trim(),
        ...(dto.areaId === undefined ? {} : { areaId: dto.areaId }),
        ...(dto.codigoTipo === undefined ? {} : { codigoTipo: dto.codigoTipo?.trim().toUpperCase() || null }),
      },
    });
    if (dto.estatus && gestiona) await this.aplicarEstatus(m, dto.estatus, dto.fechaCierre, actor);
    await this.bitacora.registrar({
      accion: 'mcc.editar', actorId: actor.id, actorEmail: actor.email, entidad: 'RegistroMCC', entidadId: id,
      valorNuevo: dto as unknown as Prisma.InputJsonValue,
    });
    return this.obtener(id, actor);
  }

  // ── Control MCC: tablero, tabla editable e importación ──────────────────

  async tablero(q: FiltrosControlQuery, actor: UsuarioActual) {
    const filas = await this.filasControl(q, actor);
    const hoy = new Date();
    const ultima = await this.prisma.registroMCC.aggregate({ _max: { actualizadoAt: true } });
    return {
      generadoAt: hoy,
      ultimaActualizacion: ultima._max.actualizadoAt,
      ...calcularTablero(filas.map((f) => this.aFilaControl(f)), hoy),
    };
  }

  async listarControl(q: ListarControlQuery, actor: UsuarioActual) {
    const hoy = new Date();
    let filas = (await this.filasControl(q, actor)).map((f) => {
      const fc = this.aFilaControl(f);
      const estatus = estatusDe(f.estado);
      return {
        id: f.id,
        codigo: f.codigo,
        codigoTipo: f.codigoTipo,
        tipoRegistro: f.tipoRegistro,
        titulo: f.titulo,
        descripcion: f.descripcion.slice(0, 300),
        estatus,
        estado: f.estado,
        fechaRecepcion: f.fechaRecepcion ?? f.creadoAt,
        macroproceso: f.macroproceso,
        areaResponsable: f.area?.nombre ?? f.areaResponsable,
        responsableNombre: f.responsableNombre,
        fechaLimite: f.fechaLimite,
        fechaCierre: f.fechaCierre,
        acypCodigo: f.acypCodigo,
        acyp: acypDe(fc, hoy),
        cumplimiento: porcentajeCumplimiento(fc),
        plazo: plazoDe(estatus, f.fechaLimite, hoy),
        tieneEvidencia: !!f.notaEvidencia,
        critico: esCritico(fc),
        hallazgo: f.hallazgo,
      };
    });
    if (q.estatus) filas = filas.filter((f) => f.estatus === q.estatus);
    if (q.situacion === 'SIN_ACYP') filas = filas.filter((f) => !f.acyp);
    else if (q.situacion === 'VENCIDO' || q.situacion === 'POR_VENCER') filas = filas.filter((f) => f.plazo.situacion === q.situacion);
    else if (q.situacion) filas = filas.filter((f) => f.acyp === q.situacion);
    if (q.q) {
      const t = normalizar(q.q);
      filas = filas.filter((f) =>
        [f.codigo, f.codigoTipo, f.titulo, f.descripcion, f.areaResponsable, f.responsableNombre, f.acypCodigo]
          .some((v) => v && normalizar(v).includes(t)),
      );
    }
    const total = filas.length;
    const inicio = (q.pagina - 1) * q.porPagina;
    return { datos: filas.slice(inicio, inicio + q.porPagina), total, pagina: q.pagina, porPagina: q.porPagina };
  }

  /** Valores ya usados (para los desplegables y autocompletar del formulario y los filtros). */
  async catalogos() {
    const distintos = async (campo: 'macroproceso' | 'areaResponsable' | 'fuente' | 'fuenteSecundaria' | 'responsableNombre' | 'gestorCalidad' | 'impacto' | 'dondeImpacto' | 'escalamiento' | 'areaReporta') => {
      const filas = await this.prisma.registroMCC.findMany({
        where: { [campo]: { not: null } }, select: { [campo]: true }, distinct: [campo], orderBy: { [campo]: 'asc' }, take: 500,
      });
      return filas.map((f) => (f as unknown as Record<string, string>)[campo]).filter(Boolean);
    };
    const unidades = await this.prisma.unidadOrganizativa.findMany({ where: { activo: true }, select: { nombre: true }, orderBy: { nombre: 'asc' } });
    const areas = await distintos('areaResponsable');
    return {
      macroprocesos: await distintos('macroproceso'),
      areas: [...new Set([...areas, ...unidades.map((u) => u.nombre.toUpperCase())])].sort((a, b) => a.localeCompare(b, 'es')),
      fuentes: await distintos('fuente'),
      fuentesSecundarias: await distintos('fuenteSecundaria'),
      responsables: await distintos('responsableNombre'),
      gestores: await distintos('gestorCalidad'),
      impactos: await distintos('impacto'),
      dondeImpacto: await distintos('dondeImpacto'),
      escalamientos: await distintos('escalamiento'),
      areasReporta: await distintos('areaReporta'),
    };
  }

  async edicionRapida(id: string, dto: EdicionRapidaMCCDto, actor: UsuarioActual) {
    const m = await this.exigeGestion(id, actor);
    if (estatusDe(m.estado) !== dto.estatus) this.validarCierreEscalado(m, dto.estatus); // antes de guardar nada
    const fecha = (v: string | null | undefined) => (v === undefined ? undefined : v ? new Date(v) : null);
    const data: Prisma.RegistroMCCUncheckedUpdateInput = {
      fechaRecepcion: fecha(dto.fechaRecepcion),
      fechaLimite: fecha(dto.fechaLimite),
      fechaCierre: fecha(dto.fechaCierre),
      macroproceso: dto.macroproceso === undefined ? undefined : dto.macroproceso?.trim().toUpperCase() || null,
      responsableNombre: dto.responsableNombre === undefined ? undefined : dto.responsableNombre?.trim() || null,
    };
    if (dto.areaResponsable !== undefined) {
      data.areaResponsable = dto.areaResponsable?.trim().toUpperCase() || null;
      data.areaId = dto.areaResponsable ? await this.buscarAreaId(dto.areaResponsable) : null;
    }
    await this.prisma.registroMCC.update({ where: { id }, data });
    if (dto.estatus) await this.aplicarEstatus(m, dto.estatus, dto.fechaCierre, actor);
    await this.bitacora.registrar({
      accion: 'mcc.edicion_rapida', actorId: actor.id, actorEmail: actor.email, entidad: 'RegistroMCC', entidadId: id,
      valorNuevo: dto as unknown as Prisma.InputJsonValue,
    });
    return { ok: true };
  }

  async importar(buffer: Buffer, simular: boolean, actor: UsuarioActual) {
    if (!this.gestiona(actor)) throw new ForbiddenException('Solo Calidad puede importar el histórico');
    const texto = buffer.toString('utf8');
    const filas = parseCsv(texto);
    if (filas.length < 2) throw new BadRequestException('El archivo no tiene filas de datos');
    const { indice, reconocidas, ignoradas } = mapearEncabezados(filas[0]);
    if (!indice.has('descripcion') && !indice.has('problemaPrincipal')) {
      throw new BadRequestException(
        'No se encontró la columna "Descripción del Hallazgo" ni "¿Cuál es el Problema Principal?". Revisa que la primera fila tenga los encabezados.',
      );
    }

    const validos: RegistroImportado[] = [];
    const errores: { fila: number; mensaje: string }[] = [];
    const advertencias: { fila: number; mensaje: string }[] = [];
    filas.slice(1).forEach((celdas, i) => {
      const r = interpretarFila(celdas, indice, i + 2);
      if ('error' in r) errores.push({ fila: r.fila, mensaje: r.error });
      else {
        validos.push(r);
        r.advertencias.forEach((a) => advertencias.push({ fila: r.fila, mensaje: a }));
      }
    });

    // Códigos repetidos dentro del mismo archivo: se queda la última fila.
    const porCodigo = new Map<string, RegistroImportado>();
    const sinCodigo: RegistroImportado[] = [];
    for (const r of validos) {
      if (!r.codigo) sinCodigo.push(r);
      else {
        if (porCodigo.has(r.codigo)) advertencias.push({ fila: r.fila, mensaje: `El código ${r.codigo} se repite; se usa esta fila` });
        porCodigo.set(r.codigo, r);
      }
    }
    const encontrados = await this.prisma.registroMCC.findMany({
      where: { codigo: { in: [...porCodigo.keys()] } },
      select: { codigo: true, hallazgo: { select: { codigo: true, estado: true } } },
    });
    const existentes = new Set(encontrados.map((e) => e.codigo));
    // Los escalados con hallazgo abierto conservan su estatus: lo manda la verificación de eficacia.
    const escaladosAbiertos = new Map(
      encontrados.filter((e) => e.hallazgo && e.hallazgo.estado !== 'CERRADO').map((e) => [e.codigo, e.hallazgo!.codigo]),
    );
    for (const [codigo, hallazgo] of escaladosAbiertos) {
      const r = porCodigo.get(codigo)!;
      advertencias.push({ fila: r.fila, mensaje: `${codigo} está escalado al hallazgo ${hallazgo} (abierto): se actualizan sus datos pero no su estatus` });
    }
    const nuevos = [...porCodigo.values()].filter((r) => !existentes.has(r.codigo!)).length + sinCodigo.length;
    const actualizados = [...porCodigo.keys()].filter((c) => existentes.has(c)).length;

    const resumen = {
      simulacion: simular,
      filasLeidas: filas.length - 1,
      validas: porCodigo.size + sinCodigo.length,
      nuevos,
      actualizados,
      errores,
      advertencias: advertencias.slice(0, 200),
      totalAdvertencias: advertencias.length,
      columnasReconocidas: reconocidas,
      columnasIgnoradas: ignoradas,
      muestra: [...porCodigo.values(), ...sinCodigo].slice(0, 8).map((r) => ({
        fila: r.fila,
        codigo: r.codigo,
        codigoTipo: r.datos.codigoTipo,
        tipoRegistro: r.datos.tipoRegistro,
        estatus: r.estatus,
        fechaRecepcion: r.datos.fechaRecepcion,
        macroproceso: r.datos.macroproceso,
        areaResponsable: r.datos.areaResponsable,
        titulo: r.datos.titulo,
        costoCalidad: r.datos.costoCalidad,
      })),
    };
    if (simular) return resumen;

    const unidades = await this.prisma.unidadOrganizativa.findMany({ select: { id: true, nombre: true } });
    const areaPorNombre = new Map(unidades.map((u) => [normalizar(u.nombre), u.id]));
    let correlativo = await this.prisma.registroMCC.count({ where: { codigo: { startsWith: 'MCC-IMP-' } } });
    const ahora = new Date();

    for (const r of [...porCodigo.values(), ...sinCodigo]) {
      const codigo = r.codigo ?? `MCC-IMP-${String(++correlativo).padStart(5, '0')}`;
      const areaId = r.datos.areaResponsable ? areaPorNombre.get(normalizar(r.datos.areaResponsable)) ?? null : null;
      const datos = {
        ...r.datos,
        porques: r.datos.porques ?? Prisma.DbNull,
        estado: r.estado,
        areaId,
        importadoAt: ahora,
        fechaCierre: r.datos.fechaCierre ?? (r.estado === 'CERRADO' ? r.datos.fechaLimite ?? r.datos.fechaRecepcion : null),
      };
      await this.prisma.registroMCC.upsert({
        where: { codigo },
        update: escaladosAbiertos.has(codigo) ? { ...datos, estado: undefined, fechaCierre: undefined } : datos,
        create: {
          ...datos,
          codigo,
          origen: 'OTRO',
          origenDetalle: r.datos.fuente,
          creadoAt: r.datos.fechaRecepcion ?? ahora,
          eventos: {
            create: { tipo: 'importado', detalle: `Importado del histórico del Control MCC (fila ${r.fila})`, estadoNuevo: r.estado, actorNombre: actor.nombre },
          },
        },
      });
    }
    await this.bitacora.registrar({
      accion: 'mcc.importar', actorId: actor.id, actorEmail: actor.email, entidad: 'RegistroMCC',
      valorNuevo: { filas: resumen.filasLeidas, nuevos, actualizados, errores: errores.length },
    });
    return resumen;
  }

  /**
   * Escala el registro a un hallazgo formal (H-AAAA-NNN) para llevarlo por el ciclo
   * ISO completo: validación, análisis de causa, plan, eficacia. El registro MCC queda
   * vinculado y "en seguimiento"; se cierra solo cuando se cierre el hallazgo.
   */
  async escalar(id: string, dto: EscalarMCCDto, actor: UsuarioActual) {
    const m = await this.exigeGestion(id, actor);
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.HALLAZGOS_CREAR)) {
      throw new ForbiddenException('No tienes permiso para registrar hallazgos');
    }
    if (m.hallazgo) throw new BadRequestException(`Este registro ya se escaló al hallazgo ${m.hallazgo.codigo}`);
    if (!m.tipoRegistro || !TIPOS_ESCALABLES.includes(m.tipoRegistro)) {
      throw new BadRequestException('Solo se escalan no conformidades, salidas/entradas no conformes y quejas');
    }
    if (['CERRADO', 'NO_PROCEDE'].includes(m.estado)) throw new BadRequestException('El registro ya está cerrado o desestimado');
    if (dto.procesoId && !(await this.prisma.proceso.findUnique({ where: { id: dto.procesoId } })))
      throw new NotFoundException('Proceso no encontrado');
    if (dto.responsableId && !(await this.prisma.usuario.findUnique({ where: { id: dto.responsableId } })))
      throw new NotFoundException('Responsable no encontrado');

    const anio = new Date().getFullYear();
    const usados = await this.prisma.hallazgo.findMany({ where: { codigo: { startsWith: `H-${anio}-` } }, select: { codigo: true } });
    const max = usados.reduce((acc, u) => Math.max(acc, Number(u.codigo.split('-')[2]) || 0), 0);
    const codigo = `H-${anio}-${String(max + 1).padStart(3, '0')}`;

    const ref = m.codigoTipo ?? m.codigo;
    const porques = ((m.porques as string[] | null) ?? []).filter((p) => p?.trim());
    const critico = esCritico({ impacto: m.impacto, prioridad: m.prioridad });

    const h = await this.prisma.$transaction(async (tx) => {
      const h = await tx.hallazgo.create({
        data: {
          codigo,
          origen: 'CONTROL_MCC',
          mccId: m.id,
          procesoId: dto.procesoId ?? null,
          areaId: m.areaId,
          descripcion: `[${ref}] ${m.titulo}\n\n${m.descripcion}`.slice(0, 2000),
          clasificacion: dto.clasificacion,
          requisito: dto.requisito?.trim() || null,
          evidencia: m.notaEvidencia,
          fechaDeteccion: m.fechaRecepcion ?? m.creadoAt,
          detectadoPorId: actor.id,
          responsableId: dto.responsableId ?? null,
          fechaCompromiso: m.fechaLimite,
          prioridad: dto.prioridad ?? m.prioridad ?? (critico ? 'ALTA' : 'MEDIA'),
          eventos: {
            create: {
              tipo: 'comentario',
              detalle: `Escalado desde el Control MCC (${ref}). Área: ${m.area?.nombre ?? m.areaResponsable ?? '—'}. Responsable en la hoja: ${m.responsableNombre ?? '—'}.`,
              actorId: actor.id,
              actorNombre: actor.nombre,
            },
          },
          // La causa raíz y los 5 porqués ya trabajados en el MCC pasan al análisis formal.
          ...(m.causaRaiz || porques.length
            ? {
                analisisCausa: {
                  create: {
                    metodologia: 'CINCO_PORQUES',
                    contenido: { problema: m.titulo, porques: porques.map((p, i) => ({ pregunta: `¿Por qué ${i + 1}?`, respuesta: p })) },
                    causaRaiz: m.causaRaiz,
                    elaboradoPorId: actor.id,
                    elaboradoAt: new Date(),
                  },
                },
              }
            : {}),
        },
      });
      await tx.registroMCC.update({
        where: { id: m.id },
        data: { estado: ['NUEVO', 'EN_REVISION', 'ACEPTADO', 'SIN_ESTADO'].includes(m.estado) ? 'EN_EJECUCION' : undefined },
      });
      await tx.eventoMCC.create({
        data: { mccId: m.id, tipo: 'escalado', detalle: `Escalado al hallazgo formal ${codigo}`, estadoNuevo: 'EN_EJECUCION', actorNombre: actor.nombre },
      });
      return h;
    });
    await this.bitacora.registrar({
      accion: 'mcc.escalar', actorId: actor.id, actorEmail: actor.email, entidad: 'RegistroMCC', entidadId: m.id,
      valorNuevo: { hallazgo: codigo, hallazgoId: h.id },
    });
    return { hallazgoId: h.id, codigo };
  }

  // ── Reportes: exportación a Excel e informe PDF ─────────────────────────

  /**
   * Registros con las mismas columnas (y encabezados) de la hoja original del Control MCC,
   * así el archivo se abre en Excel y se puede volver a importar sin perder datos.
   */
  async exportacion(q: FiltrosControlQuery, actor: UsuarioActual | null) {
    const ids = (await this.filasControl(q, actor)).map((f) => f.id);
    const regs = await this.prisma.registroMCC.findMany({
      where: { id: { in: ids } },
      include: { area: { select: { nombre: true } }, hallazgo: { select: { codigo: true, estado: true } }, acciones: { select: { estado: true } } },
      orderBy: [{ fechaRecepcion: 'asc' }, { creadoAt: 'asc' }],
    });
    const hoy = new Date();
    const f = (d: Date | null, hora = false) => (d ? formatoFecha(d, hora) : '');
    const n = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v).replace('.', ','));
    const columnas = COLUMNAS_EXPORTACION;
    const filas = regs.map((m) => {
      const est = estatusDe(m.estado);
      const plazo = plazoDe(est, m.fechaLimite, hoy);
      const porques = (m.porques as string[] | null) ?? [];
      const pct = porcentajeCumplimiento({
        compromisosAdquiridos: m.compromisosAdquiridos,
        compromisosCumplidos: m.compromisosCumplidos,
        accionesTotal: m.acciones.length,
        accionesTerminadas: m.acciones.filter((a) => ACCION_TERMINADA.includes(a.estado)).length,
      });
      const fecha = m.fechaRecepcion ?? m.creadoAt;
      return {
        codigo: m.codigo,
        tipo: m.tipoRegistro ? ETIQUETA_TIPO_REG[m.tipoRegistro] : '',
        codigoTipo: m.codigoTipo ?? 'S/C',
        gestorCalidad: m.gestorCalidad ?? '',
        fechaRecepcion: f(m.fechaRecepcion, true),
        mes: MESES[fecha.getMonth()],
        usuarioEncuentra: m.usuarioEncuentra ?? '',
        areaReporta: m.areaReporta ?? '',
        fuente: m.fuente ?? '',
        fuenteSecundaria: m.fuenteSecundaria ?? '',
        numeroExpediente: m.numeroExpediente ?? '',
        turno: m.turno ?? '',
        problema: m.titulo,
        descripcion: m.descripcion,
        macroproceso: m.macroproceso ?? '',
        areaResponsable: m.area?.nombre?.toUpperCase() ?? m.areaResponsable ?? '',
        procesoAfectado: m.procesoAfectado ?? '',
        subproceso: m.subproceso ?? '',
        procedimiento: m.procedimiento ?? '',
        subrogado: m.subrogado ?? '',
        impacto: m.impacto ?? '',
        dondeImpacto: m.dondeImpacto ?? '',
        causaRaiz: m.causaRaiz ?? '',
        porque1: porques[0] ?? '',
        porque2: porques[1] ?? '',
        porque3: porques[2] ?? '',
        porque4: porques[3] ?? '',
        porque5: porques[4] ?? '',
        requiereAcyp: m.requiereAcyp ? 'SI' : 'NO',
        acypCodigo: m.acypCodigo ?? '',
        compAdq: n(m.compromisosAdquiridos),
        compCump: n(m.compromisosCumplidos),
        pctCump: pct === null ? '' : `${pct}%`,
        escalamiento: m.escalamiento ?? '',
        costos: m.tieneCostos ? 'SI' : 'NO',
        costo: m.costoCalidad ? Number(m.costoCalidad).toFixed(2).replace('.', ',') : '0',
        phva: m.phva ?? '',
        logros: m.logros ?? '',
        leanDefecto: m.leanDefecto ?? '',
        leanRetrabajo: m.leanRetrabajo ?? '',
        leanEspera: m.leanEspera ?? '',
        leanMovimiento: m.leanMovimiento ?? '',
        responsable: m.responsableNombre ?? '',
        fechaNotificacion: f(m.fechaNotificacion),
        fechaCompRespuesta: f(m.fechaCompromisoRespuesta),
        fechaLimite: f(m.fechaLimite),
        fechaCierre: f(m.fechaCierre),
        estatus: ETIQUETA_ESTATUS_EXP[est],
        indicador: plazo.situacion === 'VENCIDO' ? `VENCIDO (${plazo.dias}d)` : plazo.situacion === 'POR_VENCER' ? `POR VENCER (${plazo.dias}d)` : plazo.situacion.replace('_', ' '),
        validacion: m.validacionCalidad ?? '',
        notaEvidencia: m.notaEvidencia ?? '',
        hallazgo: m.hallazgo ? `${m.hallazgo.codigo} (${m.hallazgo.estado})` : '',
      } satisfies Record<(typeof columnas)[number]['key'], string>;
    });
    return { columnas: [...columnas], filas };
  }

  /** Datos del informe del Control MCC (PDF): KPIs, tendencia de 12 meses, áreas y vencidos. */
  async informe(q: FiltrosControlQuery, actor: UsuarioActual | null) {
    const hoy = new Date();
    const filas = await this.filasControl(q, actor);
    const fcs = filas.map((f) => this.aFilaControl(f));
    const tablero = calcularTablero(fcs, hoy);

    // Tendencia: 12 meses que terminan en el fin del periodo, con los demás filtros.
    const fin = q.hasta ? fechaLocal(q.hasta) : hoy;
    const todas = await this.filasControl({ macroproceso: q.macroproceso, area: q.area, tipo: q.tipo }, actor);
    const meses = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(fin.getFullYear(), fin.getMonth() - 11 + i, 1);
      return { clave: `${d.getFullYear()}-${d.getMonth()}`, etiqueta: `${MESES[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(2)}`, registrados: 0, cerrados: 0, costo: 0 };
    });
    const porClave = new Map(meses.map((m) => [m.clave, m]));
    for (const f of todas) {
      const fr = f.fechaRecepcion ?? f.creadoAt;
      const m = porClave.get(`${fr.getFullYear()}-${fr.getMonth()}`);
      if (m) {
        m.registrados++;
        m.costo += f.costoCalidad ? Number(f.costoCalidad) : 0;
      }
      if (f.fechaCierre && f.estado === 'CERRADO') {
        const c = porClave.get(`${f.fechaCierre.getFullYear()}-${f.fechaCierre.getMonth()}`);
        if (c) c.cerrados++;
      }
    }

    // Consolidado por macroproceso (suma de sus áreas).
    const macro = new Map<string, { macroproceso: string; total: number; abiertos: number; seguimiento: number; cerrados: number; vencidos: number; base: number; acypVencidas: number }>();
    for (const c of tablero.consolidado) {
      const k = c.macroproceso;
      const a = macro.get(k) ?? { macroproceso: k, total: 0, abiertos: 0, seguimiento: 0, cerrados: 0, vencidos: 0, base: 0, acypVencidas: 0 };
      a.total += c.total;
      a.abiertos += c.abiertos;
      a.seguimiento += c.seguimiento;
      a.cerrados += c.cerrados;
      a.vencidos += c.vencidos;
      a.base += c.total - c.desestimados - c.sinEstado;
      a.acypVencidas += c.acypVencidas;
      macro.set(k, a);
    }

    const vencidos = filas
      .map((f) => ({ f, plazo: plazoDe(estatusDe(f.estado), f.fechaLimite, hoy) }))
      .filter((x) => x.plazo.situacion === 'VENCIDO')
      .sort((a, b) => (b.plazo.dias ?? 0) - (a.plazo.dias ?? 0))
      .map(({ f, plazo }) => ({
        codigo: f.codigoTipo ?? f.codigo,
        titulo: f.titulo,
        area: f.area?.nombre?.toUpperCase() ?? f.areaResponsable ?? '—',
        responsable: f.responsableNombre ?? '—',
        fechaLimite: f.fechaLimite ? formatoFecha(f.fechaLimite) : '—',
        dias: plazo.dias ?? 0,
        hallazgo: f.hallazgo?.codigo ?? null,
      }));

    const org = await this.prisma.unidadOrganizativa.findFirst({ where: { tipo: 'HOSPITAL' }, orderBy: { orden: 'asc' }, select: { nombre: true } });
    const periodo = q.desde && q.hasta
      ? `${formatoFecha(fechaLocal(q.desde))} – ${formatoFecha(fechaLocal(q.hasta))}`
      : q.mes ? `Mes de ${MESES[q.mes - 1].toLowerCase()} (todos los años)` : 'Todo el histórico';
    const filtros = [
      q.macroproceso && `Macroproceso: ${q.macroproceso}`,
      q.area && `Área: ${q.area}`,
      q.tipo && `Tipo: ${ETIQUETA_TIPO_REG[q.tipo]}`,
    ].filter(Boolean) as string[];

    return {
      organizacion: org?.nombre ?? 'Hospital',
      generadoAt: hoy.toISOString(),
      periodo,
      filtros,
      tablero,
      tendencia: meses,
      porMacroproceso: [...macro.values()]
        .sort((a, b) => b.total - a.total)
        .map((a) => ({ ...a, porcentajeCierre: a.base > 0 ? Math.round((a.cerrados / a.base) * 1000) / 10 : 0 })),
      vencidos,
      escalados: filas.filter((f) => f.hallazgo).length,
    };
  }

  // ── Flujo de propuestas de mejora (sin cambios) ─────────────────────────

  async decidir(id: string, dto: DecidirMCCDto, actor: UsuarioActual) {
    const m = await this.exigeGestion(id, actor);
    if (!['NUEVO', 'EN_REVISION', 'SIN_ESTADO'].includes(m.estado)) throw new BadRequestException('El registro ya tiene una decisión');
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
    if (m.hallazgo && m.hallazgo.estado !== 'CERRADO') {
      throw new BadRequestException(`Se cierra automáticamente al cerrar el hallazgo ${m.hallazgo.codigo}`);
    }
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

  /** Valida que el actor pueda ver el registro (para evidencias). */
  async exigeAcceso(id: string, actor: UsuarioActual, editar = false) {
    const d = await this.obtener(id, actor);
    if (editar && !d.puede.editar) throw new ForbiddenException('No puedes modificar este registro');
    return d;
  }

  // ── Auxiliares ─────────────────────────────────────────────────────────

  private async exige(id: string): Promise<MCCFull> {
    const m = await this.prisma.registroMCC.findUnique({ where: { id }, include: INCLUDE });
    if (!m) throw new NotFoundException('Registro MCC no encontrado');
    return m;
  }

  private async exigeGestion(id: string, actor: UsuarioActual): Promise<MCCFull> {
    if (!this.gestiona(actor)) {
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

  /** Cambia el estatus de cierre (ABIERTO / EN SEGUIMIENTO / CERRADO / DESESTIMADO) dejando huella en el historial. */
  private async aplicarEstatus(
    m: { id: string; estado: EstadoMCC; fechaCierre: Date | null; hallazgo?: { codigo: string; estado: string } | null },
    estatus: EstatusControl,
    fechaCierre: string | null | undefined,
    actor: UsuarioActual,
  ) {
    if (estatusDe(m.estado) === estatus) return;
    this.validarCierreEscalado(m, estatus);
    const estado = estadoDesdeEstatus(estatus);
    const cierra = estatus === 'CERRADO' || estatus === 'DESESTIMADO';
    await this.prisma.$transaction([
      this.prisma.registroMCC.update({
        where: { id: m.id },
        data: {
          estado,
          fechaCierre: cierra ? (fechaCierre ? new Date(fechaCierre) : m.fechaCierre ?? new Date()) : null,
        },
      }),
      this.prisma.eventoMCC.create({
        data: { mccId: m.id, tipo: 'estatus', detalle: `Estatus de cierre: ${estatus.replace('_', ' ')}`, estadoNuevo: estado, actorNombre: actor.nombre },
      }),
    ]);
  }

  /** Un registro escalado se cierra cuando se cierra su hallazgo formal (verificación de eficacia). */
  private validarCierreEscalado(m: { hallazgo?: { codigo: string; estado: string } | null }, estatus: EstatusControl | undefined) {
    if (m.hallazgo && m.hallazgo.estado !== 'CERRADO' && (estatus === 'CERRADO' || estatus === 'DESESTIMADO')) {
      throw new BadRequestException(
        `Este registro se escaló al hallazgo ${m.hallazgo.codigo}: se cierra automáticamente al verificar la eficacia del hallazgo.`,
      );
    }
  }

  /** Convierte los campos del formulario a datos de Prisma (undefined = no tocar). */
  private datosControl(dto: CamposControlDto) {
    const fecha = (v: string | null | undefined) => (v === undefined ? undefined : v ? new Date(v) : null);
    const txt = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null);
    const may = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim().toUpperCase() || null);
    return {
      tipoRegistro: dto.tipoRegistro,
      gestorCalidad: txt(dto.gestorCalidad),
      fechaRecepcion: fecha(dto.fechaRecepcion),
      usuarioEncuentra: txt(dto.usuarioEncuentra),
      areaReporta: may(dto.areaReporta),
      fuente: txt(dto.fuente),
      fuenteSecundaria: txt(dto.fuenteSecundaria),
      numeroExpediente: txt(dto.numeroExpediente),
      turno: txt(dto.turno),
      macroproceso: may(dto.macroproceso),
      areaResponsable: may(dto.areaResponsable),
      procesoAfectado: txt(dto.procesoAfectado),
      subproceso: txt(dto.subproceso),
      procedimiento: txt(dto.procedimiento),
      subrogado: txt(dto.subrogado),
      impacto: txt(dto.impacto),
      dondeImpacto: txt(dto.dondeImpacto),
      causaRaiz: txt(dto.causaRaiz),
      porques: dto.porques === undefined ? undefined : dto.porques?.some((p) => p.trim()) ? dto.porques.map((p) => p.trim()) : Prisma.DbNull,
      requiereAcyp: dto.requiereAcyp,
      acypCodigo: may(dto.acypCodigo),
      compromisosAdquiridos: dto.compromisosAdquiridos,
      compromisosCumplidos: dto.compromisosCumplidos,
      escalamiento: txt(dto.escalamiento),
      tieneCostos: dto.tieneCostos,
      costoCalidad: dto.costoCalidad === undefined ? undefined : dto.costoCalidad === null ? null : new Prisma.Decimal(dto.costoCalidad),
      phva: dto.phva,
      logros: txt(dto.logros),
      leanDefecto: txt(dto.leanDefecto),
      leanRetrabajo: txt(dto.leanRetrabajo),
      leanEspera: txt(dto.leanEspera),
      leanMovimiento: txt(dto.leanMovimiento),
      responsableNombre: txt(dto.responsableNombre),
      fechaNotificacion: fecha(dto.fechaNotificacion),
      fechaCompromisoRespuesta: fecha(dto.fechaCompromisoRespuesta),
      fechaLimite: fecha(dto.fechaLimite),
      fechaCierre: fecha(dto.fechaCierre),
      validacionCalidad: txt(dto.validacionCalidad),
      notaEvidencia: txt(dto.notaEvidencia),
      prioridad: dto.prioridad,
    } as Partial<Prisma.RegistroMCCUncheckedCreateInput> & { fechaRecepcion?: Date | null; fechaCierre?: Date | null };
  }

  private async buscarAreaId(nombre: string): Promise<string | null> {
    const n = normalizar(nombre);
    const unidades = await this.prisma.unidadOrganizativa.findMany({ select: { id: true, nombre: true } });
    return unidades.find((u) => normalizar(u.nombre) === n)?.id ?? null;
  }

  /** Siguiente correlativo por tipo y año: NC-001-2026, SNC-014-2026… */
  private async siguienteCodigoTipo(tipo: TipoRegistroMCC, anio: number): Promise<string | null> {
    const p = PREFIJO_TIPO[tipo];
    if (!p) return null;
    const usados = await this.prisma.registroMCC.findMany({
      where: { codigoTipo: { startsWith: `${p}-`, endsWith: `-${anio}` } },
      select: { codigoTipo: true },
    });
    const max = usados.reduce((acc, u) => {
      const n = Number(u.codigoTipo?.split('-')[1]);
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 0);
    return `${p}-${String(max + 1).padStart(3, '0')}-${anio}`;
  }

  /** "Registrar hallazgo y enviar alerta": avisa a Calidad (mcc.gestionar) de cada registro nuevo. */
  private async alertarNuevo(id: string, codigo: string, dto: CrearMCCDto, actor: UsuarioActual) {
    try {
      const gestores = await this.prisma.usuario.findMany({
        where: {
          activo: true,
          id: { not: actor.id },
          roles: { some: { rol: { activo: true, permisos: { some: { permisoCodigo: PERMISO.MCC_GESTIONAR } } } } },
        },
        select: { id: true },
      });
      if (!gestores.length) return;
      const critico = esCritico({ impacto: dto.impacto ?? null, prioridad: dto.prioridad ?? null });
      const tipo = dto.tipoRegistro ? dto.tipoRegistro.replace(/_/g, ' ').toLowerCase() : 'registro';
      await this.notificaciones.notificarVarios(gestores.map((g) => g.id), {
        nivel: critico ? 'URGENTE' : 'AVISO',
        titulo: `Nuevo ${tipo} ${codigo}`,
        mensaje: `${dto.titulo.trim()}${dto.areaResponsable ? ` — ${dto.areaResponsable}` : ''}. Registrado por ${actor.nombre}.`,
        entidad: 'RegistroMCC',
        entidadId: id,
        ruta: `/mcc/${id}`,
        claveDedup: `mcc-nuevo-${id}`,
        correo: true,
      });
    } catch {
      // La alerta no debe impedir el registro.
    }
  }

  /** actor = null solo desde Reportes (permiso reportes.ver): sin filtro de visibilidad. */
  private async filasControl(q: FiltrosControlQuery, actor: UsuarioActual | null): Promise<FilaBD[]> {
    const and: Prisma.RegistroMCCWhereInput[] = [{ archivadoAt: null }];
    const vis = actor ? this.visibilidad(actor) : null;
    if (vis) and.push(vis);
    if (q.tipo) and.push({ tipoRegistro: q.tipo });
    if (q.macroproceso) and.push({ macroproceso: q.macroproceso });
    if (q.area) and.push({ OR: [{ areaResponsable: q.area }, { area: { nombre: q.area } }] });
    const filas = await this.prisma.registroMCC.findMany({
      where: { AND: and },
      select: SELECT_CONTROL,
      orderBy: [{ fechaRecepcion: 'desc' }, { creadoAt: 'desc' }],
    });
    const desde = q.desde ? fechaLocal(q.desde) : null;
    const hasta = q.hasta ? new Date(fechaLocal(q.hasta).getTime() + 86_399_999) : null; // hasta el fin de ese día
    return filas.filter((f) => {
      const fecha = f.fechaRecepcion ?? f.creadoAt;
      if (desde && fecha < desde) return false;
      if (hasta && fecha > hasta) return false;
      if (q.mes && fecha.getMonth() + 1 !== q.mes) return false;
      return true;
    });
  }

  private aFilaControl(f: FilaBD): FilaControl {
    return {
      id: f.id,
      codigo: f.codigo,
      codigoTipo: f.codigoTipo,
      tipoRegistro: f.tipoRegistro,
      estado: f.estado,
      fecha: f.fechaRecepcion ?? f.creadoAt,
      sinFechaRecepcion: !f.fechaRecepcion,
      macroproceso: f.macroproceso,
      area: f.area?.nombre?.toUpperCase() ?? f.areaResponsable,
      impacto: f.impacto,
      prioridad: f.prioridad,
      requiereAcyp: f.requiereAcyp,
      acypCodigo: f.acypCodigo,
      compromisosAdquiridos: f.compromisosAdquiridos,
      compromisosCumplidos: f.compromisosCumplidos,
      fechaLimite: f.fechaLimite,
      costoCalidad: f.costoCalidad ? Number(f.costoCalidad) : 0,
      accionesTotal: f.acciones.length,
      accionesTerminadas: f.acciones.filter((a) => ACCION_TERMINADA.includes(a.estado)).length,
    };
  }

  private resumen(m: MCCFull) {
    return {
      id: m.id,
      codigo: m.codigo,
      codigoTipo: m.codigoTipo,
      tipoRegistro: m.tipoRegistro,
      titulo: m.titulo,
      origen: m.origen,
      estado: m.estado,
      estatus: estatusDe(m.estado),
      prioridad: m.prioridad,
      impacto: m.impacto,
      area: m.area,
      areaResponsable: m.areaResponsable,
      macroproceso: m.macroproceso,
      propuestoPor: m.propuestoPor,
      accionesTotal: m.acciones.length,
      accionesCerradas: m.acciones.filter((a) => ACCION_TERMINADA.includes(a.estado)).length,
      fechaRecepcion: m.fechaRecepcion,
      creadoAt: m.creadoAt,
      fechaCierre: m.fechaCierre,
      archivado: !!m.archivadoAt,
    };
  }

  private detalle(m: MCCFull) {
    const fc: FilaControl = {
      id: m.id, codigo: m.codigo, codigoTipo: m.codigoTipo, tipoRegistro: m.tipoRegistro, estado: m.estado,
      fecha: m.fechaRecepcion ?? m.creadoAt, macroproceso: m.macroproceso, area: m.area?.nombre ?? m.areaResponsable,
      impacto: m.impacto, prioridad: m.prioridad, requiereAcyp: m.requiereAcyp, acypCodigo: m.acypCodigo,
      compromisosAdquiridos: m.compromisosAdquiridos, compromisosCumplidos: m.compromisosCumplidos,
      fechaLimite: m.fechaLimite, costoCalidad: m.costoCalidad ? Number(m.costoCalidad) : 0,
      accionesTotal: m.acciones.length,
      accionesTerminadas: m.acciones.filter((a) => ACCION_TERMINADA.includes(a.estado)).length,
    };
    const hoy = new Date();
    return {
      ...this.resumen(m),
      descripcion: m.descripcion,
      origenDetalle: m.origenDetalle,
      decisionJustificacion: m.decisionJustificacion,
      evaluacionResultado: m.evaluacionResultado,
      aprendizaje: m.aprendizaje,
      gestionadoPor: m.gestionadoPor,
      hallazgo: m.hallazgo,
      control: {
        gestorCalidad: m.gestorCalidad,
        usuarioEncuentra: m.usuarioEncuentra,
        areaReporta: m.areaReporta,
        fuente: m.fuente,
        fuenteSecundaria: m.fuenteSecundaria,
        numeroExpediente: m.numeroExpediente,
        turno: m.turno,
        procesoAfectado: m.procesoAfectado,
        subproceso: m.subproceso,
        procedimiento: m.procedimiento,
        subrogado: m.subrogado,
        dondeImpacto: m.dondeImpacto,
        causaRaiz: m.causaRaiz,
        porques: (m.porques as string[] | null) ?? null,
        requiereAcyp: m.requiereAcyp,
        acypCodigo: m.acypCodigo,
        compromisosAdquiridos: m.compromisosAdquiridos,
        compromisosCumplidos: m.compromisosCumplidos,
        cumplimiento: porcentajeCumplimiento(fc),
        escalamiento: m.escalamiento,
        tieneCostos: m.tieneCostos,
        costoCalidad: m.costoCalidad ? Number(m.costoCalidad) : null,
        phva: m.phva,
        logros: m.logros,
        leanDefecto: m.leanDefecto,
        leanRetrabajo: m.leanRetrabajo,
        leanEspera: m.leanEspera,
        leanMovimiento: m.leanMovimiento,
        responsableNombre: m.responsableNombre,
        fechaNotificacion: m.fechaNotificacion,
        fechaCompromisoRespuesta: m.fechaCompromisoRespuesta,
        fechaLimite: m.fechaLimite,
        validacionCalidad: m.validacionCalidad,
        notaEvidencia: m.notaEvidencia,
        importadoAt: m.importadoAt,
        acyp: acypDe(fc, hoy),
        plazo: plazoDe(estatusDe(m.estado), m.fechaLimite, hoy),
      },
    };
  }
}
