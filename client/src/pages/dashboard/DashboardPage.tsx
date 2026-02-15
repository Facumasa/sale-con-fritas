import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEmployeeStore } from '../../store/employeeStore';
import { useShiftStore } from '../../store/shiftStore';
import { Calendar, Users, Clock, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { employees, fetchEmployees } = useEmployeeStore();
  const { weeklySchedule, currentWeek, currentYear, fetchWeekly } = useShiftStore();
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    fetchEmployees();
    fetchWeekly(currentWeek, currentYear);
  }, []);

  useEffect(() => {
    if (weeklySchedule) {
      let hours = 0;
      weeklySchedule.employees.forEach((emp) => {
        emp.shifts.forEach((shift) => {
          const start = parseTime(shift.startTime);
          let end = parseTime(shift.endTime);
          if (end < start) end += 24;
          hours += end - start;
        });
      });
      setTotalHours(Math.round(hours * 100) / 100);
    }
  }, [weeklySchedule]);

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const weekShiftsCount =
    weeklySchedule?.employees.reduce((acc, emp) => acc + emp.shifts.length, 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>

      {/* Welcome Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900">
          Bienvenido de nuevo, {user?.name}
        </h2>
        <p className="text-gray-600 mt-1">
          Aquí tienes un resumen de tu restaurante
        </p>
      </div>

      {/* Resumen */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumen</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Empleados - VERDE */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/employees')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/employees')}
            className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-50 rounded-lg">
                <Users className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Empleados</p>
                <p className="text-3xl font-bold text-gray-900">{employees.length}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Turnos esta Semana - NARANJA */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/horarios')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/horarios')}
            className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Turnos esta Semana</p>
                <p className="text-3xl font-bold text-gray-900">{weekShiftsCount}</p>
              </div>
            </div>
          </div>

          {/* Card 3: Horas Programadas - MORADO */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/horarios')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/horarios')}
            className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Horas Programadas</p>
                <p className="text-3xl font-bold text-gray-900">{totalHours}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Horarios - VERDE */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/horarios')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/horarios')}
            className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-brand-500/20 p-6 hover:border-brand-500 hover:shadow-md transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-50 rounded-lg group-hover:bg-brand-100 transition-colors">
                <Calendar className="w-6 h-6 text-brand-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Horarios</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Gestiona los horarios de tus empleados
                </p>
                <span className="text-brand-600 hover:text-brand-700 font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                  Ir a Horarios
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>

          {/* Card Fichaje - AZUL */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/attendance')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/attendance')}
            className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-blue-500/20 p-6 hover:border-blue-500 hover:shadow-md transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Fichaje</h3>
                <p className="text-sm text-gray-600 mb-3">Control de asistencia</p>
                <span className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                  Ir a Fichaje
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
