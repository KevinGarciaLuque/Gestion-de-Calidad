import { createHash, randomBytes } from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

/** Hashea una contraseña (argon2id). */
export function hashPassword(plano: string): Promise<string> {
  return argonHash(plano);
}

/** Verifica una contraseña contra su hash. Nunca lanza. */
export async function verifyPassword(hashGuardado: string, plano: string): Promise<boolean> {
  try {
    return await argonVerify(hashGuardado, plano);
  } catch {
    return false;
  }
}

/** Genera un refresh token opaco de alta entropía. */
export function generarTokenOpaco(): string {
  return randomBytes(48).toString('base64url');
}

/** Hash determinista (SHA-256) para poder buscar el refresh token por valor. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
