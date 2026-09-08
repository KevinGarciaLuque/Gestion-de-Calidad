import type { SemaforoMedicion, SentidoIndicador } from '@prisma/client';

export type Tendencia = 'MEJORA' | 'DETERIORO' | 'ESTABLE' | 'SIN_DATO';

interface ParamsIndicador {
  sentido: SentidoIndicador;
  meta: number;
  umbralAmarillo: number | null;
  usaNumeradorDenominador: boolean;
  expresarPorcentaje: boolean;
}

/** Calcula el valor del indicador a partir de numerador/denominador o del valor directo. */
export function calcularValor(
  ind: Pick<ParamsIndicador, 'usaNumeradorDenominador' | 'expresarPorcentaje'>,
  datos: { numerador?: number | null; denominador?: number | null; valor?: number | null },
): number {
  if (ind.usaNumeradorDenominador) {
    const num = datos.numerador ?? 0;
    const den = datos.denominador ?? 0;
    if (den === 0) return 0;
    const ratio = num / den;
    return redondear(ind.expresarPorcentaje ? ratio * 100 : ratio);
  }
  return redondear(datos.valor ?? 0);
}

/** Clasifica el resultado según meta, umbral y sentido. */
export function calcularSemaforo(ind: ParamsIndicador, valor: number): SemaforoMedicion {
  const { sentido, meta, umbralAmarillo } = ind;
  const cumpleMeta = sentido === 'CRECIENTE' ? valor >= meta : valor <= meta;
  if (cumpleMeta) return 'VERDE';
  if (umbralAmarillo == null) return 'ROJO';
  const dentroTolerancia =
    sentido === 'CRECIENTE' ? valor >= umbralAmarillo : valor <= umbralAmarillo;
  return dentroTolerancia ? 'AMARILLO' : 'ROJO';
}

/** Tendencia respecto al periodo anterior. */
export function calcularTendencia(
  sentido: SentidoIndicador,
  actual: number,
  anterior: number | null | undefined,
): Tendencia {
  if (anterior == null) return 'SIN_DATO';
  const delta = actual - anterior;
  const umbral = Math.max(Math.abs(anterior) * 0.01, 0.0001); // 1% o epsilon
  if (Math.abs(delta) < umbral) return 'ESTABLE';
  const mejora = sentido === 'CRECIENTE' ? delta > 0 : delta < 0;
  return mejora ? 'MEJORA' : 'DETERIORO';
}

function redondear(n: number): number {
  return Math.round(n * 10000) / 10000;
}
