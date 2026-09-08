/**
 * Semilla de datos iniciales.
 *  - Catálogo de permisos y roles (Fase 1).
 *  - Unidad raíz de la organización (Hospital).
 *  - Usuario Super Administrador con rol SUPER_ADMIN y alcance global.
 * Es idempotente: se puede ejecutar varias veces sin duplicar.
 */
import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import {
  PERMISOS,
  ROL,
  ROLES,
  ROL_PERMISOS,
} from '../src/auth/rbac/permisos.catalog';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 1. Permisos
  for (const p of PERMISOS) {
    await prisma.permiso.upsert({
      where: { codigo: p.codigo },
      create: p,
      update: { modulo: p.modulo, descripcion: p.descripcion },
    });
  }
  console.log(`✓ ${PERMISOS.length} permisos`);

  // 2. Roles
  for (const r of ROLES) {
    await prisma.rol.upsert({
      where: { codigo: r.codigo },
      create: r,
      update: { nombre: r.nombre, descripcion: r.descripcion, esSistema: r.esSistema, orden: r.orden },
    });
  }
  console.log(`✓ ${ROLES.length} roles`);

  // 3. Rol → permisos
  const todos = PERMISOS.map((p) => p.codigo);
  const asignaciones: Record<string, string[]> = {
    [ROL.SUPER_ADMIN]: todos,
    ...ROL_PERMISOS,
  };
  for (const [rolCodigo, permisos] of Object.entries(asignaciones)) {
    await prisma.rolPermiso.deleteMany({ where: { rolCodigo } });
    await prisma.rolPermiso.createMany({
      data: permisos.map((permisoCodigo) => ({ rolCodigo, permisoCodigo })),
    });
  }
  console.log('✓ permisos asignados a roles');

  // 4. Unidad raíz
  const hospital = await prisma.unidadOrganizativa.upsert({
    where: { codigo: 'HOSP-01' },
    create: { codigo: 'HOSP-01', nombre: 'Hospital', tipo: 'HOSPITAL', orden: 0 },
    update: {},
  });

  // 5. Super Administrador
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@calidad360.local';
  const nombre = process.env.SEED_ADMIN_NOMBRE ?? 'Super Administrador';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin.123456';

  let admin = await prisma.usuario.findUnique({ where: { email } });
  if (!admin) {
    admin = await prisma.usuario.create({
      data: { email, nombre, passwordHash: await hash(password), activo: true },
    });
    console.log(`✓ Super Administrador creado: ${email} / ${password}`);
  } else {
    console.log(`✓ Super Administrador ya existe: ${email}`);
  }

  const yaTiene = await prisma.usuarioRol.findFirst({
    where: { usuarioId: admin.id, rolCodigo: ROL.SUPER_ADMIN, tipoAlcance: 'GLOBAL' },
  });
  if (!yaTiene) {
    await prisma.usuarioRol.create({
      data: { usuarioId: admin.id, rolCodigo: ROL.SUPER_ADMIN, tipoAlcance: 'GLOBAL' },
    });
    console.log('✓ rol SUPER_ADMIN (global) asignado al Super Administrador');
  }

  console.log(`\nOrganización raíz: ${hospital.nombre} (${hospital.codigo})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
