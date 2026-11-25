/**
 * Lógica pura del "Control MCC": estatus simplificado, semáforo de plazos,
 * situación de la ACyP y los agregados del tablero. Sin dependencias de Nest
 * ni de Prisma para poder probarla de forma aislada.
 */
import type { EstadoMCC, TipoRegistroMCC } from '@prisma/client';

/** Estatus de la hoja original: ABIERTO / EN SEGUIMIENTO / CERRADO / DESESTIMADO / SIN ESTADO. */
export type EstatusControl = 'ABIERTO' | 'EN_SEGUIMIENTO' | 'CERRADO' | 'DESESTIMADO' | 'SIN_ESTADO';
export type SituacionAcyp = 'PENDIENTE' | 'SEGUIMIENTO' | 'COMPLETADA' | 'VENCIDA' | null;
export type SituacionPlazo = 'CERRADO' | 'VENCIDO' | 'POR_VENCER' | 'EN_PLAZO' | 'SIN_FECHA' | 'NO_APLICA';

export const DIAS_POR_VENCER = 7;
const DIA_MS = 86_400_000;

export function estatusDe(estado: EstadoMCC): EstatusControl {
  switch (estado) {
    case 'EN_EJECUCION':
    case 'VERIFICACION':
      return 'EN_SEGUIMIENTO';
    case 'CERRADO':
      return 'CERRADO';
    case 'NO_PROCEDE':
      return 'DESESTIMADO';
    case 'SIN_ESTADO':
      return 'SIN_ESTADO';
    default:
      return 'ABIERTO';
  }
}

/** Estado interno que corresponde a un estatus de la hoja. */
export function estadoDesdeEstatus(e: EstatusControl): EstadoMCC {
  return ({
    ABIERTO: 'NUEVO',
    EN_SEGUIMIENTO: 'EN_EJECUCION',
    CERRADO: 'CERRADO',
    DESESTIMADO: 'NO_PROCEDE',
    SIN_ESTADO: 'SIN_ESTADO',
  } as const)[e];
}

export const estaCerrado = (e: EstatusControl) => e === 'CERRADO' || e === 'DESESTIMADO';

/** Días enteros entre dos fechas (b - a), por día calendario. */
export function diasEntre(a: Date, b: Date): number {
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / DIA_MS);
}

export function plazoDe(estatus: EstatusControl, fechaLimite: Date | null, hoy: Date): { situacion: SituacionPlazo; dias: number | null } {
  if (estatus === 'DESESTIMADO' || estatus === 'SIN_ESTADO') return { situacion: 'NO_APLICA', dias: null };
  if (estatus === 'CERRADO') return { situacion: 'CERRADO', dias: null };
  if (!fechaLimite) return { situacion: 'SIN_FECHA', dias: null };
  const dias = diasEntre(hoy, fechaLimite); // negativo = vencido
  if (dias < 0) return { situacion: 'VENCIDO', dias: -dias };
  if (dias <= DIAS_POR_VENCER) return { situacion: 'POR_VENCER', dias };
  return { situacion: 'EN_PLAZO', dias };
}

export interface FilaControl {
  id: string;
  codigo: string;
  codigoTipo: string | null;
  tipoRegistro: TipoRegistroMCC | null;
  estado: EstadoMCC;
  fecha: Date; // fecha de recepción (o de creación si no hay)
  /** true si `fecha` es la de creación porque el registro no trae fecha de recepción. */
  sinFechaRecepcion?: boolean;
  macroproceso: string | null;
  area: string | null; // nombre de la unidad o texto libre
  impacto: string | null;
  prioridad: string | null;
  requiereAcyp: boolean;
  acypCodigo: string | null;
  compromisosAdquiridos: number | null;
  compromisosCumplidos: number | null;
  fechaLimite: Date | null;
  costoCalidad: number;
  /** Acciones CAPA vinculadas en Calidad360: total y terminadas. */
  accionesTotal: number;
  accionesTerminadas: number;
}

export function porcentajeCumplimiento(f: Pick<FilaControl, 'compromisosAdquiridos' | 'compromisosCumplidos' | 'accionesTotal' | 'accionesTerminadas'>): number | null {
  if (f.compromisosAdquiridos && f.compromisosAdquiridos > 0) {
    return Math.min(100, Math.round(((f.compromisosCumplidos ?? 0) / f.compromisosAdquiridos) * 100));
  }
  if (f.accionesTotal > 0) return Math.round((f.accionesTerminadas / f.accionesTotal) * 100);
  return null;
}

/** Situación de la ACyP de un registro (null si no requiere ACyP). */
export function acypDe(f: FilaControl, hoy: Date): SituacionAcyp {
  const tieneAcyp = f.requiereAcyp || !!f.acypCodigo || f.accionesTotal > 0;
  if (!tieneAcyp) return null;
  const est = estatusDe(f.estado);
  if (est === 'DESESTIMADO' || est === 'SIN_ESTADO') return null;
  const pct = porcentajeCumplimiento(f);
  if (est === 'CERRADO' || pct === 100) return 'COMPLETADA';
  if (f.fechaLimite && diasEntre(hoy, f.fechaLimite) < 0) return 'VENCIDA';
  if (est === 'EN_SEGUIMIENTO') return 'SEGUIMIENTO';
  return 'PENDIENTE';
}

const CRITICO = /ALT|GRAV|CRIT|SEVER|CENTINELA|MAYOR|CATASTR/i;
/** Un registro es crítico si su impacto es alto/grave/crítico o su prioridad es ALTA. */
export const esCritico = (f: Pick<FilaControl, 'impacto' | 'prioridad'>) =>
  f.prioridad === 'ALTA' || (!!f.impacto && CRITICO.test(f.impacto));

export const TIPOS_ORDEN: (TipoRegistroMCC | 'SIN_CLASIFICAR')[] = [
  'NO_CONFORMIDAD',
  'SALIDA_NO_CONFORME',
  'ENTRADA_NO_CONFORME',
  'QUEJA',
  'FELICITACION',
  'SUGERENCIA',
  'OTRO',
  'SIN_CLASIFICAR',
];

interface Conteo {
  total: number;
  abiertos: number;
  seguimiento: number;
  cerrados: number;
  desestimados: number;
  sinEstado: number;
  vencidos: number;
}
const conteoVacio = (): Conteo => ({ total: 0, abiertos: 0, seguimiento: 0, cerrados: 0, desestimados: 0, sinEstado: 0, vencidos: 0 });

function sumar(c: Conteo, est: EstatusControl, vencido: boolean) {
  c.total++;
  if (est === 'ABIERTO') c.abiertos++;
  else if (est === 'EN_SEGUIMIENTO') c.seguimiento++;
  else if (est === 'CERRADO') c.cerrados++;
  else if (est === 'DESESTIMADO') c.desestimados++;
  else c.sinEstado++;
  if (vencido) c.vencidos++;
}

/** % de cierre efectivo: cerrados sobre los registros gestionables (sin desestimados ni sin estado). */
export function porcentajeCierre(c: Conteo): number {
  const base = c.total - c.desestimados - c.sinEstado;
  return base > 0 ? Math.round((c.cerrados / base) * 1000) / 10 : 0;
}

export function calcularTablero(filas: FilaControl[], hoy: Date) {
  const global = conteoVacio();
  const acyp = { pendientes: 0, seguimiento: 0, completadas: 0, vencidas: 0 };
  let porVencer = 0;
  let costoTotal = 0;
  let ultimoCritico: Date | null = null;

  const porTipo = new Map<string, Conteo>();
  const porArea = new Map<string, Conteo & { macroproceso: string | null; area: string }>();
  const consolidado = new Map<
    string,
    Conteo & {
      macroproceso: string;
      area: string;
      codigos: { id: string; codigo: string }[];
      acypPendientes: number;
      acypCompletadas: number;
      acypVencidas: number;
    }
  >();

  for (const f of filas) {
    const est = estatusDe(f.estado);
    const plazo = plazoDe(est, f.fechaLimite, hoy);
    const vencido = plazo.situacion === 'VENCIDO';
    if (plazo.situacion === 'POR_VENCER') porVencer++;
    costoTotal += f.costoCalidad;
    sumar(global, est, vencido);

    const ac = acypDe(f, hoy);
    if (ac === 'PENDIENTE') acyp.pendientes++;
    else if (ac === 'SEGUIMIENTO') acyp.seguimiento++;
    else if (ac === 'COMPLETADA') acyp.completadas++;
    else if (ac === 'VENCIDA') acyp.vencidas++;

    // Safety clock: días desde el último registro crítico (los desestimados y los
    // que no traen fecha de recepción real no cuentan).
    if (esCritico(f) && est !== 'DESESTIMADO' && !f.sinFechaRecepcion && (!ultimoCritico || f.fecha > ultimoCritico)) ultimoCritico = f.fecha;

    const tipo = f.tipoRegistro ?? 'SIN_CLASIFICAR';
    if (!porTipo.has(tipo)) porTipo.set(tipo, conteoVacio());
    sumar(porTipo.get(tipo)!, est, vencido);

    const area = f.area?.trim() || 'Sin área';
    const macro = f.macroproceso?.trim() || 'Sin macroproceso';
    const claveArea = `${macro}|${area}`;
    if (!porArea.has(claveArea)) porArea.set(claveArea, { ...conteoVacio(), macroproceso: f.macroproceso, area });
    sumar(porArea.get(claveArea)!, est, vencido);

    if (!consolidado.has(claveArea)) {
      consolidado.set(claveArea, {
        ...conteoVacio(), macroproceso: macro, area, codigos: [], acypPendientes: 0, acypCompletadas: 0, acypVencidas: 0,
      });
    }
    const c = consolidado.get(claveArea)!;
    sumar(c, est, vencido);
    c.codigos.push({ id: f.id, codigo: f.codigoTipo || f.codigo });
    if (ac === 'PENDIENTE' || ac === 'SEGUIMIENTO') c.acypPendientes++;
    else if (ac === 'COMPLETADA') c.acypCompletadas++;
    else if (ac === 'VENCIDA') c.acypVencidas++;
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  return {
    safetyClock: { dias: ultimoCritico ? Math.max(0, diasEntre(ultimoCritico, hoy)) : null, desde: ultimoCritico },
    kpis: {
      total: global.total,
      costoTotal: Math.round(costoTotal * 100) / 100,
      porcentajeCierre: porcentajeCierre(global),
      cerrados: global.cerrados,
      baseCierre: global.total - global.desestimados - global.sinEstado,
      abiertos: global.abiertos,
      seguimiento: global.seguimiento,
      vencidos: global.vencidos,
      porVencer,
    },
    matrizEstado: [
      { estatus: 'ABIERTO', cantidad: global.abiertos },
      { estatus: 'EN_SEGUIMIENTO', cantidad: global.seguimiento },
      { estatus: 'CERRADO', cantidad: global.cerrados },
      { estatus: 'DESESTIMADO', cantidad: global.desestimados },
      { estatus: 'SIN_ESTADO', cantidad: global.sinEstado },
    ].map((m) => ({ ...m, porcentaje: pct(m.cantidad, global.total) })),
    acyp: { ...acyp, total: acyp.pendientes + acyp.seguimiento + acyp.completadas + acyp.vencidas },
    porTipo: TIPOS_ORDEN.filter((t) => porTipo.has(t)).map((t) => {
      const c = porTipo.get(t)!;
      return { tipo: t, ...c, porcentaje: pct(c.total, global.total), porcentajeCierre: porcentajeCierre(c) };
    }),
    porArea: [...porArea.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
      .map((c) => ({
        area: c.area,
        macroproceso: c.macroproceso,
        total: c.total,
        porcentaje: pct(c.total, global.total),
        cerrados: c.cerrados,
        abiertos: c.abiertos + c.seguimiento,
        otros: c.desestimados + c.sinEstado,
      })),
    consolidado: [...consolidado.values()]
      .sort((a, b) => a.macroproceso.localeCompare(b.macroproceso, 'es') || a.area.localeCompare(b.area, 'es'))
      .map((c) => ({ ...c, porcentajeCierre: porcentajeCierre(c) })),
  };
}

export type TableroMCC = ReturnType<typeof calcularTablero>;
