import { BadRequestException } from '@nestjs/common';
import type { MetodologiaCausa } from '@prisma/client';

export const CATEGORIAS_ISHIKAWA = [
  'Personas',
  'Métodos',
  'Materiales',
  'Máquinas / Equipos',
  'Medio ambiente',
  'Medición',
] as const;

/** Normaliza y valida el contenido del análisis según la metodología. */
export function normalizarContenido(metodologia: MetodologiaCausa, contenido: unknown): object {
  const c = (contenido ?? {}) as Record<string, unknown>;

  switch (metodologia) {
    case 'CINCO_PORQUES': {
      const problema = typeof c.problema === 'string' ? c.problema : '';
      const porques = Array.isArray(c.porques)
        ? c.porques
            .slice(0, 10)
            .map((p) => {
              const o = (p ?? {}) as Record<string, unknown>;
              return {
                pregunta: String(o.pregunta ?? '').slice(0, 500),
                respuesta: String(o.respuesta ?? '').slice(0, 1000),
              };
            })
            .filter((p) => p.respuesta.trim())
        : [];
      return { problema, porques };
    }
    case 'ISHIKAWA': {
      const efecto = typeof c.efecto === 'string' ? c.efecto : '';
      const categorias = Array.isArray(c.categorias)
        ? c.categorias.slice(0, 12).map((cat) => {
            const o = (cat ?? {}) as Record<string, unknown>;
            return {
              nombre: String(o.nombre ?? '').slice(0, 60),
              causas: Array.isArray(o.causas)
                ? o.causas.slice(0, 20).map((x) => String(x).slice(0, 400)).filter(Boolean)
                : [],
            };
          })
        : [];
      return { efecto, categorias };
    }
    case 'LLUVIA_CAUSAS': {
      const causas = Array.isArray(c.causas)
        ? c.causas.slice(0, 40).map((x) => {
            const o = (x ?? {}) as Record<string, unknown>;
            return {
              causa: String(o.causa ?? '').slice(0, 500),
              validada: Boolean(o.validada),
              comentario: o.comentario ? String(o.comentario).slice(0, 500) : undefined,
            };
          }).filter((x) => x.causa.trim())
        : [];
      return { causas };
    }
    case 'OTRO':
      return { texto: typeof c.texto === 'string' ? c.texto.slice(0, 6000) : '' };
    default:
      throw new BadRequestException('Metodología no reconocida');
  }
}
