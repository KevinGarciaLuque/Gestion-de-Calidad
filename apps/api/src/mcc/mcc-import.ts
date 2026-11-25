/**
 * Importación del histórico del Control MCC (hoja de Google Sheets exportada a CSV).
 *
 * Las columnas se reconocen por su encabezado (sin importar mayúsculas, tildes,
 * signos ni espacios), así que el CSV puede traer las columnas en cualquier orden
 * y con columnas extra: las que no se reconocen se ignoran y se informan.
 */
import type { EstadoMCC, FasePHVA, TipoRegistroMCC } from '@prisma/client';
import { estadoDesdeEstatus, type EstatusControl } from './mcc-control';

// ── CSV ─────────────────────────────────────────────────────────────────────

/** Parser CSV (RFC 4180): comillas, comillas escapadas y saltos de línea dentro de campos. */
export function parseCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, '');
  const primera = t.split(/\r?\n/, 1)[0] ?? '';
  const cuenta = (c: string) => primera.split(c).length - 1;
  const sep = [';', '\t', ','].reduce((a, b) => (cuenta(b) > cuenta(a) ? b : a), ',');

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++; } else comillas = false;
      } else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.some((v) => v.trim() !== ''));
}

export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ── Columnas reconocidas ────────────────────────────────────────────────────

const COLUMNAS = {
  codigo: ['ID', 'ID MCC', 'Correlativo', 'ID Registro', 'N° MCC', 'Código MCC'],
  tipoRegistro: ['Tipo de Registro', 'Tipo Registro', 'Tipo'],
  codigoTipo: ['Código', 'Codigo NC', 'Código del Hallazgo'],
  gestorCalidad: ['Gestor de Calidad', 'Gestor'],
  fechaRecepcion: ['Fecha y Hora de Recepción', 'Fecha de Recepción', 'Fecha Recepción', 'Fecha de Registro', 'Fecha Registro', 'Fecha', 'Marca temporal'],
  usuarioEncuentra: ['Usuario que Encuentra', 'Usuario', 'Reportado por'],
  areaReporta: ['Área que Reporta'],
  fuente: ['Fuente'],
  fuenteSecundaria: ['Fuente Secundaria'],
  numeroExpediente: ['N° Expediente', 'No Expediente', 'Número de Expediente', 'Expediente'],
  turno: ['Turno'],
  problemaPrincipal: ['¿Cuál es el Problema Principal?', 'Problema Principal', 'Problema'],
  descripcion: ['Descripción del Hallazgo', 'Descripción', 'Hallazgo'],
  macroproceso: ['Macroproceso / Parte Interesada', 'Macroproceso'],
  areaResponsable: ['Área o Servicio Responsable', 'Área Responsable', 'Servicio Responsable', 'Área Vinculada', 'Área'],
  procesoAfectado: ['Proceso Afectado'],
  subproceso: ['Subproceso'],
  procedimiento: ['Procedimiento'],
  subrogado: ['Subrogado'],
  impacto: ['Impacto'],
  dondeImpacto: ['¿Dónde Impactó?', 'Dónde Impactó'],
  causaRaiz: ['Causa-Raíz', 'Causa Raíz'],
  porque1: ['¿Por qué #1?', 'Por qué 1'],
  porque2: ['¿Por qué #2?', 'Por qué 2'],
  porque3: ['¿Por qué #3?', 'Por qué 3'],
  porque4: ['¿Por qué #4?', 'Por qué 4'],
  porque5: ['¿Por qué #5?', 'Por qué 5'],
  requiereAcyp: ['¿Requiere ACyP?', 'Requiere ACyP'],
  acypCodigo: ['ID ACyP', 'Código ACyP', 'ACyP'],
  compromisosAdquiridos: ['Comp. Adq.', 'Compromisos Adquiridos'],
  compromisosCumplidos: ['Comp. Cump.', 'Compromisos Cumplidos'],
  escalamiento: ['Escalamiento'],
  tieneCostos: ['¿Costos?', 'Costos'],
  costoCalidad: ['Costo (L)', 'Costo L', 'Costo', 'Costo de Calidad', 'Costo Lempiras'],
  phva: ['PHVA'],
  logros: ['Logros Obtenidos', 'Logros'],
  leanDefecto: ['LEAN · Defecto', 'Lean Defecto', 'Defecto'],
  leanRetrabajo: ['LEAN · Retrabajo', 'Lean Retrabajo', 'Retrabajo'],
  leanEspera: ['LEAN · Espera', 'Lean Espera', 'Espera'],
  leanMovimiento: ['LEAN · Movimiento', 'Lean Movimiento', 'Movimiento'],
  responsableNombre: ['Responsable'],
  fechaNotificacion: ['Fecha Notificación', 'Fecha de Notificación'],
  fechaCompromisoRespuesta: ['Fecha Comp. Respuesta', 'Fecha Compromiso Respuesta', 'Fecha Compromiso de Respuesta'],
  fechaLimite: ['Fecha Límite / Cierre Máx.', 'Fecha Límite', 'Fecha Cierre Máx', 'Fecha Máxima de Cierre'],
  fechaCierre: ['Fecha Cierre Real', 'Fecha de Cierre', 'Fecha Cierre'],
  estatus: ['Estatus de Cierre', 'Estatus', 'Estado', 'Estado de Cierre'],
  validacionCalidad: ['Validación Calidad', 'Validación de Calidad'],
  notaEvidencia: ['Nota de Evidencia', 'Nota Evidencia'],
  evidenciaUrl: ['Evidencia', 'Link Evidencia', 'URL Evidencia', 'Adjunto', 'Evidencia Drive'],
} as const;

export type CampoCsv = keyof typeof COLUMNAS;

const ALIAS = new Map<string, CampoCsv>();
for (const [campo, alias] of Object.entries(COLUMNAS) as [CampoCsv, readonly string[]][]) {
  for (const a of alias) if (!ALIAS.has(normalizar(a))) ALIAS.set(normalizar(a), campo);
}

export function mapearEncabezados(enc: string[]) {
  const indice = new Map<CampoCsv, number>();
  const ignoradas: string[] = [];
  enc.forEach((h, i) => {
    const campo = ALIAS.get(normalizar(h));
    if (campo && !indice.has(campo)) indice.set(campo, i);
    else if (h.trim()) ignoradas.push(h.trim());
  });
  return { indice, reconocidas: [...indice.keys()], ignoradas };
}

// ── Conversión de valores ───────────────────────────────────────────────────

const VACIO = /^(|-+|n\/?a|no aplica|sin dato|null|undefined)$/i;
const esVacio = (v: string | undefined) => v === undefined || VACIO.test(v.trim());

export function aTipo(v: string | undefined): TipoRegistroMCC | null {
  if (esVacio(v)) return null;
  const n = normalizar(v!);
  if (n.includes('salida')) return 'SALIDA_NO_CONFORME';
  if (n.includes('entrada')) return 'ENTRADA_NO_CONFORME';
  if (n.includes('noconform') || n === 'nc') return 'NO_CONFORMIDAD';
  if (n.includes('queja') || n.includes('reclamo')) return 'QUEJA';
  if (n.includes('felicit')) return 'FELICITACION';
  if (n.includes('sugeren')) return 'SUGERENCIA';
  return 'OTRO';
}

export function aEstatus(v: string | undefined): EstatusControl {
  if (esVacio(v)) return 'SIN_ESTADO';
  const n = normalizar(v!);
  if (n.includes('cerrad')) return 'CERRADO';
  if (n.includes('desestim') || n.includes('rechaz') || n.includes('anulad')) return 'DESESTIMADO';
  if (n.includes('seguim') || n.includes('proceso') || n.includes('ejecuc')) return 'EN_SEGUIMIENTO';
  if (n.includes('abiert') || n.includes('pendiente')) return 'ABIERTO';
  return 'SIN_ESTADO';
}

export function aPhva(v: string | undefined): FasePHVA | null {
  if (esVacio(v)) return null;
  const n = normalizar(v!);
  if (n.startsWith('plan')) return 'PLANIFICAR';
  if (n.startsWith('hac')) return 'HACER';
  if (n.startsWith('verif')) return 'VERIFICAR';
  if (n.startsWith('act')) return 'ACTUAR';
  return null;
}

export const aBool = (v: string | undefined) => !esVacio(v) && /^(si|s|yes|true|1|x)$/.test(normalizar(v!));

/** Número en formato local: "L. 1,234.50", "1.234,50", "1234". */
export function aNumero(v: string | undefined): number | null {
  if (esVacio(v)) return null;
  let s = v!.trim().replace(/^[^\d-]+/, '').replace(/[^0-9,.-]/g, ''); // quita "L. ", "Lps", etc.
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Fecha "dd/mm/aaaa [hh:mm[:ss]]", "aaaa-mm-dd[ hh:mm]" o número de serie de hoja de cálculo. */
export function aFecha(v: string | undefined): Date | null | 'invalida' {
  if (esVacio(v)) return null;
  const s = v!.trim();
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
    }
  }
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return armar(+m[1], +m[2], +m[3], m[4], m[5], m[6]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?\s?m\.?)?)?/i);
  if (m) {
    let [d, mes] = [+m[1], +m[2]];
    if (mes > 12 && d <= 12) [d, mes] = [mes, d]; // venía como mm/dd
    let anio = +m[3];
    if (anio < 100) anio += 2000;
    let hora = m[4];
    if (hora && m[7]) {
      const h = +hora % 12;
      hora = String(/p/i.test(m[7]) ? h + 12 : h);
    }
    return armar(anio, mes, d, hora, m[5], m[6]);
  }
  return 'invalida';
}

function armar(a: number, mes: number, d: number, h?: string, mi?: string, se?: string): Date | 'invalida' {
  if (mes < 1 || mes > 12 || d < 1 || d > 31 || a < 1990 || a > 2100) return 'invalida';
  const f = new Date(a, mes - 1, d, h ? +h : 0, mi ? +mi : 0, se ? +se : 0);
  return f.getMonth() === mes - 1 ? f : 'invalida';
}

// ── Fila → registro ─────────────────────────────────────────────────────────

const corto = (v: string | undefined, max = 191) => (esVacio(v) ? null : v!.trim().slice(0, max));
const largo = (v: string | undefined) => (esVacio(v) ? null : v!.trim());

export interface RegistroImportado {
  fila: number; // número de línea en el CSV (1 = encabezados)
  codigo: string | null;
  estado: EstadoMCC;
  estatus: EstatusControl;
  datos: {
    tipoRegistro: TipoRegistroMCC | null;
    codigoTipo: string | null;
    titulo: string;
    descripcion: string;
    gestorCalidad: string | null;
    fechaRecepcion: Date | null;
    usuarioEncuentra: string | null;
    areaReporta: string | null;
    fuente: string | null;
    fuenteSecundaria: string | null;
    numeroExpediente: string | null;
    turno: string | null;
    macroproceso: string | null;
    areaResponsable: string | null;
    procesoAfectado: string | null;
    subproceso: string | null;
    procedimiento: string | null;
    subrogado: string | null;
    impacto: string | null;
    dondeImpacto: string | null;
    causaRaiz: string | null;
    porques: string[] | null;
    requiereAcyp: boolean;
    acypCodigo: string | null;
    compromisosAdquiridos: number | null;
    compromisosCumplidos: number | null;
    escalamiento: string | null;
    tieneCostos: boolean;
    costoCalidad: number | null;
    phva: FasePHVA | null;
    logros: string | null;
    leanDefecto: string | null;
    leanRetrabajo: string | null;
    leanEspera: string | null;
    leanMovimiento: string | null;
    responsableNombre: string | null;
    fechaNotificacion: Date | null;
    fechaCompromisoRespuesta: Date | null;
    fechaLimite: Date | null;
    fechaCierre: Date | null;
    validacionCalidad: string | null;
    notaEvidencia: string | null;
  };
  advertencias: string[];
}

export function interpretarFila(celdas: string[], indice: Map<CampoCsv, number>, fila: number): RegistroImportado | { fila: number; error: string } {
  const v = (c: CampoCsv) => {
    const i = indice.get(c);
    return i === undefined ? undefined : celdas[i];
  };
  const advertencias: string[] = [];
  const fecha = (c: CampoCsv, etiqueta: string) => {
    const r = aFecha(v(c));
    if (r === 'invalida') {
      advertencias.push(`${etiqueta} "${v(c)}" no es una fecha válida; se dejó vacía`);
      return null;
    }
    return r;
  };
  const entero = (c: CampoCsv) => {
    const n = aNumero(v(c));
    return n === null ? null : Math.round(n);
  };

  const problema = corto(v('problemaPrincipal'), 191);
  const descripcion = largo(v('descripcion')) ?? problema;
  if (!descripcion) return { fila, error: 'La fila no tiene descripción ni problema principal' };

  const tipoRegistro = aTipo(v('tipoRegistro'));
  const estatus = aEstatus(v('estatus'));
  const porques = (['porque1', 'porque2', 'porque3', 'porque4', 'porque5'] as const).map((c) => largo(v(c)) ?? '');
  const costo = aNumero(v('costoCalidad'));
  const evidencia = largo(v('evidenciaUrl'));
  const nota = largo(v('notaEvidencia'));
  const codigoTipo = corto(v('codigoTipo'), 60);
  const idHoja = corto(v('codigo'), 60);

  return {
    fila,
    codigo: idHoja ? idHoja.toUpperCase() : codigoTipo ? `MCC-${codigoTipo.toUpperCase()}` : null,
    estatus,
    estado: estadoDesdeEstatus(estatus),
    advertencias,
    datos: {
      tipoRegistro,
      codigoTipo: codigoTipo && !/^s\/?c$/i.test(codigoTipo) ? codigoTipo.toUpperCase() : null,
      titulo: (problema ?? descripcion).slice(0, 191),
      descripcion,
      gestorCalidad: corto(v('gestorCalidad')),
      fechaRecepcion: fecha('fechaRecepcion', 'Fecha de recepción'),
      usuarioEncuentra: corto(v('usuarioEncuentra')),
      areaReporta: corto(v('areaReporta')),
      fuente: corto(v('fuente')),
      fuenteSecundaria: corto(v('fuenteSecundaria')),
      numeroExpediente: corto(v('numeroExpediente')),
      turno: corto(v('turno'), 30),
      macroproceso: corto(v('macroproceso'))?.toUpperCase() ?? null,
      areaResponsable: corto(v('areaResponsable'))?.toUpperCase() ?? null,
      procesoAfectado: corto(v('procesoAfectado')),
      subproceso: corto(v('subproceso')),
      procedimiento: corto(v('procedimiento')),
      subrogado: corto(v('subrogado')),
      impacto: corto(v('impacto'), 60),
      dondeImpacto: corto(v('dondeImpacto')),
      causaRaiz: largo(v('causaRaiz')),
      porques: porques.some(Boolean) ? porques : null,
      requiereAcyp: aBool(v('requiereAcyp')) || !esVacio(v('acypCodigo')),
      acypCodigo: corto(v('acypCodigo'), 60),
      compromisosAdquiridos: entero('compromisosAdquiridos'),
      compromisosCumplidos: entero('compromisosCumplidos'),
      escalamiento: corto(v('escalamiento')),
      tieneCostos: aBool(v('tieneCostos')) || (costo ?? 0) > 0,
      costoCalidad: costo,
      phva: aPhva(v('phva')),
      logros: largo(v('logros')),
      leanDefecto: corto(v('leanDefecto')),
      leanRetrabajo: corto(v('leanRetrabajo')),
      leanEspera: corto(v('leanEspera')),
      leanMovimiento: corto(v('leanMovimiento')),
      responsableNombre: corto(v('responsableNombre')),
      fechaNotificacion: fecha('fechaNotificacion', 'Fecha de notificación'),
      fechaCompromisoRespuesta: fecha('fechaCompromisoRespuesta', 'Fecha compromiso de respuesta'),
      fechaLimite: fecha('fechaLimite', 'Fecha límite'),
      fechaCierre: fecha('fechaCierre', 'Fecha de cierre real'),
      validacionCalidad: corto(v('validacionCalidad'), 60),
      notaEvidencia: [nota, evidencia].filter(Boolean).join('\n') || null,
    },
  };
}
