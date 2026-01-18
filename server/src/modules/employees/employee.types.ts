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
  isActive?: boolean;
}

export interface EmployeeWithStats {
  id: string;
  userId: string | null;
  restaurantId: string;
  name: string;
  position: string;
  hourlyRate: number | null;
  phone: string | null;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalHours: number;
  totalShifts: number;
}
