import { randomInt } from 'node:crypto';

const MAYUS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUS = 'abcdefghijkmnpqrstuvwxyz';
const NUM = '23456789';
const SIMB = '@#$%&*';
const TODOS = MAYUS + MINUS + NUM + SIMB;

/** Genera una contraseña temporal legible que cumple la política de complejidad. */
export function generarPasswordTemporal(longitud = 12): string {
  const base = [
    MAYUS[randomInt(MAYUS.length)],
    MINUS[randomInt(MINUS.length)],
    NUM[randomInt(NUM.length)],
    SIMB[randomInt(SIMB.length)],
  ];
  while (base.length < longitud) base.push(TODOS[randomInt(TODOS.length)]);
  // Mezcla (Fisher-Yates)
  for (let i = base.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join('');
}
