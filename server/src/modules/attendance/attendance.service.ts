import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { sendPinResetEmail } from '../../services/email.service';
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

/**
 * Distancia en metros entre dos puntos (fórmula de Haversine)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // radio Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        fichajeRadiusMeters: true,
        requireGeolocation: true,
      },
    });

    if (!restaurant) {
      throw new Error('Restaurante no encontrado');
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id: data.employeeId,
        restaurantId,
        isActive: true,
      },
      select: { id: true, pin: true, needsPinChange: true },
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

    if (employee.needsPinChange) {
      const err = new Error('Debes cambiar tu PIN antes de fichar. Revisa tu email o solicita un nuevo enlace.') as Error & { code?: string; employeeId?: string };
      err.code = 'NEEDS_PIN_CHANGE';
      err.employeeId = data.employeeId;
      throw err;
    }

    const lat = data.latitude;
    const lon = data.longitude;
    const deviceId = data.deviceId ?? null;

    if (restaurant.requireGeolocation) {
      if (lat == null || lon == null) {
        throw new Error('Este restaurante requiere geolocalización');
      }
      if (
        restaurant.latitude != null &&
        restaurant.longitude != null &&
        restaurant.fichajeRadiusMeters != null
      ) {
        const distance = calculateDistance(
          lat,
          lon,
          restaurant.latitude,
          restaurant.longitude
        );
        if (distance > restaurant.fichajeRadiusMeters) {
          throw new Error(
            `Debes estar dentro de ${restaurant.fichajeRadiusMeters}m del restaurante para fichar`
          );
        }
      }
    }

    if (deviceId) {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const recentSameDevice = await prisma.attendance.findFirst({
        where: {
          deviceId,
          checkIn: { gte: threeMinutesAgo },
        },
        orderBy: { checkIn: 'desc' },
      });
      if (recentSameDevice) {
        throw new Error(
          'Solo se permite 1 fichaje cada 3 minutos por dispositivo'
        );
      }
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

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

    let distanceFromRestaurant: number | null = null;
    if (
      lat != null &&
      lon != null &&
      restaurant.latitude != null &&
      restaurant.longitude != null
    ) {
      distanceFromRestaurant = calculateDistance(
        lat,
        lon,
        restaurant.latitude,
        restaurant.longitude
      );
    }

    let lastFichajeSameDevice: Date | null = null;
    if (deviceId) {
      const lastSameDevice = await prisma.attendance.findFirst({
        where: { deviceId },
        orderBy: { checkIn: 'desc' },
        select: { checkIn: true },
      });
      if (lastSameDevice?.checkIn) lastFichajeSameDevice = lastSameDevice.checkIn;
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
        latitude: lat ?? null,
        longitude: lon ?? null,
        distanceFromRestaurant,
        deviceId,
        lastFichajeSameDevice,
      },
    });
  }

  /**
   * Check-in público por token (página QR, sin auth)
   */
  async checkInPublic(data: {
    publicToken: string;
    employeeId: string;
    pin: string;
    latitude?: number;
    longitude?: number;
    deviceId?: string;
    notes?: string;
  }): Promise<Attendance> {
    const restaurant = await prisma.restaurant.findFirst({
      where: { publicFichajeToken: data.publicToken },
    });
    if (!restaurant) {
      throw new Error('Enlace de fichaje no válido');
    }
    const employee = await prisma.employee.findFirst({
      where: {
        id: data.employeeId,
        restaurantId: restaurant.id,
        isActive: true,
      },
    });
    if (!employee) {
      throw new Error('Empleado no encontrado o inactivo');
    }
    return this.checkIn(
      {
        employeeId: data.employeeId,
        pin: data.pin,
        notes: data.notes,
        latitude: data.latitude,
        longitude: data.longitude,
        deviceId: data.deviceId,
      },
      restaurant.id
    );
  }

  /**
   * Info pública del restaurante por token (para página de fichaje QR)
   */
  async getPublicFichajeInfo(publicToken: string): Promise<{ name: string; requireGeolocation: boolean }> {
    const restaurant = await prisma.restaurant.findFirst({
      where: { publicFichajeToken: publicToken },
      select: { name: true, requireGeolocation: true },
    });
    if (!restaurant) throw new Error('Enlace de fichaje no válido');
    return { name: restaurant.name, requireGeolocation: restaurant.requireGeolocation ?? false };
  }

  /**
   * Empleados activos para fichaje público (solo id, name, position, color)
   */
  async getPublicFichajeEmployees(publicToken: string): Promise<{ id: string; name: string; position: string; color: string }[]> {
    const restaurant = await prisma.restaurant.findFirst({
      where: { publicFichajeToken: publicToken },
      select: { id: true },
    });
    if (!restaurant) throw new Error('Enlace de fichaje no válido');
    const employees = await prisma.employee.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      select: { id: true, name: true, position: true, color: true },
      orderBy: { name: 'asc' },
    });
    return employees;
  }

  /**
   * Estado de fichaje de un empleado hoy (para mostrar si está "dentro" o "fuera" según último fichaje)
   */
  async getPublicEmployeeStatus(
    publicToken: string,
    employeeId: string
  ): Promise<{ hasOpenAttendance: boolean; attendanceId?: string; lastCheckIn?: string; isInside: boolean }> {
    const restaurant = await prisma.restaurant.findFirst({
      where: { publicFichajeToken: publicToken },
      select: { id: true },
    });
    if (!restaurant) throw new Error('Enlace de fichaje no válido');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayFichajes = await prisma.attendance.findMany({
      where: {
        restaurantId: restaurant.id,
        employeeId,
        date: { gte: todayStart, lte: todayEnd },
        checkIn: { not: null },
      },
      orderBy: { checkIn: 'asc' },
      select: { id: true, checkIn: true },
    });
    const count = todayFichajes.length;
    const last = todayFichajes[count - 1];
    const isInside = count > 0 && count % 2 === 1;
    return {
      hasOpenAttendance: isInside,
      attendanceId: last?.id,
      lastCheckIn: last?.checkIn ? last.checkIn.toISOString() : undefined,
      isInside,
    };
  }

  /**
   * Fichajes del día de un empleado (página pública)
   */
  async getPublicEmployeeToday(
    publicToken: string,
    employeeId: string
  ): Promise<{
    employeeId: string;
    employeeName: string;
    date: string;
    fichajes: { id: string; checkIn: string; minutesLate: number | null }[];
    totalFichajes: number;
    totalHorasTrabajadas: number;
  }> {
    const restaurant = await prisma.restaurant.findFirst({
      where: { publicFichajeToken: publicToken },
      select: { id: true },
    });
    if (!restaurant) throw new Error('Enlace de fichaje no válido');
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, restaurantId: restaurant.id, isActive: true },
      select: { id: true, name: true },
    });
    if (!employee) throw new Error('Empleado no encontrado');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const records = await prisma.attendance.findMany({
      where: {
        restaurantId: restaurant.id,
        employeeId,
        date: { gte: todayStart, lte: todayEnd },
        checkIn: { not: null },
      },
      orderBy: { checkIn: 'asc' },
      select: { id: true, checkIn: true, minutesLate: true },
    });
    const fichajes = records.map((r) => ({
      id: r.id,
      checkIn: r.checkIn!.toISOString(),
      minutesLate: r.minutesLate,
    }));
    let totalHorasTrabajadas = 0;
    for (let i = 0; i + 1 < records.length; i += 2) {
      const a = records[i].checkIn!;
      const b = records[i + 1].checkIn!;
      totalHorasTrabajadas += (b.getTime() - a.getTime()) / (1000 * 60 * 60);
    }
    totalHorasTrabajadas = Math.round(totalHorasTrabajadas * 100) / 100;
    const dateStr = todayStart.toISOString().split('T')[0];
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      date: dateStr,
      fichajes,
      totalFichajes: fichajes.length,
      totalHorasTrabajadas,
    };
  }

  /**
   * Check-out público por token
   */
  async checkOutPublic(data: {
    publicToken: string;
    attendanceId: string;
    notes?: string;
  }): Promise<Attendance> {
    const restaurant = await prisma.restaurant.findFirst({
      where: { publicFichajeToken: data.publicToken },
    });
    if (!restaurant) throw new Error('Enlace de fichaje no válido');
    return this.checkOut(
      { attendanceId: data.attendanceId, notes: data.notes },
      restaurant.id
    );
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

  /**
   * Solicitar cambio de PIN: guardar email, generar token y enviar email (público)
   */
  async requestPinChange(employeeId: string, email: string, publicToken: string): Promise<void> {
    const restaurant = await prisma.restaurant.findFirst({
      where: { publicFichajeToken: publicToken },
      select: { id: true, publicFichajeToken: true },
    });
    if (!restaurant) throw new Error('Enlace de fichaje no válido');

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, restaurantId: restaurant.id, isActive: true },
    });
    if (!employee) throw new Error('Empleado no encontrado');

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        email: email || employee.email,
        pinResetToken: token,
        pinResetExpires: expires,
      },
    });

    const emailToSend = email || employee.email;
    if (!emailToSend) throw new Error('Email es requerido');
    await sendPinResetEmail(
      emailToSend,
      token,
      employee.name,
      restaurant.publicFichajeToken ?? null
    );
  }

  /**
   * Verificar token de cambio de PIN (público)
   */
  async verifyPinToken(token: string): Promise<{ valid: true; employeeId: string; employeeName: string } | { valid: false }> {
    const employee = await prisma.employee.findFirst({
      where: {
        pinResetToken: token,
        pinResetExpires: { gt: new Date() },
      },
      select: { id: true, name: true },
    });
    if (!employee) return { valid: false };
    return { valid: true, employeeId: employee.id, employeeName: employee.name };
  }

  /**
   * Cambiar PIN con token (público)
   */
  async changePin(token: string, oldPin: string, newPin: string): Promise<void> {
    const employee = await prisma.employee.findFirst({
      where: {
        pinResetToken: token,
        pinResetExpires: { gt: new Date() },
      },
    });
    if (!employee) throw new Error('Link expirado o inválido');
    if (!employee.pin) throw new Error('Empleado sin PIN');

    const oldMatch = await bcrypt.compare(oldPin, employee.pin);
    if (!oldMatch) throw new Error('PIN actual incorrecto');

    if (!/^\d{4}$/.test(newPin)) throw new Error('El nuevo PIN debe tener 4 dígitos');
    if (oldPin === newPin) throw new Error('El nuevo PIN debe ser distinto al actual');

    const hashedNewPin = await bcrypt.hash(newPin, 10);
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        pin: hashedNewPin,
        needsPinChange: false,
        pinResetToken: null,
        pinResetExpires: null,
      },
    });
  }

  /**
   * Olvidé mi PIN: enviar email si tiene email guardado (público)
   */
  async forgotPin(employeeId: string, publicToken: string): Promise<{ sent: boolean; message: string }> {
    const restaurant = await prisma.restaurant.findFirst({
      where: { publicFichajeToken: publicToken },
    });
    if (!restaurant) throw new Error('Enlace de fichaje no válido');

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, restaurantId: restaurant.id, isActive: true },
    });
    if (!employee) throw new Error('Empleado no encontrado');

    const emailToSend = employee.email;
    if (!emailToSend) {
      return { sent: false, message: 'Contacta a tu supervisor para configurar tu email y recuperar el PIN.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.employee.update({
      where: { id: employeeId },
      data: { pinResetToken: token, pinResetExpires: expires },
    });
    await sendPinResetEmail(emailToSend, token, employee.name, publicToken);
    return { sent: true, message: 'Email enviado' };
  }
}

export default new AttendanceService();
