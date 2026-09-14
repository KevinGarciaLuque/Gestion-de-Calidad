import { calcularSemaforo } from './semaforo';

describe('procesos/semaforo', () => {
  it('gris si el proceso está archivado, sin importar lo demás', () => {
    const r = calcularSemaforo({
      archivado: true,
      responsableId: null,
      tieneVersionAprobada: false,
      proximaRevisionAt: null,
    });
    expect(r.estado).toBe('gris');
  });

  it('rojo si no tiene responsable', () => {
    const r = calcularSemaforo({
      archivado: false,
      responsableId: null,
      tieneVersionAprobada: true,
      proximaRevisionAt: null,
    });
    expect(r.estado).toBe('rojo');
    expect(r.motivos).toContain('Sin responsable asignado');
  });

  it('rojo si no tiene ficha aprobada', () => {
    const r = calcularSemaforo({
      archivado: false,
      responsableId: 'u1',
      tieneVersionAprobada: false,
      proximaRevisionAt: null,
    });
    expect(r.estado).toBe('rojo');
    expect(r.motivos).toContain('Sin ficha aprobada');
  });

  it('amarillo si la revisión periódica está vencida', () => {
    const r = calcularSemaforo({
      archivado: false,
      responsableId: 'u1',
      tieneVersionAprobada: true,
      proximaRevisionAt: new Date(Date.now() - 86_400_000),
    });
    expect(r.estado).toBe('amarillo');
  });

  it('verde cuando todo está en orden', () => {
    const r = calcularSemaforo({
      archivado: false,
      responsableId: 'u1',
      tieneVersionAprobada: true,
      proximaRevisionAt: new Date(Date.now() + 86_400_000),
    });
    expect(r.estado).toBe('verde');
    expect(r.motivos).toHaveLength(0);
  });
});
