import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import {
  CheckInRequest,
  CheckOutRequest,
  AttendanceRecord,
  DailyAttendanceSummary,
  MonthlyReport,
  AttendanceStats,
  UpdateAttendanceRequest,
  AttendanceFilters,
} from './attendance.types';
import { Attendance } from '@prisma/client';

class AttendanceService {
  /**
   * Comparar hora (HH:MM) con Date: devuelve minutos de diferencia (positivo = llegó tarde)
   */
  private getMinutesLate(checkInDate: Date, expectedStartTime: string): number {
    const [hours, minutes] = expectedStartTime.split(':').map(Number);
    const expected = new Date(checkInDate);
    expected.setHours(hours, minutes, 0, 0);
    const diffMs = checkInDate.getTime() - expected.getTime();
    return Math.max(0, Math.round(diffMs / 60000));
  }

  /**
   * Calcular horas trabajadas entre checkIn y checkOut
   */
  private calculateWorkedHours(checkIn: Date, checkOut: Date): number {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  /**
   * Registrar entrada (check-in)
   */
  async checkIn(data: CheckInRequest, restaurantId: string): Promise<Attendance> {
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

    if (!employee.pin) {
      throw new Error('El empleado no tiene PIN configurado');
    }

    const pinMatch = await bcrypt.compare(data.pin, employee.pin);
    if (!pinMatch) {
      throw new Error('PIN incorrecto');
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Buscar turno del día para este empleado (opcional)
    const shift = await prisma.shift.findFirst({
      where: {
        employeeId: data.employeeId,
        restaurantId,
        date: { gte: todayStart, lte: todayEnd },
        type: { not: 'OFF' },
      },
    });

    let isLate = false;
    let minutesLate: number | null = null;
    if (shift && shift.startTime) {
      const late = this.getMinutesLate(now, shift.startTime);
      if (late > 0) {
        isLate = true;
        minutesLate = late;
      }
    }

    // Evitar doble check-in el mismo día
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId: data.employeeId,
        restaurantId,
        date: { gte: todayStart, lte: todayEnd },
        checkIn: { not: null },
        checkOut: null,
      },
    });

    if (existing) {
      throw new Error('Ya tienes un fichaje de entrada abierto hoy');
    }

    return await prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        restaurantId,
        shiftId: shift?.id ?? null,
        date: todayStart,
        checkIn: now,
        checkOut: null,
        workedHours: null,
        isLate,
        minutesLate,
        isAbsent: false,
        notes: data.notes ?? null,
      },
    });
  }

  /**
   * Registrar salida (check-out)
   */
  async checkOut(data: CheckOutRequest, restaurantId: string): Promise<Attendance> {
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: data.attendanceId,
        restaurantId,
      },
    });

    if (!attendance) {
      throw new Error('Registro de asistencia no encontrado');
    }

    if (attendance.checkOut) {
      throw new Error('Ya se registró la salida para este fichaje');
    }

    const now = new Date();
    const workedHours = attendance.checkIn
      ? this.calculateWorkedHours(attendance.checkIn, now)
      : null;

    return await prisma.attendance.update({
      where: { id: data.attendanceId },
      data: {
        checkOut: now,
        workedHours,
        notes: data.notes ?? attendance.notes,
      },
    });
  }

  /**
   * Listar asistencias con filtros
   */
  async getAttendances(filters: AttendanceFilters): Promise<AttendanceRecord[]> {
    const where: any = {
      restaurantId: filters.restaurantId,
    };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.date) {
      const start = new Date(filters.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.date);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        where.date.gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const list = await prisma.attendance.findMany({
      where,
      include: {
        employee: true,
        shift: true,
      },
      orderBy: [{ date: 'desc' }, { checkIn: 'desc' }],
    });

    return list as AttendanceRecord[];
  }

  /**
   * Resumen de asistencias de hoy con ausencias
   */
  async getTodayAttendances(restaurantId: string): Promise<DailyAttendanceSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        restaurantId,
        date: { gte: today, lte: todayEnd },
      },
      include: { employee: true, shift: true },
      orderBy: { checkIn: 'asc' },
    });

    const employeesWithShift = await prisma.employee.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      include: {
        shifts: {
          where: {
            date: { gte: today, lte: todayEnd },
            type: { not: 'OFF' },
          },
        },
      },
    });

    const presentIds = new Set(attendances.map((a) => a.employeeId));
    const employeesScheduledToday = employeesWithShift.filter((e) => e.shifts.length > 0);
    const absences = employeesScheduledToday
      .filter((e) => !presentIds.has(e.id))
      .map((e) => ({
        employeeId: e.id,
        employeeName: e.name,
        position: e.position,
      }));

    const totalLate = attendances.filter((a) => a.isLate).length;

    return {
      date: today.toISOString().split('T')[0],
      attendances: attendances as AttendanceRecord[],
      absences,
      totalPresent: attendances.length,
      totalAbsent: absences.length,
      totalLate,
    };
  }

  /**
   * Reporte mensual
   */
  async getMonthlyReport(
    restaurantId: string,
    year: number,
    month: number
  ): Promise<MonthlyReport> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        restaurantId,
        date: { gte: start, lte: end },
      },
      include: { employee: true },
    });

    const totalDays = new Date(year, month, 0).getDate();
    const totalWorkedHours = attendances.reduce((sum, a) => sum + (a.workedHours ?? 0), 0);
    const totalLateCount = attendances.filter((a) => a.isLate).length;

    const byEmployeeId = new Map<
      string,
      { employeeName: string; workedHours: number; lateCount: number; attendances: number }
    >();

    for (const a of attendances) {
      const current = byEmployeeId.get(a.employeeId) ?? {
        employeeName: a.employee.name,
        workedHours: 0,
        lateCount: 0,
        attendances: 0,
      };
      current.workedHours += a.workedHours ?? 0;
      if (a.isLate) current.lateCount++;
      current.attendances++;
      byEmployeeId.set(a.employeeId, current);
    }

    const employees = await prisma.employee.findMany({
      where: { restaurantId, isActive: true },
    });

    const scheduledThisMonth = new Set<string>();
    const shiftsInMonth = await prisma.shift.findMany({
      where: {
        restaurantId,
        date: { gte: start, lte: end },
        type: { not: 'OFF' },
      },
    });
    shiftsInMonth.forEach((s) => scheduledThisMonth.add(s.employeeId));

    const byEmployee = employees.map((emp) => {
      const stats = byEmployeeId.get(emp.id);
      const scheduled = shiftsInMonth.filter((s) => s.employeeId === emp.id).length;
      const absences = Math.max(0, scheduled - (stats?.attendances ?? 0));
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        workedHours: stats?.workedHours ?? 0,
        lateCount: stats?.lateCount ?? 0,
        absences,
        attendances: stats?.attendances ?? 0,
      };
    });

    const totalAbsences = byEmployee.reduce((sum, e) => sum + e.absences, 0);

    return {
      year,
      month,
      totalDays,
      totalWorkedHours,
      totalLateCount,
      totalAbsences,
      byEmployee,
    };
  }

  /**
   * Asistencias de un empleado en un rango de fechas
   */
  async getEmployeeAttendances(
    employeeId: string,
    restaurantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AttendanceRecord[]> {
    const where: any = { employeeId, restaurantId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        where.date.gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        where.date.lte = e;
      }
    }

    const list = await prisma.attendance.findMany({
      where,
      include: { employee: true, shift: true },
      orderBy: [{ date: 'desc' }, { checkIn: 'desc' }],
    });
    return list as AttendanceRecord[];
  }

  /**
   * Estadísticas generales del restaurante
   */
  async getStats(restaurantId: string): Promise<AttendanceStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendances = await prisma.attendance.findMany({
      where: {
        restaurantId,
        date: { gte: today, lte: todayEnd },
      },
    });

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekAttendances = await prisma.attendance.findMany({
      where: {
        restaurantId,
        date: { gte: weekStart, lte: todayEnd },
      },
    });
    const daysInWeek = Math.min(7, Math.ceil((todayEnd.getTime() - weekStart.getTime()) / 86400000) + 1);
    const weekPresentAverage = daysInWeek > 0 ? weekAttendances.length / daysInWeek : 0;

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthAttendances = await prisma.attendance.findMany({
      where: {
        restaurantId,
        date: { gte: monthStart, lte: todayEnd },
      },
    });
    const monthTotalHours = monthAttendances.reduce((s, a) => s + (a.workedHours ?? 0), 0);
    const monthLateCount = monthAttendances.filter((a) => a.isLate).length;

    return {
      todayPresent: todayAttendances.length,
      todayAbsent: 0, // se puede derivar de turnos del día si se necesita
      todayLate: todayAttendances.filter((a) => a.isLate).length,
      weekPresentAverage: Math.round(weekPresentAverage * 100) / 100,
      monthTotalHours: Math.round(monthTotalHours * 100) / 100,
      monthLateCount,
    };
  }

  /**
   * Generar PIN de 4 dígitos y guardarlo hasheado
   */
  async generatePin(employeeId: string, restaurantId: string): Promise<{ pin: string }> {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, restaurantId },
    });
    if (!employee) {
      throw new Error('Empleado no encontrado');
    }

    const pin = String(Math.floor(1000 + Math.random() * 9000)); // 4 dígitos
    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.employee.update({
      where: { id: employeeId },
      data: { pin: hashedPin },
    });

    return { pin };
  }

  /**
   * Actualizar asistencia (admin)
   */
  async updateAttendance(
    id: string,
    data: UpdateAttendanceRequest,
    restaurantId: string
  ): Promise<Attendance> {
    const existing = await prisma.attendance.findFirst({
      where: { id, restaurantId },
    });
    if (!existing) {
      throw new Error('Registro de asistencia no encontrado');
    }

    const updateData: any = {};
    if (data.checkIn !== undefined) updateData.checkIn = data.checkIn;
    if (data.checkOut !== undefined) updateData.checkOut = data.checkOut;
    if (data.workedHours !== undefined) updateData.workedHours = data.workedHours;
    if (data.isLate !== undefined) updateData.isLate = data.isLate;
    if (data.minutesLate !== undefined) updateData.minutesLate = data.minutesLate;
    if (data.isAbsent !== undefined) updateData.isAbsent = data.isAbsent;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return await prisma.attendance.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Eliminar asistencia (admin)
   */
  async deleteAttendance(id: string, restaurantId: string): Promise<void> {
    const existing = await prisma.attendance.findFirst({
      where: { id, restaurantId },
    });
    if (!existing) {
      throw new Error('Registro de asistencia no encontrado');
    }
    await prisma.attendance.delete({ where: { id } });
  }
}

export default new AttendanceService();
