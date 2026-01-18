import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEmployeeStore } from '../../store/employeeStore';
import { useShiftStore } from '../../store/shiftStore';
import { Calendar, Users, Clock, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
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

  const tools = [
    {
      name: 'Horarios',
      description: 'Gestiona los horarios de tus empleados',
      icon: Calendar,
      href: '/horarios',
      available: true,
    },
    {
      name: 'Inventario',
      description: 'Control de inventario y productos',
      icon: Calendar,
      href: '#',
      available: false,
    },
    {
      name: 'Reservas',
      description: 'Sistema de reservas de mesas',
      icon: Calendar,
      href: '#',
      available: false,
    },
    {
      name: 'Comandas',
      description: 'Gestión de pedidos y comandas',
      icon: Calendar,
      href: '#',
      available: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-gray-600 mt-1">
          Aquí tienes un resumen de tu restaurante
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Empleados</p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Turnos esta Semana</p>
              <p className="text-2xl font-bold text-gray-900">
                {weeklySchedule?.employees.reduce(
                  (acc, emp) => acc + emp.shifts.length,
                  0
                ) || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Horas Programadas</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tools */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Herramientas</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 rounded-lg p-3">
                  <tool.icon className="h-6 w-6 text-blue-600" />
                </div>
                {!tool.available && (
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    Próximamente
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {tool.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{tool.description}</p>
              {tool.available ? (
                <Link
                  to={tool.href}
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Ir a {tool.name}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center text-sm font-medium text-gray-400 cursor-not-allowed">
                  No disponible
                  <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
