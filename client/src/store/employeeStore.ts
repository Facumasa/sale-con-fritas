import { create } from 'zustand';
import { employeeService, Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '../services/employees';

interface EmployeeState {
  employees: Employee[];
  isLoading: boolean;
  error: string | null;
  fetchEmployees: () => Promise<void>;
  addEmployee: (data: CreateEmployeeRequest) => Promise<void>;
  updateEmployee: (id: string, data: UpdateEmployeeRequest) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useEmployeeStore = create<EmployeeState>((set) => ({
  employees: [],
  isLoading: false,
  error: null,

  fetchEmployees: async () => {
    set({ isLoading: true, error: null });
    try {
      const employees = await employeeService.getAll();
      set({ employees, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Error al cargar empleados',
        isLoading: false,
      });
    }
  },

  addEmployee: async (data) => {
    set({ error: null });
    try {
      const newEmployee = await employeeService.create(data);
      set((state) => ({
        employees: [...state.employees, newEmployee],
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al crear empleado';
      set({ error: errorMessage });
      throw error;
    }
  },

  updateEmployee: async (id, data) => {
    set({ error: null });
    try {
      const updatedEmployee = await employeeService.update(id, data);
      set((state) => ({
        employees: state.employees.map((emp) =>
          emp.id === id ? updatedEmployee : emp
        ),
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al actualizar empleado';
      set({ error: errorMessage });
      throw error;
    }
  },

  deleteEmployee: async (id) => {
    set({ error: null });
    try {
      await employeeService.delete(id);
      set((state) => ({
        employees: state.employees.filter((emp) => emp.id !== id),
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al eliminar empleado';
      set({ error: errorMessage });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
