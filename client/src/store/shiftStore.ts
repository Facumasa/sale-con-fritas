import { create } from 'zustand';
import { shiftService, WeeklySchedule, Shift, CreateShiftRequest, UpdateShiftRequest } from '../services/shifts';

interface ShiftState {
  shifts: Shift[];
  weeklySchedule: WeeklySchedule | null;
  currentWeek: number;
  currentYear: number;
  isLoading: boolean;
  error: string | null;
  fetchWeekly: (week: number, year: number) => Promise<void>;
  addShift: (data: CreateShiftRequest) => Promise<void>;
  updateShift: (id: string, data: UpdateShiftRequest) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  setWeek: (week: number, year: number) => void;
  clearError: () => void;
}

// Función para obtener la semana actual
const getCurrentWeek = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  const week = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return { week, year: now.getFullYear() };
};

export const useShiftStore = create<ShiftState>((set, get) => {
  const { week, year } = getCurrentWeek();

  return {
    shifts: [],
    weeklySchedule: null,
    currentWeek: week,
    currentYear: year,
    isLoading: false,
    error: null,

    fetchWeekly: async (week: number, year: number) => {
      set({ isLoading: true, error: null });
      try {
        const schedule = await shiftService.getWeekly(week, year);
        set({
          weeklySchedule: schedule,
          currentWeek: week,
          currentYear: year,
          isLoading: false,
        });
      } catch (error: any) {
        set({
          error: error.response?.data?.error || 'Error al cargar horario semanal',
          isLoading: false,
        });
      }
    },

    addShift: async (data) => {
      set({ error: null });
      try {
        await shiftService.create(data);
        // Refrescar el horario semanal después de agregar
        const { currentWeek, currentYear } = get();
        await get().fetchWeekly(currentWeek, currentYear);
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || 'Error al crear turno';
        set({ error: errorMessage });
        throw error;
      }
    },

    updateShift: async (id, data) => {
      set({ error: null });
      try {
        await shiftService.update(id, data);
        // Refrescar el horario semanal después de actualizar
        const { currentWeek, currentYear } = get();
        await get().fetchWeekly(currentWeek, currentYear);
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || 'Error al actualizar turno';
        set({ error: errorMessage });
        throw error;
      }
    },

    deleteShift: async (id) => {
      set({ error: null });
      try {
        await shiftService.delete(id);
        // Refrescar el horario semanal después de eliminar
        const { currentWeek, currentYear } = get();
        await get().fetchWeekly(currentWeek, currentYear);
      } catch (error: any) {
        const errorMessage = error.response?.data?.error || 'Error al eliminar turno';
        set({ error: errorMessage });
        throw error;
      }
    },

    setWeek: (week: number, year: number) => {
      set({ currentWeek: week, currentYear: year });
    },

    clearError: () => set({ error: null }),
  };
});
