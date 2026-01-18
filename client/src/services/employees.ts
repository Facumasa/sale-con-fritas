import api from './api';

export interface Employee {
  id: string;
  userId: string | null;
  restaurantId: string;
  name: string;
  position: string;
  hourlyRate: number | null;
  phone: string | null;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  name: string;
  position: string;
  hourlyRate?: number;
  phone?: string;
  color?: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  position?: string;
  hourlyRate?: number;
  phone?: string;
  color?: string;
}

export interface EmployeeStats {
  totalHours: number;
  totalShifts: number;
}

export const employeeService = {
  async getAll(): Promise<Employee[]> {
    const response = await api.get('/employees');
    return response.data.data;
  },

  async getById(id: string): Promise<Employee> {
    const response = await api.get(`/employees/${id}`);
    return response.data.data;
  },

  async create(data: CreateEmployeeRequest): Promise<Employee> {
    const response = await api.post('/employees', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    const response = await api.put(`/employees/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/employees/${id}`);
  },

  async getStats(id: string, startDate?: string, endDate?: string): Promise<EmployeeStats> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/employees/${id}/stats?${params.toString()}`);
    return response.data.data;
  },
};
