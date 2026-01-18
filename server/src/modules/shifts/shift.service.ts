import prisma from '../../config/database';
import {
  CreateShiftRequest,
  UpdateShiftRequest,
  WeeklySchedule,
  ShiftConflict,
  EmployeeShift,
} from './shift.types';
import { Shift } from '@prisma/client';

class ShiftService {
  /**
   * Obtener horario semanal del restaurante
   */
  async getWeeklySchedule(
    restaurantId: string,
    week: number,
    year: number
  ): Promise<WeeklySchedule> {
    // Calcular fechas de inicio y fin de la semana
    const weekDates = this.getWeekDates(week, year);
    const startDate = weekDates.start;
    const endDate = weekDates.end;

    // Obtener todos los empleados activos del restaurante
    const employees = await prisma.employee.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Obtener turnos de la semana
    const shifts = await prisma.shift.findMany({
      where: {
        restaurantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        employee: {
          isActive: true,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Organizar turnos por empleado
    const employeeShifts: EmployeeShift[] = employees.map((employee) => {
      const employeeShiftsForWeek = shifts.filter(
        (shift) => shift.employeeId === employee.id
      );

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        employeePosition: employee.position,
        shifts: employeeShiftsForWeek,
      };
    });

    return {
      week,
      year,
      employees: employeeShifts,
    };
  }

  /**
   * Obtener fechas de inicio y fin de una semana ISO
   */
  private getWeekDates(week: number, year: number): { start: Date; end: Date } {
    // Calcular el primer día del año
    const firstDayOfYear = new Date(year, 0, 1);
    const daysOffset = (firstDayOfYear.getDay() + 6) % 7; // Ajustar para que lunes = 0

    // Calcular el primer lunes del año
    const firstMonday = new Date(firstDayOfYear);
    firstMonday.setDate(firstDayOfYear.getDate() - daysOffset);

    // Calcular el lunes de la semana solicitada
    const weekMonday = new Date(firstMonday);
    weekMonday.setDate(firstMonday.getDate() + (week - 1) * 7);

    // Calcular el domingo de la semana
    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekMonday.getDate() + 6);
    weekSunday.setHours(23, 59, 59, 999);

    return {
      start: weekMonday,
      end: weekSunday,
    };
  }

  /**
   * Obtener turnos de un empleado en un rango de fechas
   */
  async getByEmployee(
    employeeId: string,
    restaurantId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const dateFilter: any = {
      employeeId,
      restaurantId,
    };

    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        dateFilter.date.gte = startDate;
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateFilter.date.lte = endOfDay;
      }
    }

    return await prisma.shift.findMany({
      where: dateFilter,
      orderBy: {
        date: 'asc',
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
      },
    });
  }

  /**
   * Crear turno
   */
  async create(data: CreateShiftRequest, restaurantId: string): Promise<Shift> {
    // Verificar que el empleado pertenece al restaurante
    const employee = await prisma.employee.findFirst({
      where: {
        id: data.employeeId,
        restaurantId,
        isActive: true,
      },
    });

    if (!employee) {
      throw new Error('Empleado no encontrado o inactivo');
    }

    // Verificar conflictos
    const conflict = await this.checkConflicts(
      data.employeeId,
      data.date,
      data.startTime,
      data.endTime
    );

    if (conflict.hasConflict) {
      throw new Error(conflict.message || 'Conflicto de horarios detectado');
    }

    // Parsear fecha
    const shiftDate = new Date(data.date);
    shiftDate.setHours(0, 0, 0, 0);

    return await prisma.shift.create({
      data: {
        employeeId: data.employeeId,
        restaurantId,
        date: shiftDate,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type,
        notes: data.notes ?? null,
      },
    });
  }

  /**
   * Actualizar turno
   */
  async update(
    id: string,
    data: UpdateShiftRequest,
    restaurantId: string
  ): Promise<Shift> {
    // Verificar que el turno existe y pertenece al restaurante
    const existingShift = await prisma.shift.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!existingShift) {
      throw new Error('Turno no encontrado');
    }

    // Si se actualizan fecha u horas, verificar conflictos
    if (data.date || data.startTime || data.endTime) {
      const employeeId = data.employeeId ?? existingShift.employeeId;
      const date = data.date ?? existingShift.date.toISOString().split('T')[0];
      const startTime = data.startTime ?? existingShift.startTime;
      const endTime = data.endTime ?? existingShift.endTime;

      const conflict = await this.checkConflicts(
        employeeId,
        date,
        startTime,
        endTime,
        id // Excluir el turno actual
      );

      if (conflict.hasConflict) {
        throw new Error(conflict.message || 'Conflicto de horarios detectado');
      }
    }

    // Si se cambia employeeId, verificar que pertenece al restaurante
    if (data.employeeId && data.employeeId !== existingShift.employeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: data.employeeId,
          restaurantId,
          isActive: true,
        },
      });

      if (!employee) {
        throw new Error('Empleado no encontrado o inactivo');
      }
    }

    // Construir datos de actualización
    const updateData: any = {};
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.date !== undefined) {
      const shiftDate = new Date(data.date);
      shiftDate.setHours(0, 0, 0, 0);
      updateData.date = shiftDate;
    }

    return await prisma.shift.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Eliminar turno
   */
  async delete(id: string, restaurantId: string): Promise<void> {
    const shift = await prisma.shift.findFirst({
      where: {
        id,
        restaurantId,
      },
    });

    if (!shift) {
      throw new Error('Turno no encontrado');
    }

    await prisma.shift.delete({
      where: { id },
    });
  }

  /**
   * Verificar conflictos de horarios para un empleado
   */
  async checkConflicts(
    employeeId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeShiftId?: string
  ): Promise<ShiftConflict> {
    // Parsear fecha
    const shiftDate = new Date(date);
    shiftDate.setHours(0, 0, 0, 0);

    const endOfDay = new Date(shiftDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar turnos del mismo empleado en la misma fecha
    const existingShifts = await prisma.shift.findMany({
      where: {
        employeeId,
        date: {
          gte: shiftDate,
          lte: endOfDay,
        },
        ...(excludeShiftId && { id: { not: excludeShiftId } }),
      },
    });

    // Verificar solapamientos
    for (const existingShift of existingShifts) {
      if (this.timeOverlaps(startTime, endTime, existingShift.startTime, existingShift.endTime)) {
        return {
          hasConflict: true,
          message: `El turno se solapa con otro turno existente (${existingShift.startTime} - ${existingShift.endTime})`,
          conflictingShift: existingShift,
        };
      }
    }

    return {
      hasConflict: false,
    };
  }

  /**
   * Verificar si dos rangos de tiempo se solapan
   */
  private timeOverlaps(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes; // Convertir a minutos desde medianoche
    };

    const s1 = parseTime(start1);
    const e1 = parseTime(end1);
    const s2 = parseTime(start2);
    const e2 = parseTime(end2);

    // Manejar turnos que cruzan medianoche
    const maxMinutes = 24 * 60;
    let actualE1 = e1;
    let actualE2 = e2;

    // Si endTime < startTime, el turno cruza medianoche
    if (e1 < s1) {
      actualE1 = e1 + maxMinutes;
    }
    if (e2 < s2) {
      actualE2 = e2 + maxMinutes;
    }

    // Verificar solapamiento: (s1 < e2) && (s2 < e1)
    return s1 < actualE2 && s2 < actualE1;
  }

  /**
   * Calcular horas de un turno
   */
  calculateHours(startTime: string, endTime: string): number {
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
   * Crear múltiples turnos en lote
   */
  async bulkCreate(shifts: CreateShiftRequest[], restaurantId: string): Promise<Shift[]> {
    // Validar que todos los empleados pertenecen al restaurante
    const employeeIds = [...new Set(shifts.map((s) => s.employeeId))];
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        restaurantId,
        isActive: true,
      },
    });

    if (employees.length !== employeeIds.length) {
      throw new Error('Uno o más empleados no pertenecen al restaurante o están inactivos');
    }

    // Verificar conflictos para cada turno
    for (const shift of shifts) {
      const conflict = await this.checkConflicts(
        shift.employeeId,
        shift.date,
        shift.startTime,
        shift.endTime
      );

      if (conflict.hasConflict) {
        throw new Error(
          `Conflicto detectado para el turno del empleado ${shift.employeeId} en ${shift.date}: ${conflict.message}`
        );
      }
    }

    // Crear todos los turnos
    const createdShifts = await Promise.all(
      shifts.map(async (shift) => {
        const shiftDate = new Date(shift.date);
        shiftDate.setHours(0, 0, 0, 0);

        return await prisma.shift.create({
          data: {
            employeeId: shift.employeeId,
            restaurantId,
            date: shiftDate,
            startTime: shift.startTime,
            endTime: shift.endTime,
            type: shift.type,
            notes: shift.notes ?? null,
          },
        });
      })
    );

    return createdShifts;
  }
}

export default new ShiftService();
