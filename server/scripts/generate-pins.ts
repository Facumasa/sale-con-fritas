/**
 * Script para asignar PIN por defecto "1234" a empleados activos que aún no tienen PIN.
 * El PIN se hashea con bcrypt y se guarda. Se marca needsPinChange = true para que
 * el empleado deba cambiarlo en el primer fichaje.
 *
 * Ejecutar desde la carpeta server: npx ts-node scripts/generate-pins.ts
 * Requiere DATABASE_URL en .env (PostgreSQL).
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PIN = '1234';

async function main() {
  console.log('🔐 Buscando empleados activos sin PIN...\n');

  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      pin: null,
    },
    orderBy: { name: 'asc' },
  });

  if (employees.length === 0) {
    console.log('No hay empleados activos sin PIN.');
    return;
  }

  console.log(`Encontrados ${employees.length} empleado(s) sin PIN.`);
  console.log(`Se asignará PIN por defecto "${DEFAULT_PIN}" (deben cambiarlo en el primer fichaje).\n`);

  const hashedPin = await bcrypt.hash(DEFAULT_PIN, 10);

  for (const employee of employees) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: { pin: hashedPin, needsPinChange: true },
    });
    console.log(`  ✓ ${employee.name} (${employee.position})`);
  }

  console.log('\n✅ PINs por defecto asignados. Los empleados deberán cambiar el PIN al fichar por primera vez.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
