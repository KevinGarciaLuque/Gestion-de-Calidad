import type { DefinicionIndicador, SemaforoMedicion } from './indicadoresApi'

/** Vista previa del cálculo en el cliente (el servidor recalcula al guardar). */
export function calcularVistaPrevia(
  ind: Pick<
    DefinicionIndicador,
    'usaNumeradorDenominador' | 'expresarPorcentaje' | 'sentido' | 'meta' | 'umbralAmarillo'
  >,
  datos: { numerador?: number | null; denominador?: number | null; valor?: number | null },
): { valor: number; semaforo: SemaforoMedicion } | null {
  let valor: number
  if (ind.usaNumeradorDenominador) {
    if (datos.numerador == null || datos.denominador == null || datos.denominador === 0) return null
    valor = datos.numerador / datos.denominador
    if (ind.expresarPorcentaje) valor *= 100
  } else {
    if (datos.valor == null) return null
    valor = datos.valor
  }
  valor = Math.round(valor * 10000) / 10000

  const cumple = ind.sentido === 'CRECIENTE' ? valor >= ind.meta : valor <= ind.meta
  let semaforo: SemaforoMedicion = 'ROJO'
  if (cumple) semaforo = 'VERDE'
  else if (ind.umbralAmarillo != null) {
    const dentro = ind.sentido === 'CRECIENTE' ? valor >= ind.umbralAmarillo : valor <= ind.umbralAmarillo
    semaforo = dentro ? 'AMARILLO' : 'ROJO'
  }
  return { valor, semaforo }
}
