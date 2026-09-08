import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type FrecuenciaIndicador } from '@prisma/client';
import { AlcanceService } from '../auth/rbac/alcance.service';
import { PERMISO } from '../auth/rbac/permisos.catalog';
import type { UsuarioActual } from '../auth/rbac/usuario-actual';
import { BitacoraService } from '../common/bitacora/bitacora.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import { calcularSemaforo, calcularTendencia, calcularValor } from './calculo';
import type {
  AnalizarMedicionDto,
  ConsolidadoQuery,
  CrearIndicadorDto,
  EditarIndicadorDto,
  ListarIndicadoresQuery,
  RegistrarMedicionDto,
} from './dto/indicador.dto';
import {
  comparaPeriodo,
  etiquetaPeriodo,
  periodoActual,
  periodosHasta,
  PERIODOS_POR_ANIO,
} from './periodos';

type IndicadorConMediciones = Prisma.IndicadorGetPayload<{
  include: {
    proceso: { select: { id: true; codigo: true; nombre: true; areaId: true; responsableId: true; suplenteId: true } };
    responsableCaptura: { select: { id: true; nombre: true } };
    responsableAnalisis: { select: { id: true; nombre: true } };
    mediciones: true;
  };
}>;

const INCLUDE_IND = {
  proceso: {
    select: { id: true, codigo: true, nombre: true, areaId: true, responsableId: true, suplenteId: true },
  },
  responsableCaptura: { select: { id: true, nombre: true } },
  responsableAnalisis: { select: { id: true, nombre: true } },
  mediciones: true,
} satisfies Prisma.IndicadorInclude;

@Injectable()
export class IndicadoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  // ── Consultas ────────────────────────────────────────────────────────────

  async listar(q: ListarIndicadoresQuery, actor: UsuarioActual): Promise<Paginado<unknown>> {
    const procesosIds = await this.alcance.procesosVisiblesIds(actor, PERMISO.INDICADORES_VER);
    const and: Prisma.IndicadorWhereInput[] = [];
    if (procesosIds) and.push({ procesoId: { in: procesosIds } });
    if (q.procesoId) and.push({ procesoId: q.procesoId });
    if (q.frecuencia) and.push({ frecuencia: q.frecuencia });
    if (q.q) and.push({ OR: [{ nombre: { contains: q.q } }, { codigo: { contains: q.q } }] });
    const where: Prisma.IndicadorWhereInput = and.length ? { AND: and } : {};

    const [filas, total] = await this.prisma.$transaction([
      this.prisma.indicador.findMany({
        where,
        orderBy: [{ activo: 'desc' }, { codigo: 'asc' }],
        skip: q.skip,
        take: q.porPagina,
        include: INCLUDE_IND,
      }),
      this.prisma.indicador.count({ where }),
    ]);

    let datos = filas.map((i) => this.resumen(i));
    if (q.soloConAlerta) {
      datos = datos.filter((d) => d.alerta.capturaPendiente || d.alerta.periodosVencidos > 0 || d.alerta.fueraDeMeta);
    }
    return paginar(datos, total, q);
  }

  async obtener(id: string, actor: UsuarioActual) {
    const ind = await this.prisma.indicador.findUnique({ where: { id }, include: INCLUDE_IND });
    if (!ind) throw new NotFoundException('Indicador no encontrado');
    if (!(await this.alcance.puedeSobreProceso(actor, PERMISO.INDICADORES_VER, ind.proceso))) {
      throw new ForbiddenException('No tienes acceso a este indicador');
    }

    const mediciones = this.medicionesOrdenadas(ind);
    const puede = {
      editar: await this.alcance.puedeSobreProceso(actor, PERMISO.INDICADORES_EDITAR, ind.proceso),
      capturar: await this.alcance.puedeSobreProceso(actor, PERMISO.INDICADORES_CAPTURAR, ind.proceso),
      analizar: await this.alcance.puedeSobreProceso(actor, PERMISO.INDICADORES_ANALIZAR, ind.proceso),
      archivar: actor.esSuperAdmin || actor.permisos.includes(PERMISO.INDICADORES_ARCHIVAR),
    };

    return {
      indicador: this.definicion(ind),
      mediciones,
      alerta: this.analizarAlerta(ind),
      periodosDisponibles: this.periodosDisponibles(ind.frecuencia),
      puede,
    };
  }

  async consolidado(q: ConsolidadoQuery, actor: UsuarioActual) {
    const procesosIds = await this.alcance.procesosVisiblesIds(actor, PERMISO.INDICADORES_VER);
    const where: Prisma.IndicadorWhereInput = {
      activo: true,
      ...(procesosIds ? { procesoId: { in: procesosIds } } : {}),
      ...(q.procesoId ? { procesoId: q.procesoId } : {}),
    };
    const indicadores = await this.prisma.indicador.findMany({ where, include: INCLUDE_IND });

    const porProceso = new Map<string, { proceso: { id: string; codigo: string; nombre: string }; verde: number; amarillo: number; rojo: number; sinDato: number }>();
    let verde = 0;
    let amarillo = 0;
    let rojo = 0;
    let sinDato = 0;

    for (const ind of indicadores) {
      const delAnio = ind.mediciones.filter((m) => m.anio === q.anio);
      const ultima = delAnio.sort((a, b) => b.periodo - a.periodo)[0];
      const clave = ind.proceso.id;
      if (!porProceso.has(clave)) {
        porProceso.set(clave, {
          proceso: { id: ind.proceso.id, codigo: ind.proceso.codigo, nombre: ind.proceso.nombre },
          verde: 0, amarillo: 0, rojo: 0, sinDato: 0,
        });
      }
      const grupo = porProceso.get(clave)!;
      if (!ultima) {
        sinDato++; grupo.sinDato++;
      } else if (ultima.semaforo === 'VERDE') {
        verde++; grupo.verde++;
      } else if (ultima.semaforo === 'AMARILLO') {
        amarillo++; grupo.amarillo++;
      } else {
        rojo++; grupo.rojo++;
      }
    }

    const totalConDato = verde + amarillo + rojo;
    return {
      anio: q.anio,
      total: indicadores.length,
      resumen: {
        verde, amarillo, rojo, sinDato,
        cumplimiento: totalConDato ? Math.round((verde / totalConDato) * 100) : null,
      },
      porProceso: [...porProceso.values()].sort((a, b) => a.proceso.codigo.localeCompare(b.proceso.codigo)),
    };
  }

  // ── Definición ───────────────────────────────────────────────────────────

  async crear(dto: CrearIndicadorDto, actor: UsuarioActual) {
    if (await this.prisma.indicador.findUnique({ where: { codigo: dto.codigo } })) {
      throw new ConflictException('Ya existe un indicador con ese código');
    }
    const proceso = await this.prisma.proceso.findUnique({ where: { id: dto.procesoId } });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');
    if (!(await this.alcance.puedeSobreProceso(actor, PERMISO.INDICADORES_CREAR, proceso))) {
      throw new ForbiddenException('No puedes crear indicadores en este proceso');
    }
    await this.validarResponsables(dto);
    this.validarUmbral(dto);

    const ind = await this.prisma.indicador.create({
      data: {
        codigo: dto.codigo.toUpperCase(),
        nombre: dto.nombre.trim(),
        objetivo: dto.objetivo.trim(),
        procesoId: dto.procesoId,
        formula: dto.formula.trim(),
        usaNumeradorDenominador: dto.usaNumeradorDenominador,
        expresarPorcentaje: dto.expresarPorcentaje,
        unidad: dto.unidad.trim(),
        fuenteDatos: dto.fuenteDatos?.trim() ?? null,
        frecuencia: dto.frecuencia,
        sentido: dto.sentido,
        meta: dto.meta,
        umbralAmarillo: dto.umbralAmarillo ?? null,
        responsableCapturaId: dto.responsableCapturaId ?? null,
        responsableAnalisisId: dto.responsableAnalisisId ?? null,
      },
      include: INCLUDE_IND,
    });
    await this.bitacora.registrar({
      accion: 'indicador.crear',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Indicador', entidadId: ind.id,
      valorNuevo: { codigo: ind.codigo, nombre: ind.nombre, procesoId: ind.procesoId },
    });
    return this.obtener(ind.id, actor);
  }

  async editar(id: string, dto: EditarIndicadorDto, actor: UsuarioActual) {
    const ind = await this.prisma.indicador.findUnique({ where: { id }, include: INCLUDE_IND });
    if (!ind) throw new NotFoundException('Indicador no encontrado');
    if (!(await this.alcance.puedeSobreProceso(actor, PERMISO.INDICADORES_EDITAR, ind.proceso))) {
      throw new ForbiddenException('No puedes editar este indicador');
    }
    await this.validarResponsables(dto);
    this.validarUmbral({ ...ind, ...dto });

    const cambiaCalculo =
      (dto.meta !== undefined && dto.meta !== ind.meta) ||
      (dto.umbralAmarillo !== undefined && dto.umbralAmarillo !== ind.umbralAmarillo) ||
      (dto.sentido !== undefined && dto.sentido !== ind.sentido) ||
      (dto.usaNumeradorDenominador !== undefined && dto.usaNumeradorDenominador !== ind.usaNumeradorDenominador) ||
      (dto.expresarPorcentaje !== undefined && dto.expresarPorcentaje !== ind.expresarPorcentaje);

    await this.prisma.indicador.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        objetivo: dto.objetivo?.trim(),
        formula: dto.formula?.trim(),
        usaNumeradorDenominador: dto.usaNumeradorDenominador,
        expresarPorcentaje: dto.expresarPorcentaje,
        unidad: dto.unidad?.trim(),
        fuenteDatos: dto.fuenteDatos === undefined ? undefined : dto.fuenteDatos,
        frecuencia: dto.frecuencia,
        sentido: dto.sentido,
        meta: dto.meta,
        umbralAmarillo: dto.umbralAmarillo === undefined ? undefined : dto.umbralAmarillo,
        responsableCapturaId: dto.responsableCapturaId === undefined ? undefined : dto.responsableCapturaId,
        responsableAnalisisId: dto.responsableAnalisisId === undefined ? undefined : dto.responsableAnalisisId,
      },
    });

    if (cambiaCalculo) await this.recalcularMediciones(id);

    await this.bitacora.registrar({
      accion: 'indicador.editar',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Indicador', entidadId: id,
      valorNuevo: dto as Prisma.InputJsonValue,
    });
    return this.obtener(id, actor);
  }

  async archivar(id: string, archivar: boolean, actor: UsuarioActual) {
    const ind = await this.prisma.indicador.findUnique({ where: { id }, include: { proceso: true } });
    if (!ind) throw new NotFoundException('Indicador no encontrado');
    if (!actor.esSuperAdmin && !actor.permisos.includes(PERMISO.INDICADORES_ARCHIVAR)) {
      throw new ForbiddenException('No tienes permiso para archivar indicadores');
    }
    await this.prisma.indicador.update({
      where: { id },
      data: { activo: !archivar, archivadoAt: archivar ? new Date() : null },
    });
    await this.bitacora.registrar({
      accion: archivar ? 'indicador.archivar' : 'indicador.desarchivar',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Indicador', entidadId: id,
    });
    return this.obtener(id, actor);
  }

  // ── Mediciones ───────────────────────────────────────────────────────────

  async registrarMedicion(id: string, dto: RegistrarMedicionDto, actor: UsuarioActual) {
    const ind = await this.prisma.indicador.findUnique({ where: { id }, include: { proceso: true } });
    if (!ind) throw new NotFoundException('Indicador no encontrado');
    if (!(await this.alcance.puedeSobreProceso(actor, PERMISO.INDICADORES_CAPTURAR, ind.proceso))) {
      throw new ForbiddenException('No puedes capturar mediciones de este indicador');
    }

    const maxPeriodo = PERIODOS_POR_ANIO[ind.frecuencia];
    if (dto.periodo < 1 || dto.periodo > maxPeriodo) {
      throw new BadRequestException(`El periodo debe estar entre 1 y ${maxPeriodo} para esta frecuencia`);
    }
    const actualP = periodoActual(ind.frecuencia);
    if (comparaPeriodo(dto, actualP) > 0) {
      throw new BadRequestException('No se puede capturar un periodo futuro');
    }
    if (ind.usaNumeradorDenominador) {
      if (dto.numerador == null || dto.denominador == null) {
        throw new BadRequestException('Este indicador requiere numerador y denominador');
      }
      if (dto.denominador === 0) throw new BadRequestException('El denominador no puede ser cero');
    } else if (dto.valor == null) {
      throw new BadRequestException('Ingresa el valor del indicador');
    }

    const valor = calcularValor(ind, dto);
    const semaforo = calcularSemaforo(ind, valor);
    const etiqueta = etiquetaPeriodo(ind.frecuencia, dto.anio, dto.periodo);

    const medicion = await this.prisma.medicionIndicador.upsert({
      where: { indicadorId_anio_periodo: { indicadorId: id, anio: dto.anio, periodo: dto.periodo } },
      create: {
        indicadorId: id,
        anio: dto.anio,
        periodo: dto.periodo,
        etiqueta,
        numerador: dto.numerador ?? null,
        denominador: dto.denominador ?? null,
        valor,
        semaforo,
        analisis: dto.analisis ?? null,
        planAccion: dto.planAccion ?? null,
        evidenciaUrl: dto.evidenciaUrl ?? null,
        capturadoPorId: actor.id,
        analizadoPorId: dto.analisis ? actor.id : null,
        analizadoAt: dto.analisis ? new Date() : null,
      },
      update: {
        etiqueta,
        numerador: dto.numerador ?? null,
        denominador: dto.denominador ?? null,
        valor,
        semaforo,
        analisis: dto.analisis ?? undefined,
        planAccion: dto.planAccion ?? undefined,
        evidenciaUrl: dto.evidenciaUrl ?? undefined,
        capturadoPorId: actor.id,
      },
    });

    await this.bitacora.registrar({
      accion: 'indicador.registrar_medicion',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Indicador', entidadId: id,
      valorNuevo: { periodo: etiqueta, valor, semaforo },
    });
    return { ...(await this.obtener(id, actor)), medicionId: medicion.id };
  }

  async analizarMedicion(id: string, medicionId: string, dto: AnalizarMedicionDto, actor: UsuarioActual) {
    const ind = await this.prisma.indicador.findUnique({ where: { id }, include: { proceso: true } });
    if (!ind) throw new NotFoundException('Indicador no encontrado');
    if (!(await this.alcance.puedeSobreProceso(actor, PERMISO.INDICADORES_ANALIZAR, ind.proceso))) {
      throw new ForbiddenException('No puedes analizar este indicador');
    }
    const medicion = await this.prisma.medicionIndicador.findFirst({ where: { id: medicionId, indicadorId: id } });
    if (!medicion) throw new NotFoundException('Medición no encontrada');

    await this.prisma.medicionIndicador.update({
      where: { id: medicionId },
      data: {
        analisis: dto.analisis.trim(),
        planAccion: dto.planAccion?.trim() ?? null,
        analizadoPorId: actor.id,
        analizadoAt: new Date(),
      },
    });
    await this.bitacora.registrar({
      accion: 'indicador.analizar_medicion',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Indicador', entidadId: id,
      valorNuevo: { periodo: medicion.etiqueta },
    });
    return this.obtener(id, actor);
  }

  async eliminarMedicion(id: string, medicionId: string, actor: UsuarioActual) {
    const ind = await this.prisma.indicador.findUnique({ where: { id }, include: { proceso: true } });
    if (!ind) throw new NotFoundException('Indicador no encontrado');
    if (!(await this.alcance.puedeSobreProceso(actor, PERMISO.INDICADORES_CAPTURAR, ind.proceso))) {
      throw new ForbiddenException('No puedes modificar mediciones de este indicador');
    }
    const medicion = await this.prisma.medicionIndicador.findFirst({ where: { id: medicionId, indicadorId: id } });
    if (!medicion) throw new NotFoundException('Medición no encontrada');
    await this.prisma.medicionIndicador.delete({ where: { id: medicionId } });
    await this.bitacora.registrar({
      accion: 'indicador.eliminar_medicion',
      actorId: actor.id, actorEmail: actor.email,
      entidad: 'Indicador', entidadId: id,
      valorAnterior: { periodo: medicion.etiqueta, valor: medicion.valor },
    });
    return this.obtener(id, actor);
  }

  // ── Auxiliares ───────────────────────────────────────────────────────────

  private async recalcularMediciones(indicadorId: string) {
    const ind = await this.prisma.indicador.findUnique({
      where: { id: indicadorId },
      include: { mediciones: true },
    });
    if (!ind) return;
    for (const m of ind.mediciones) {
      const valor = calcularValor(ind, { numerador: m.numerador, denominador: m.denominador, valor: m.valor });
      const semaforo = calcularSemaforo(ind, valor);
      if (valor !== m.valor || semaforo !== m.semaforo) {
        await this.prisma.medicionIndicador.update({ where: { id: m.id }, data: { valor, semaforo } });
      }
    }
  }

  private medicionesOrdenadas(ind: IndicadorConMediciones) {
    const ordenadas = [...ind.mediciones].sort(
      (a, b) => comparaPeriodo(a, b),
    );
    return ordenadas.map((m, i) => ({
      id: m.id,
      anio: m.anio,
      periodo: m.periodo,
      etiqueta: m.etiqueta,
      numerador: m.numerador,
      denominador: m.denominador,
      valor: m.valor,
      semaforo: m.semaforo,
      tendencia: calcularTendencia(ind.sentido, m.valor, ordenadas[i - 1]?.valor ?? null),
      analisis: m.analisis,
      planAccion: m.planAccion,
      evidenciaUrl: m.evidenciaUrl,
      requiereAnalisis: m.semaforo !== 'VERDE' && !m.analisis,
      capturadoAt: m.capturadoAt,
      analizadoAt: m.analizadoAt,
    }));
  }

  private analizarAlerta(ind: IndicadorConMediciones) {
    const clavesConDato = new Set(ind.mediciones.map((m) => `${m.anio}-${m.periodo}`));
    const anioActual = new Date().getFullYear();
    const esperados = periodosHasta(ind.frecuencia, anioActual);
    const faltantes = esperados.filter((p) => !clavesConDato.has(`${p.anio}-${p.periodo}`));
    const actualP = periodoActual(ind.frecuencia);
    const capturaPendiente = faltantes.some((p) => comparaPeriodo(p, actualP) === 0);
    const periodosVencidos = faltantes.filter((p) => comparaPeriodo(p, actualP) < 0).length;

    const ordenadas = [...ind.mediciones].sort((a, b) => comparaPeriodo(b, a));
    const ultima = ordenadas[0];
    const ultimas3 = ordenadas.slice(0, 3);
    const reincidente = ultimas3.length === 3 && ultimas3.every((m) => m.semaforo !== 'VERDE');

    return {
      capturaPendiente,
      periodosVencidos,
      fueraDeMeta: ultima ? ultima.semaforo !== 'VERDE' : false,
      reincidente,
      requierenAnalisis: ind.mediciones.filter((m) => m.semaforo !== 'VERDE' && !m.analisis).length,
      ultimoSemaforo: ultima?.semaforo ?? null,
      ultimoValor: ultima?.valor ?? null,
      ultimoPeriodo: ultima?.etiqueta ?? null,
    };
  }

  private periodosDisponibles(frecuencia: FrecuenciaIndicador) {
    const anioActual = new Date().getFullYear();
    return [anioActual, anioActual - 1].flatMap((anio) =>
      periodosHasta(frecuencia, anio).filter((p) => p.anio === anio).map((p) => ({
        anio: p.anio,
        periodo: p.periodo,
        etiqueta: etiquetaPeriodo(frecuencia, p.anio, p.periodo),
      })),
    );
  }

  private definicion(ind: IndicadorConMediciones) {
    return {
      id: ind.id,
      codigo: ind.codigo,
      nombre: ind.nombre,
      objetivo: ind.objetivo,
      proceso: { id: ind.proceso.id, codigo: ind.proceso.codigo, nombre: ind.proceso.nombre },
      formula: ind.formula,
      usaNumeradorDenominador: ind.usaNumeradorDenominador,
      expresarPorcentaje: ind.expresarPorcentaje,
      unidad: ind.unidad,
      fuenteDatos: ind.fuenteDatos,
      frecuencia: ind.frecuencia,
      sentido: ind.sentido,
      meta: ind.meta,
      umbralAmarillo: ind.umbralAmarillo,
      responsableCaptura: ind.responsableCaptura,
      responsableAnalisis: ind.responsableAnalisis,
      activo: ind.activo,
    };
  }

  private resumen(ind: IndicadorConMediciones) {
    return {
      id: ind.id,
      codigo: ind.codigo,
      nombre: ind.nombre,
      unidad: ind.unidad,
      frecuencia: ind.frecuencia,
      meta: ind.meta,
      sentido: ind.sentido,
      activo: ind.activo,
      proceso: { id: ind.proceso.id, codigo: ind.proceso.codigo, nombre: ind.proceso.nombre },
      responsableCaptura: ind.responsableCaptura,
      alerta: this.analizarAlerta(ind),
    };
  }

  private validarUmbral(x: { sentido?: string; meta?: number; umbralAmarillo?: number | null }) {
    if (x.umbralAmarillo == null || x.meta == null) return;
    // El umbral amarillo debe quedar "peor" que la meta.
    if (x.sentido === 'CRECIENTE' && x.umbralAmarillo >= x.meta) {
      throw new BadRequestException('El umbral amarillo debe ser menor que la meta');
    }
    if (x.sentido === 'DECRECIENTE' && x.umbralAmarillo <= x.meta) {
      throw new BadRequestException('El umbral amarillo debe ser mayor que la meta');
    }
  }

  private async validarResponsables(dto: {
    responsableCapturaId?: string | null;
    responsableAnalisisId?: string | null;
  }) {
    for (const uid of [dto.responsableCapturaId, dto.responsableAnalisisId]) {
      if (uid) {
        const u = await this.prisma.usuario.findUnique({ where: { id: uid } });
        if (!u) throw new NotFoundException('Usuario responsable no encontrado');
      }
    }
  }
}
