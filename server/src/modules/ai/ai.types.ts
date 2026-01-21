export interface ScheduleConstraint {
  id: string;
  type: 'employee_unavailable' | 'employee_preference' | 'minimum_staff' | 'maximum_hours' | 'shift_pattern';
  employeeId?: string;
  description: string;
  details: {
    days?: string[];  // ['monday', 'saturday', 'sunday']
    timeSlots?: string[];  // ['12:00-16:00', '20:00-00:00']
    minStaff?: number;
    maxHoursPerWeek?: number;
    preferredPattern?: string;
  };
}

export interface GenerateScheduleRequest {
  restaurantId: string;
  constraints: ScheduleConstraint[];
  freeTextConstraints?: string;  // Restricciones en lenguaje natural
  currentSchedule?: any[];  // Horario actual si existe
  hourlySlots: string[];  // Slots configurados (ej: ["12:00-16:00", "12:00-17:00", "18:00-00:00"])
  week: number;
  year: number;
}

export interface ScheduleOption {
  id: string;
  name: string;
  description: string;
  complianceScore: number;  // 0-100
  shifts: Array<{
    employeeId: string;
    day: number;
    startTime: string;
    endTime: string;
    type: string;
  }>;
  metrics: {
    totalHours: number;
    employeesUsed: number;
    constraintsMet: number;
    constraintsTotal: number;
  };
  warnings: string[];
}

export interface GenerateScheduleResponse {
  options: ScheduleOption[];
  impossibleConstraints: string[];
  suggestions: string[];
}
