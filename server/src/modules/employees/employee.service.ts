import prisma from '../../config/database';
import {
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeWithStats,
} from './employee.types';

class EmployeeService {
  /**
   * Obtener todos los empleados activos del restaurante
   */
  async getAll(restaurantId: string) {
    return await prisma.employee.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Obtener empleado por ID
   */
  async getById(id: string, restaurantId: string) {
    const employee = await prisma.employee.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!employee) {
      throw new Error('Empleado no encontrado');
    }

    return employee;
  }

  /**
   * Crear empleado
   */
  async create(data: CreateEmployeeRequest, restaurantId: string) {
    const { name, position, hourlyRate, phone, color } = data;

    return await prisma.employee.create({
      data: {
        name,
        position,
        hourlyRate: hourlyRate ?? null,
        phone: phone ?? null,
        color: color ?? '#3b82f6',
        restaurantId,
        isActive: true,
      },
    });
  }

  /**
   * Actualizar empleado
   */
  async update(id: string, data: UpdateEmployeeRequest, restaurantId: string) {
    // Verificar que el empleado existe y pertenece al restaurante
    await this.getById(id, restaurantId);

    return await prisma.employee.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * Soft delete: marcar empleado como inactivo
   */
  async delete(id: string, restaurantId: string) {
    // Verificar que el empleado existe y pertenece al restaurante
    await this.getById(id, restaurantId);

    return await prisma.employee.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Calcular estadísticas del empleado (horas trabajadas y número de turnos)
   */
  async getStats(
    id: string,
    restaurantId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    // Verificar que el empleado existe y pertenece al restaurante
    await this.getById(id, restaurantId);

    // Construir filtros de fecha
    const dateFilter: any = {
      employeeId: id,
      restaurantId,
    };

    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        dateFilter.date.gte = startDate;
      }
      if (endDate) {
        // Incluir todo el día de endDate
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateFilter.date.lte = endOfDay;
      }
    }

    // Obtener turnos del empleado
    const shifts = await prisma.shift.findMany({
      where: dateFilter,
    });

    // Calcular horas totales
    let totalHours = 0;
    for (const shift of shifts) {
      const hours = this.calculateHours(shift.startTime, shift.endTime);
      totalHours += hours;
    }

    return {
      totalHours: Math.round(totalHours * 100) / 100, // Redondear a 2 decimales
      totalShifts: shifts.length,
    };
  }

  /**
   * Calcular horas entre dos horas en formato string (HH:mm)
   */
  private calculateHours(startTime: string, endTime: string): number {
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours + minutes / 60;
    };

    const start = parseTime(startTime);
    let end = parseTime(endTime);

    // Si endTime es menor que startTime, asumir que es del día siguiente
    if (end < start) {
      end += 24;
    }

    return end - start;
  }

  /**
   * Verificar límite de empleados según plan de suscripción
   * @returns true si puede crear más empleados, false si ha alcanzado el límite
   */
  async checkEmployeeLimit(restaurantId: string): Promise<boolean> {
    // Obtener suscripción del restaurante
    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription) {
      throw new Error('Suscripción no encontrada');
    }

    // Contar empleados activos
    const activeEmployeesCount = await prisma.employee.count({
      where: {
        restaurantId,
        isActive: true,
      },
    });

    // Límites según plan
    const limits: Record<string, number> = {
      BASICO: 50,
      PROFESIONAL: 50,
      PREMIUM: Infinity, // Sin límite para PREMIUM
    };

    const limit = limits[subscription.plan] ?? 50;
    return activeEmployeesCount < limit;
  }
}

export default new EmployeeService();
