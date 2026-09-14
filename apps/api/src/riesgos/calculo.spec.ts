import { categoriaDe, nivelDe, requiereTratamientoFormal, type Umbrales } from './calculo';

const umbrales: Umbrales = { umbralMedio: 5, umbralAlto: 10, umbralCritico: 15 };

describe('riesgos/calculo', () => {
  it('nivelDe multiplica probabilidad por impacto', () => {
    expect(nivelDe(3, 5)).toBe(15);
    expect(nivelDe(1, 1)).toBe(1);
  });

  it('categoriaDe clasifica según los umbrales configurados', () => {
    expect(categoriaDe(4, umbrales)).toBe('BAJO');
    expect(categoriaDe(5, umbrales)).toBe('MEDIO');
    expect(categoriaDe(9, umbrales)).toBe('MEDIO');
    expect(categoriaDe(10, umbrales)).toBe('ALTO');
    expect(categoriaDe(14, umbrales)).toBe('ALTO');
    expect(categoriaDe(15, umbrales)).toBe('CRITICO');
    expect(categoriaDe(25, umbrales)).toBe('CRITICO');
  });

  it('categoriaDe respeta umbrales configurados distintos de los de fábrica', () => {
    const laxos: Umbrales = { umbralMedio: 8, umbralAlto: 16, umbralCritico: 24 };
    expect(categoriaDe(15, laxos)).toBe('MEDIO');
    expect(categoriaDe(24, laxos)).toBe('CRITICO');
  });

  it('requiereTratamientoFormal es true solo para ALTO y CRITICO', () => {
    expect(requiereTratamientoFormal('BAJO')).toBe(false);
    expect(requiereTratamientoFormal('MEDIO')).toBe(false);
    expect(requiereTratamientoFormal('ALTO')).toBe(true);
    expect(requiereTratamientoFormal('CRITICO')).toBe(true);
  });
});
