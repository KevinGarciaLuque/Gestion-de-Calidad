import type { FrecuenciaIndicador } from '@prisma/client';

export const PERIODOS_POR_ANIO: Record<FrecuenciaIndicador, number> = {
  MENSUAL: 12,
  BIMESTRAL: 6,
  TRIMESTRAL: 4,
  SEMESTRAL: 2,
  ANUAL: 1,
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Etiqueta legible del periodo (1-based). */
export function etiquetaPeriodo(
  frecuencia: FrecuenciaIndicador,
  anio: number,
  periodo: number,
): string {
  switch (frecuencia) {
    case 'MENSUAL':
      return `${cap(MESES[periodo - 1])} ${anio}`;
    case 'BIMESTRAL': {
      const ini = MESES[(periodo - 1) * 2];
      const fin = MESES[(periodo - 1) * 2 + 1];
      return `${cap(ini)}–${cap(fin)} ${anio}`;
    }
    case 'TRIMESTRAL':
      return `${periodo}.º trimestre ${anio}`;
    case 'SEMESTRAL':
      return `${periodo}.º semestre ${anio}`;
    case 'ANUAL':
      return `Año ${anio}`;
  }
}

/** Periodo vigente según la fecha dada. */
export function periodoActual(
  frecuencia: FrecuenciaIndicador,
  fecha = new Date(),
): { anio: number; periodo: number } {
  const anio = fecha.getFullYear();
  const mes0 = fecha.getMonth(); // 0-based
  const n = PERIODOS_POR_ANIO[frecuencia];
  const largoMeses = 12 / n;
  return { anio, periodo: Math.floor(mes0 / largoMeses) + 1 };
}

/** Compara dos periodos (mismo indicador). <0 si a es anterior a b. */
export function comparaPeriodo(
  a: { anio: number; periodo: number },
  b: { anio: number; periodo: number },
): number {
  return a.anio - b.anio || a.periodo - b.periodo;
}

/** Lista de periodos transcurridos desde inicioAnio hasta hoy (incluido el actual). */
export function periodosHasta(
  frecuencia: FrecuenciaIndicador,
  desdeAnio: number,
  hasta = new Date(),
): { anio: number; periodo: number }[] {
  const salida: { anio: number; periodo: number }[] = [];
  const actual = periodoActual(frecuencia, hasta);
  const n = PERIODOS_POR_ANIO[frecuencia];
  for (let anio = desdeAnio; anio <= actual.anio; anio++) {
    const max = anio === actual.anio ? actual.periodo : n;
    for (let p = 1; p <= max; p++) salida.push({ anio, periodo: p });
  }
  return salida;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
