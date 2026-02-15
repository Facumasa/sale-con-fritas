import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');

    // 1. Usuario OWNER
    console.log('👤 Creando usuario owner...');
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const owner = await prisma.user.create({
      data: {
        email: 'admin@demo.com',
        password: hashedPassword,
        name: 'Admin Demo',
        role: 'OWNER',
      },
    });
    console.log('✅ Usuario owner creado:', owner.email);

    // 2. Restaurante
    console.log('📦 Creando restaurante...');
    const restaurant = await prisma.restaurant.create({
      data: {
        name: 'Restaurante Demo',
        address: 'Calle Gran Vía 123, Madrid',
        ownerId: owner.id,
      },
    });
    console.log('✅ Restaurante creado:', restaurant.name);

    await prisma.user.update({
      where: { id: owner.id },
      data: { restaurantId: restaurant.id },
    });

    // 3. Suscripción (necesaria para la app)
    const today = new Date();
    const trialEnd = new Date(today);
    trialEnd.setDate(today.getDate() + 14);
    await prisma.subscription.create({
      data: {
        restaurantId: restaurant.id,
        plan: 'BASICO',
        status: 'TRIALING',
        currentPeriodStart: today,
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
      },
    });

    // 4. Empleados (PIN por defecto 1234, deben cambiarlo en primer fichaje)
    console.log('👥 Creando empleados...');
    const defaultPinHash = await bcrypt.hash('1234', 10);
    const maria = await prisma.employee.create({
      data: {
        restaurantId: restaurant.id,
        name: 'María García',
        position: 'Camarera',
        hourlyRate: 12.5,
        color: '#ef4444',
        isActive: true,
        pin: defaultPinHash,
        needsPinChange: true,
      },
    });
    const juan = await prisma.employee.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Juan Martínez',
        position: 'Cocinero',
        hourlyRate: 15,
        color: '#3b82f6',
        isActive: true,
        pin: defaultPinHash,
        needsPinChange: true,
      },
    });
    const ana = await prisma.employee.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Ana López',
        position: 'Ayudante',
        hourlyRate: 11,
        color: '#10b981',
        isActive: true,
        pin: defaultPinHash,
        needsPinChange: true,
      },
    });
    const employees = [maria, juan, ana];
    console.log('✅ Empleados creados:', employees.length);

    // 5. Turnos: hoy + próximos 3 días. María 09-17, Juan 10-18, Ana 15-22
    console.log('📅 Creando turnos (hoy + 3 días)...');
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const shiftConfig = [
      { employee: maria, startTime: '09:00', endTime: '17:00', type: 'MORNING' },
      { employee: juan, startTime: '10:00', endTime: '18:00', type: 'MORNING' },
      { employee: ana, startTime: '15:00', endTime: '22:00', type: 'AFTERNOON' },
    ];

    for (let day = 0; day < 4; day++) {
      const date = new Date(startOfToday);
      date.setDate(startOfToday.getDate() + day);

      for (const { employee, startTime, endTime, type } of shiftConfig) {
        await prisma.shift.create({
          data: {
            employeeId: employee.id,
            restaurantId: restaurant.id,
            date,
            startTime,
            endTime,
            type,
          },
        });
      }
    }
    console.log('✅ Turnos creados: 4 días × 3 empleados = 12');

    // 6. ToolAccess: habilitar FICHAJE
    console.log('🛠️ Configurando accesos a herramientas...');
    const tools = [
      { toolName: 'HORARIOS', isEnabled: true },
      { toolName: 'INVENTARIO', isEnabled: false },
      { toolName: 'RESERVAS', isEnabled: false },
      { toolName: 'COMANDAS', isEnabled: false },
      { toolName: 'ANALYTICS', isEnabled: false },
      { toolName: 'FICHAJE', isEnabled: true },
    ];

    for (const tool of tools) {
      await prisma.toolAccess.create({
        data: {
          restaurantId: restaurant.id,
          toolName: tool.toolName,
          isEnabled: tool.isEnabled,
        },
      });
    }
    console.log('✅ FICHAJE y demás herramientas configuradas');

    console.log('\n✨ Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Usuario: ${owner.email} / demo123`);
    console.log(`   - Restaurante: ${restaurant.name}`);
    console.log(`   - Empleados: María García, Juan Martínez, Ana López`);
    console.log(`   - Turnos: hoy + 3 días (09-17, 10-18, 15-22)`);
    console.log(`   - FICHAJE: habilitado`);
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
