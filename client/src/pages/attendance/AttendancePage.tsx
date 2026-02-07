import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useEmployeeStore } from '../../store/employeeStore';
import { CheckInOut, AttendanceTable, MonthlyReport } from '../../components/attendance';
import type { Employee } from '../../services/employees';

type TabId = 'hoy' | 'reporte' | 'fichar';

function FicharTab({
  employees,
  currentEmployee,
}: {
  employees: Employee[];
  currentEmployee: Employee | undefined;
}) {
  const [selectedId, setSelectedId] = useState<string>(currentEmployee?.id ?? '');
  const effectiveEmployee = selectedId
    ? employees.find((e) => e.id === selectedId) ?? currentEmployee
    : currentEmployee;

  useEffect(() => {
    if (currentEmployee && !selectedId) setSelectedId(currentEmployee.id);
  }, [currentEmployee, selectedId]);

  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur-sm border border-white/60">
      {employees.length > 0 && (
        <div className="mb-4">
          <label htmlFor="fichar-employee" className="block text-sm font-medium text-gray-700 mb-1">
            Empleado que ficha
          </label>
          <select
            id="fichar-employee"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm w-full max-w-xs"
          >
            <option value="">Selecciona empleado</option>
            {currentEmployee && (
              <option value={currentEmployee.id}>Yo ({currentEmployee.name})</option>
            )}
            {employees
              .filter((e) => e.id !== currentEmployee?.id)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} – {e.position}
                </option>
              ))}
          </select>
        </div>
      )}
      {effectiveEmployee ? (
        <CheckInOut
          employeeId={effectiveEmployee.id}
          employeeName={effectiveEmployee.name}
        />
      ) : (
        <div className="rounded-xl bg-slate-100 px-4 py-6 text-center text-slate-600">
          Selecciona un empleado para fichar.
        </div>
      )}
    </div>
  );
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'hoy', label: 'Asistencia Hoy' },
  { id: 'reporte', label: 'Reporte Mensual' },
  { id: 'fichar', label: 'Fichar' },
];

export default function AttendancePage() {
  const { user } = useAuthStore();
  const { employees, fetchEmployees } = useEmployeeStore();
  const [activeTab, setActiveTab] = useState<TabId>('hoy');

  const role = user?.role ?? '';
  const isEmployee = role === 'EMPLOYEE';
  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  const currentEmployee = employees.find((e) => e.userId === user?.id);

  useEffect(() => {
    if (isEmployee || isOwnerOrAdmin) {
      fetchEmployees();
    }
  }, [isEmployee, isOwnerOrAdmin, fetchEmployees]);

  if (isEmployee) {
    if (!currentEmployee) {
      return (
        <div className="min-h-[40vh] bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <header className="sticky top-0 z-10 mb-6 rounded-xl bg-white/80 py-4 shadow-sm backdrop-blur-sm">
              <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
            </header>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-6 text-center text-amber-800">
              No tienes un perfil de empleado asociado a tu cuenta. Contacta con tu responsable.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[40vh] bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="sticky top-0 z-10 mb-6 rounded-xl bg-white/80 py-4 shadow-sm backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
          </header>
          <CheckInOut employeeId={currentEmployee.id} employeeName={currentEmployee.name} />
        </div>
      </div>
    );
  }

  if (!isOwnerOrAdmin) {
    return (
      <div className="min-h-[40vh] bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="sticky top-0 z-10 mb-6 rounded-xl bg-white/80 py-4 shadow-sm backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
          </header>
          <div className="rounded-xl bg-slate-100 px-4 py-6 text-center text-slate-700">
            No tienes permisos para ver esta sección.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[40vh] bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-10 mb-6 rounded-xl bg-white/80 py-4 shadow-sm backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>

          <nav className="mt-4 flex gap-1" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {activeTab === 'hoy' && <AttendanceTable />}
        {activeTab === 'reporte' && <MonthlyReport />}
        {activeTab === 'fichar' && (
          <FicharTab
            employees={employees}
            currentEmployee={currentEmployee}
          />
        )}
      </div>
    </div>
  );
}
