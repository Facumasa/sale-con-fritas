import api from './api';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  restaurantId: string;
  shiftId: string | null;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workedHours: number | null;
  isLate: boolean;
  minutesLate: number | null;
  isAbsent: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: { id: string; name: string; position: string };
  shift?: { id: string; startTime: string; endTime: string } | null;
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

export interface AttendanceFilters {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
}

export interface UpdateAttendanceData {
  checkIn?: string;
  checkOut?: string;
  workedHours?: number;
  isLate?: boolean;
  minutesLate?: number;
  isAbsent?: boolean;
  notes?: string;
}

export const attendanceService = {
  async checkIn(employeeId: string, pin: string, notes?: string): Promise<AttendanceRecord> {
    const response = await api.post('/attendance/check-in', { employeeId, pin, notes });
    return response.data.data;
  },

  async checkOut(attendanceId: string, notes?: string): Promise<AttendanceRecord> {
    const response = await api.post('/attendance/check-out', { attendanceId, notes });
    return response.data.data;
  },

  async getAttendances(filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.date) params.append('date', filters.date);
    const query = params.toString();
    const response = await api.get(`/attendance${query ? `?${query}` : ''}`);
    return response.data.data;
  },

  async getTodayAttendances(): Promise<DailyAttendanceSummary> {
    const response = await api.get('/attendance/today');
    return response.data.data;
  },

  async getStats(): Promise<AttendanceStats> {
    const response = await api.get('/attendance/stats');
    return response.data.data;
  },

  async getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const response = await api.get(`/attendance/report/monthly?year=${year}&month=${month}`);
    return response.data.data;
  },

  async getEmployeeAttendances(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    const response = await api.get(
      `/attendance/employee/${employeeId}${query ? `?${query}` : ''}`
    );
    return response.data.data;
  },

  async generatePin(employeeId: string): Promise<{ pin: string }> {
    const response = await api.post(`/attendance/employee/${employeeId}/generate-pin`);
    return response.data.data;
  },

  async updateAttendance(id: string, data: UpdateAttendanceData): Promise<AttendanceRecord> {
    const response = await api.put(`/attendance/${id}`, data);
    return response.data.data;
  },

  async deleteAttendance(id: string): Promise<void> {
    await api.delete(`/attendance/${id}`);
  },
};
