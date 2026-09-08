/**
 * Semilla de datos iniciales.
 * Fase 0: crea el usuario Super Administrador si no existe.
 * (Fase 1 añadirá roles, permisos y alcance.)
 */
import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@calidad360.local';
  const nombre = process.env.SEED_ADMIN_NOMBRE ?? 'Super Administrador';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin.123456';

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`✓ El usuario ${email} ya existe, no se modifica.`);
    return;
  }

  const passwordHash = await hash(password);
  await prisma.usuario.create({
    data: { email, nombre, passwordHash, activo: true },
  });

  console.log(`✓ Super Administrador creado: ${email} / ${password}`);
  console.log('  Cambia la contraseña después del primer inicio de sesión.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
