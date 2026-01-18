import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');

    // 1. Crear usuario owner primero (necesario para crear el restaurante)
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

    // 2. Crear restaurante con el ownerId
    console.log('📦 Creando restaurante...');
    const restaurant = await prisma.restaurant.create({
      data: {
        name: 'Restaurante Demo',
        address: 'Calle Demo 123',
        phone: '+34 123 456 789',
        email: 'info@restaurantedemo.com',
        ownerId: owner.id,
      },
    });
    console.log('✅ Restaurante creado:', restaurant.name);

    // Vincular el usuario al restaurante (relación RestaurantUsers)
    await prisma.user.update({
      where: { id: owner.id },
      data: { restaurantId: restaurant.id },
    });

    // 3. Crear empleados
    console.log('👥 Creando empleados...');
    const employees = await Promise.all([
      prisma.employee.create({
        data: {
          restaurantId: restaurant.id,
          name: 'María García',
          position: 'Camarera',
          color: '#3b82f6',
          isActive: true,
        },
      }),
      prisma.employee.create({
        data: {
          restaurantId: restaurant.id,
          name: 'Juan López',
          position: 'Cocinero',
          color: '#10b981',
          isActive: true,
        },
      }),
      prisma.employee.create({
        data: {
          restaurantId: restaurant.id,
          name: 'Ana Martínez',
          position: 'Ayudante',
          color: '#f59e0b',
          isActive: true,
        },
      }),
    ]);
    console.log('✅ Empleados creados:', employees.length);

    // 4. Crear suscripción
    console.log('💳 Creando suscripción...');
    const today = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(today.getDate() + 14);

    const subscription = await prisma.subscription.create({
      data: {
        restaurantId: restaurant.id,
        plan: 'BASICO',
        status: 'TRIALING',
        currentPeriodStart: today,
        currentPeriodEnd: trialEndDate,
        trialEndsAt: trialEndDate,
      },
    });
    console.log('✅ Suscripción creada:', subscription.plan);

    // 5. Crear ToolAccess
    console.log('🛠️ Creando accesos a herramientas...');
    const tools = [
      { toolName: 'HORARIOS', isEnabled: true },
      { toolName: 'INVENTARIO', isEnabled: false },
      { toolName: 'RESERVAS', isEnabled: false },
      { toolName: 'COMANDAS', isEnabled: false },
      { toolName: 'ANALYTICS', isEnabled: false },
    ];

    const toolAccesses = await Promise.all(
      tools.map((tool) =>
        prisma.toolAccess.create({
          data: {
            restaurantId: restaurant.id,
            toolName: tool.toolName,
            isEnabled: tool.isEnabled,
          },
        })
      )
    );
    console.log('✅ Accesos a herramientas creados:', toolAccesses.length);

    // 6. Crear turnos de ejemplo para la semana actual
    console.log('📅 Creando turnos de ejemplo...');
    const shifts = [];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Inicio del día

    // Crear 6 turnos distribuidos en la semana actual
    const shiftTypes = ['MORNING', 'AFTERNOON', 'NIGHT'];
    const shiftTimes = {
      MORNING: { start: '09:00', end: '15:00' },
      AFTERNOON: { start: '15:00', end: '22:00' },
      NIGHT: { start: '20:00', end: '02:00' },
    };

    for (let i = 0; i < 6; i++) {
      const shiftDate = new Date(todayDate);
      shiftDate.setDate(todayDate.getDate() + i); // Días de la semana actual

      const employeeIndex = i % employees.length;
      const shiftType = shiftTypes[i % shiftTypes.length];
      const times = shiftTimes[shiftType as keyof typeof shiftTimes];

      const shift = await prisma.shift.create({
        data: {
          employeeId: employees[employeeIndex].id,
          restaurantId: restaurant.id,
          date: shiftDate,
          startTime: times.start,
          endTime: times.end,
          type: shiftType,
        },
      });
      shifts.push(shift);
    }
    console.log('✅ Turnos creados:', shifts.length);

    console.log('\n✨ Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Restaurante: ${restaurant.name}`);
    console.log(`   - Usuario owner: ${owner.email}`);
    console.log(`   - Empleados: ${employees.length}`);
    console.log(`   - Suscripción: ${subscription.plan} (${subscription.status})`);
    console.log(`   - Accesos a herramientas: ${toolAccesses.length}`);
    console.log(`   - Turnos: ${shifts.length}`);
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
