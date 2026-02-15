/**
 * Script para actualizar empleados existentes sin PIN: asignar "1234" (hasheado)
 * y marcar needsPinChange = true.
 *
 * Ejecutar desde la carpeta server: npx ts-node scripts/update-existing-pins.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PIN = '1234';

async function main() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true, pin: null },
    orderBy: { name: 'asc' },
  });

  if (employees.length === 0) {
    console.log('No hay empleados activos sin PIN.');
    return;
  }

  console.log(`Actualizando ${employees.length} empleado(s) sin PIN a PIN por defecto "${DEFAULT_PIN}"...`);
  const hashedPin = await bcrypt.hash(DEFAULT_PIN, 10);

  for (const emp of employees) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: { pin: hashedPin, needsPinChange: true },
    });
    console.log(`  ✓ ${emp.name}`);
  }

  console.log('\n✅ Listo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
