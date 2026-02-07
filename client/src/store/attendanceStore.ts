import { create } from 'zustand';
import {
  attendanceService,
  AttendanceRecord,
  DailyAttendanceSummary,
  MonthlyReport,
  AttendanceStats,
  AttendanceFilters,
  UpdateAttendanceData,
} from '../services/attendance';

interface AttendanceState {
  attendances: AttendanceRecord[];
  todaySummary: DailyAttendanceSummary | null;
  stats: AttendanceStats | null;
  monthlyReport: MonthlyReport | null;
  loading: boolean;
  error: string | null;
  filters: AttendanceFilters;

  checkIn: (employeeId: string, pin: string, notes?: string) => Promise<AttendanceRecord>;
  checkOut: (attendanceId: string, notes?: string) => Promise<AttendanceRecord>;
  fetchAttendances: () => Promise<void>;
  fetchTodayAttendances: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchMonthlyReport: (year: number, month: number) => Promise<void>;
  fetchEmployeeAttendances: (
    employeeId: string,
    startDate?: string,
    endDate?: string
  ) => Promise<AttendanceRecord[]>;
  generatePin: (employeeId: string) => Promise<string>;
  updateAttendance: (id: string, data: UpdateAttendanceData) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;

  setFilters: (filters: Partial<AttendanceFilters>) => void;
  clearError: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  attendances: [],
  todaySummary: null,
  stats: null,
  monthlyReport: null,
  loading: false,
  error: null,
  filters: {},

  checkIn: async (employeeId, pin, notes) => {
    set({ error: null });
    try {
      const record = await attendanceService.checkIn(employeeId, pin, notes);
      await get().fetchTodayAttendances();
      await get().fetchStats();
      await get().fetchAttendances();
      return record;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Error al registrar entrada';
      set({ error: message });
      throw err;
    }
  },

  checkOut: async (attendanceId, notes) => {
    set({ error: null });
    try {
      const record = await attendanceService.checkOut(attendanceId, notes);
      await get().fetchTodayAttendances();
      await get().fetchStats();
      await get().fetchAttendances();
      return record;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Error al registrar salida';
      set({ error: message });
      throw err;
    }
  },

  fetchAttendances: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const list = await attendanceService.getAttendances(filters);
      set({ attendances: list, loading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Error al cargar asistencias',
        loading: false,
      });
    }
  },

  fetchTodayAttendances: async () => {
    set({ error: null });
    try {
      const summary = await attendanceService.getTodayAttendances();
      set({ todaySummary: summary });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Error al cargar resumen del día',
      });
    }
  },

  fetchStats: async () => {
    set({ error: null });
    try {
      const stats = await attendanceService.getStats();
      set({ stats });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Error al cargar estadísticas',
      });
    }
  },

  fetchMonthlyReport: async (year, month) => {
    set({ loading: true, error: null });
    try {
      const report = await attendanceService.getMonthlyReport(year, month);
      set({ monthlyReport: report, loading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Error al cargar reporte mensual',
        loading: false,
      });
    }
  },

  fetchEmployeeAttendances: async (employeeId, startDate?, endDate?) => {
    set({ loading: true, error: null });
    try {
      const list = await attendanceService.getEmployeeAttendances(
        employeeId,
        startDate,
        endDate
      );
      set({ loading: false });
      return list;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Error al cargar asistencias del empleado',
        loading: false,
      });
      throw err;
    }
  },

  generatePin: async (employeeId) => {
    set({ error: null });
    try {
      const { pin } = await attendanceService.generatePin(employeeId);
      return pin;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Error al generar PIN';
      set({ error: message });
      throw err;
    }
  },

  updateAttendance: async (id, data) => {
    set({ error: null });
    try {
      await attendanceService.updateAttendance(id, data);
      await get().fetchAttendances();
      await get().fetchTodayAttendances();
      await get().fetchStats();
    } catch (err: any) {
      const message = err.response?.data?.error || 'Error al actualizar asistencia';
      set({ error: message });
      throw err;
    }
  },

  deleteAttendance: async (id) => {
    set({ error: null });
    try {
      await attendanceService.deleteAttendance(id);
      await get().fetchAttendances();
      await get().fetchTodayAttendances();
      await get().fetchStats();
    } catch (err: any) {
      const message = err.response?.data?.error || 'Error al eliminar asistencia';
      set({ error: message });
      throw err;
    }
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  clearError: () => set({ error: null }),
}));
