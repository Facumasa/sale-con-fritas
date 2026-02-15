import api from './api';

export interface PublicFichajeInfo {
  name: string;
  requireGeolocation: boolean;
}

export interface PublicEmployee {
  id: string;
  name: string;
  position: string;
  color: string;
}

export interface PublicEmployeeStatus {
  hasOpenAttendance: boolean;
  attendanceId?: string;
  lastCheckIn?: string;
  isInside: boolean;
}

export interface FichajeDelDia {
  id: string;
  checkIn: string;
  minutesLate: number | null;
}

export interface TodayFichajesResponse {
  employeeId: string;
  employeeName: string;
  date: string;
  fichajes: FichajeDelDia[];
  totalFichajes: number;
  totalHorasTrabajadas: number;
}

export const publicFichajeService = {
  getInfo(publicToken: string): Promise<PublicFichajeInfo> {
    return api.get(`/attendance/public/${publicToken}/info`).then((r) => r.data.data);
  },
  getEmployees(publicToken: string): Promise<PublicEmployee[]> {
    return api.get(`/attendance/public/${publicToken}/employees`).then((r) => r.data.data);
  },
  getEmployeeStatus(publicToken: string, employeeId: string): Promise<PublicEmployeeStatus> {
    return api
      .get(`/attendance/public/${publicToken}/employee/${employeeId}/status`)
      .then((r) => r.data.data);
  },
  getTodayFichajes(publicToken: string, employeeId: string): Promise<TodayFichajesResponse> {
    return api
      .get(`/attendance/public/${publicToken}/employee/${employeeId}/today`)
      .then((r) => r.data.data);
  },
  checkIn(publicToken: string, data: {
    employeeId: string;
    pin: string;
    latitude?: number;
    longitude?: number;
    deviceId?: string;
    notes?: string;
  }): Promise<unknown> {
    return api.post('/attendance/public/check-in', { publicToken, ...data }).then((r) => r.data.data);
  },
  checkOut(publicToken: string, data: { attendanceId: string; notes?: string }): Promise<unknown> {
    return api.post('/attendance/public/check-out', { publicToken, ...data }).then((r) => r.data.data);
  },
  requestPinChange(publicToken: string, employeeId: string, email: string): Promise<{ success: boolean; message?: string }> {
    return api.post('/attendance/request-pin-change', { publicToken, employeeId, email }).then((r) => r.data);
  },
  forgotPin(publicToken: string, employeeId: string): Promise<{ success: boolean; sent?: boolean; message?: string }> {
    return api.post('/attendance/forgot-pin', { publicToken, employeeId }).then((r) => r.data);
  },
  verifyPinToken(token: string): Promise<{ success: boolean; valid: boolean; employeeId?: string; employeeName?: string }> {
    return api.post('/attendance/verify-pin-token', { token }).then((r) => r.data);
  },
  changePin(token: string, oldPin: string, newPin: string): Promise<{ success: boolean }> {
    return api.post('/attendance/change-pin', { token, oldPin, newPin }).then((r) => r.data);
  },
};
