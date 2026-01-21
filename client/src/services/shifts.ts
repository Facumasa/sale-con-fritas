import api from './api';

export interface Shift {
  id: string;
  employeeId: string;
  restaurantId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'OFF';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftRequest {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'OFF';
  notes?: string;
}

export interface UpdateShiftRequest {
  employeeId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
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

export const shiftService = {
  async getWeekly(week: number, year: number): Promise<WeeklySchedule> {
    const response = await api.get(`/shifts/weekly?week=${week}&year=${year}`);
    return response.data.data;
  },

  async getByEmployee(employeeId: string, startDate?: string, endDate?: string): Promise<Shift[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/shifts/employee/${employeeId}?${params.toString()}`);
    return response.data.data;
  },

  async create(data: CreateShiftRequest): Promise<Shift> {
    const response = await api.post('/shifts', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateShiftRequest): Promise<Shift> {
    const response = await api.put(`/shifts/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/shifts/${id}`);
  },

  async bulkCreate(shifts: CreateShiftRequest[]): Promise<Shift[]> {
    const response = await api.post('/shifts/bulk', { shifts });
    return response.data.data;
  },

  async getAll(): Promise<Shift[]> {
    const response = await api.get('/shifts');
    return response.data.data;
  },
};
