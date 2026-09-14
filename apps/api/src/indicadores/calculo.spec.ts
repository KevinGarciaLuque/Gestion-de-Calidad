import { calcularSemaforo, calcularTendencia, calcularValor } from './calculo';

describe('indicadores/calculo', () => {
  describe('calcularValor', () => {
    it('calcula el porcentaje numerador/denominador', () => {
      expect(calcularValor({ usaNumeradorDenominador: true, expresarPorcentaje: true }, { numerador: 90, denominador: 100 })).toBe(90);
    });

    it('devuelve 0 si el denominador es 0 (evita división entre cero)', () => {
      expect(calcularValor({ usaNumeradorDenominador: true, expresarPorcentaje: true }, { numerador: 5, denominador: 0 })).toBe(0);
    });

    it('respeta el valor directo cuando no usa numerador/denominador', () => {
      expect(calcularValor({ usaNumeradorDenominador: false, expresarPorcentaje: false }, { valor: 42 })).toBe(42);
    });

    it('sin expresarPorcentaje devuelve la razón, no el porcentaje', () => {
      expect(calcularValor({ usaNumeradorDenominador: true, expresarPorcentaje: false }, { numerador: 1, denominador: 4 })).toBe(0.25);
    });
  });

  describe('calcularSemaforo', () => {
    const base = { meta: 90, umbralAmarillo: 80 as number | null };

    it('VERDE cuando cumple la meta (creciente)', () => {
      expect(calcularSemaforo({ ...base, sentido: 'CRECIENTE' }, 95)).toBe('VERDE');
      expect(calcularSemaforo({ ...base, sentido: 'CRECIENTE' }, 90)).toBe('VERDE');
    });

    it('AMARILLO dentro del umbral de tolerancia', () => {
      expect(calcularSemaforo({ ...base, sentido: 'CRECIENTE' }, 85)).toBe('AMARILLO');
    });

    it('ROJO fuera del umbral', () => {
      expect(calcularSemaforo({ ...base, sentido: 'CRECIENTE' }, 70)).toBe('ROJO');
    });

    it('ROJO directo si no hay umbral amarillo configurado', () => {
      expect(calcularSemaforo({ meta: 90, umbralAmarillo: null, sentido: 'CRECIENTE' }, 85)).toBe('ROJO');
    });

    it('en sentido decreciente, un valor más bajo es mejor', () => {
      const decreciente = { meta: 2, umbralAmarillo: 3, sentido: 'DECRECIENTE' as const };
      expect(calcularSemaforo(decreciente, 1)).toBe('VERDE');
      expect(calcularSemaforo(decreciente, 2.5)).toBe('AMARILLO');
      expect(calcularSemaforo(decreciente, 5)).toBe('ROJO');
    });
  });

  describe('calcularTendencia', () => {
    it('SIN_DATO cuando no hay periodo anterior', () => {
      expect(calcularTendencia('CRECIENTE', 50, null)).toBe('SIN_DATO');
      expect(calcularTendencia('CRECIENTE', 50, undefined)).toBe('SIN_DATO');
    });

    it('ESTABLE con variación menor al 1%', () => {
      expect(calcularTendencia('CRECIENTE', 100.5, 100)).toBe('ESTABLE');
    });

    it('MEJORA cuando sube y el sentido es creciente', () => {
      expect(calcularTendencia('CRECIENTE', 110, 100)).toBe('MEJORA');
    });

    it('DETERIORO cuando sube pero el sentido es decreciente', () => {
      expect(calcularTendencia('DECRECIENTE', 110, 100)).toBe('DETERIORO');
    });

    it('MEJORA cuando baja y el sentido es decreciente', () => {
      expect(calcularTendencia('DECRECIENTE', 90, 100)).toBe('MEJORA');
    });
  });
});
