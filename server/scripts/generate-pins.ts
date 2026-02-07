/**
 * Script para generar PINs de 4 dígitos a empleados activos que aún no tienen PIN.
 * Los PINs se hashean con bcrypt y se guardan en la base de datos.
 * IMPORTANTE: Guarda los PINs que aparezcan en consola para dárselos a los empleados.
 *
 * Ejecutar desde la carpeta server: npx ts-node scripts/generate-pins.ts
 * Requiere DATABASE_URL en .env (PostgreSQL).
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function generateFourDigitPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

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

  console.log(`Encontrados ${employees.length} empleado(s) sin PIN.\n`);
  console.log('--- PINs generados (guárdalos para dárselos a los empleados) ---\n');

  for (const employee of employees) {
    const pin = generateFourDigitPin();
    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.employee.update({
      where: { id: employee.id },
      data: { pin: hashedPin },
    });

    console.log(`  ${employee.name} (${employee.position}): PIN = ${pin}`);
  }

  console.log('\n--- Fin de la lista ---');
  console.log('\n✅ PINs generados y guardados correctamente.');
  console.log('⚠️  Guarda los PINs de arriba; no se volverán a mostrar en claro.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
