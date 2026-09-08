import type { CategoriaRiesgo } from '@prisma/client';

export interface Umbrales {
  umbralMedio: number;
  umbralAlto: number;
  umbralCritico: number;
}

export function nivelDe(probabilidad: number, impacto: number): number {
  return probabilidad * impacto;
}

export function categoriaDe(nivel: number, u: Umbrales): CategoriaRiesgo {
  if (nivel >= u.umbralCritico) return 'CRITICO';
  if (nivel >= u.umbralAlto) return 'ALTO';
  if (nivel >= u.umbralMedio) return 'MEDIO';
  return 'BAJO';
}

/** Riesgos de categoría ALTO o CRITICO exigen responsable y plan de tratamiento. */
export function requiereTratamientoFormal(categoria: CategoriaRiesgo): boolean {
  return categoria === 'ALTO' || categoria === 'CRITICO';
}
