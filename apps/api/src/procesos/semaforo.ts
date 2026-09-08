export type EstadoSemaforo = 'verde' | 'amarillo' | 'rojo' | 'gris';

export interface Semaforo {
  estado: EstadoSemaforo;
  motivos: string[];
}

interface EntradaSemaforo {
  archivado: boolean;
  responsableId: string | null;
  tieneVersionAprobada: boolean;
  proximaRevisionAt: Date | null;
}

/**
 * Semáforo del proceso para el mapa. En la Fase 9 (motor de automatizaciones)
 * se sumarán señales de riesgos críticos y acciones vencidas.
 */
export function calcularSemaforo(p: EntradaSemaforo): Semaforo {
  if (p.archivado) return { estado: 'gris', motivos: ['Proceso archivado'] };

  const motivos: string[] = [];
  if (!p.responsableId) motivos.push('Sin responsable asignado');
  if (!p.tieneVersionAprobada) motivos.push('Sin ficha aprobada');
  if (motivos.length > 0) return { estado: 'rojo', motivos };

  if (p.proximaRevisionAt && p.proximaRevisionAt.getTime() < Date.now()) {
    return { estado: 'amarillo', motivos: ['Revisión periódica vencida'] };
  }
  return { estado: 'verde', motivos: [] };
}
