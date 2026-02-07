import { Attendance, Employee, Shift } from '@prisma/client';

export interface CheckInRequest {
  employeeId: string;
  pin: string;
  notes?: string;
}

export interface CheckOutRequest {
  attendanceId: string;
  notes?: string;
}

export interface AttendanceRecord extends Attendance {
  employee?: Employee;
  shift?: Shift | null;
}

export interface DailyAttendanceSummary {
  date: string;
  attendances: AttendanceRecord[];
  absences: { employeeId: string; employeeName: string; position: string }[];
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  totalDays: number;
  totalWorkedHours: number;
  totalLateCount: number;
  totalAbsences: number;
  byEmployee: {
    employeeId: string;
    employeeName: string;
    workedHours: number;
    lateCount: number;
    absences: number;
    attendances: number;
  }[];
}

export interface AttendanceStats {
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  weekPresentAverage: number;
  monthTotalHours: number;
  monthLateCount: number;
}

export interface UpdateAttendanceRequest {
  checkIn?: Date;
  checkOut?: Date;
  workedHours?: number;
  isLate?: boolean;
  minutesLate?: number;
  isAbsent?: boolean;
  notes?: string;
}

export interface AttendanceFilters {
  restaurantId: string;
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  date?: Date;
}
