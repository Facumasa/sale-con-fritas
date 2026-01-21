import api from './api';

export interface ScheduleConstraint {
  id: string;
  type: 'employee_unavailable' | 'employee_preference' | 'minimum_staff' | 'maximum_hours' | 'shift_pattern';
  employeeId?: string;
  description: string;
  details: {
    days?: string[];
    timeSlots?: string[];
    minStaff?: number;
    maxHoursPerWeek?: number;
    preferredPattern?: string;
  };
}

export interface ScheduleOption {
  id: string;
  name: string;
  description: string;
  complianceScore: number;
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

export const generateScheduleWithAI = async (
  constraints: ScheduleConstraint[],
  freeTextConstraints: string,
  hourlySlots: string[],
  week: number,
  year: number
): Promise<GenerateScheduleResponse> => {
  const response = await api.post('/ai/generate', {
    constraints,
    freeTextConstraints,
    hourlySlots,
    week,
    year,
  });
  return response.data.data;
};

export const optimizeSchedule = async (
  week: number,
  year: number,
  goal: string
): Promise<GenerateScheduleResponse> => {
  const response = await api.post('/ai/optimize', {
    week,
    year,
    goal,
  });
  return response.data.data;
};

export const chatWithAI = async (message: string, context: any) => {
  const response = await api.post('/ai/chat', {
    message,
    context,
  });
  return response.data.data;
};
