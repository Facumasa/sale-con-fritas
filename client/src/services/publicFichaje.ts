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
};
