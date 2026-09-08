export interface NivelEscala {
  valor: number;
  etiqueta: string;
  descripcion?: string;
}

export const ESCALA_PROBABILIDAD_DEFAULT: NivelEscala[] = [
  { valor: 1, etiqueta: 'Raro', descripcion: 'Puede ocurrir solo en circunstancias excepcionales' },
  { valor: 2, etiqueta: 'Improbable', descripcion: 'Podría ocurrir en algún momento' },
  { valor: 3, etiqueta: 'Posible', descripcion: 'Podría ocurrir varias veces al año' },
  { valor: 4, etiqueta: 'Probable', descripcion: 'Ocurre con frecuencia' },
  { valor: 5, etiqueta: 'Casi seguro', descripcion: 'Se espera que ocurra en la mayoría de los casos' },
];

export const ESCALA_IMPACTO_DEFAULT: NivelEscala[] = [
  { valor: 1, etiqueta: 'Insignificante', descripcion: 'Sin efecto apreciable' },
  { valor: 2, etiqueta: 'Menor', descripcion: 'Efecto leve, manejable en el proceso' },
  { valor: 3, etiqueta: 'Moderado', descripcion: 'Afecta objetivos del proceso' },
  { valor: 4, etiqueta: 'Mayor', descripcion: 'Afecta la seguridad del paciente o el servicio' },
  { valor: 5, etiqueta: 'Catastrófico', descripcion: 'Evento centinela / daño grave o institucional' },
];

export const MATRIZ_DEFAULT = {
  escalaProbabilidad: ESCALA_PROBABILIDAD_DEFAULT,
  escalaImpacto: ESCALA_IMPACTO_DEFAULT,
  umbralMedio: 5,
  umbralAlto: 10,
  umbralCritico: 15,
  mesesRevisionDefault: 12,
};
