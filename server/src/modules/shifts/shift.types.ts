import { Shift } from '@prisma/client';

export interface CreateShiftRequest {
  employeeId: string;
  date: string; // ISO date string
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  type: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'OFF';
  notes?: string;
}

export interface UpdateShiftRequest {
  employeeId?: string;
  date?: string; // ISO date string
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  type?: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'OFF';
  notes?: string;
}

export interface EmployeeShift {
  employeeId: string;
  employeeName: string;
  employeePosition: string;
  shifts: Shift[];
}

export interface WeeklySchedule {
  week: number;
  year: number;
  employees: EmployeeShift[];
}

export interface ShiftConflict {
  hasConflict: boolean;
  message?: string;
  conflictingShift?: Shift;
}
