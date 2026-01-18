import { WeeklySchedule, Shift } from '../../services/shifts';
import ShiftCard from './ShiftCard';
import { Plus, Home } from 'lucide-react';

interface WeeklyViewProps {
  schedule: WeeklySchedule;
  onDeleteShift: (id: string) => void;
  onEditShift?: (shift: Shift) => void;
  onAddShift?: (employeeId: string, date: string) => void;
}

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function WeeklyView({ schedule, onDeleteShift, onEditShift, onAddShift }: WeeklyViewProps) {
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const calculateHours = (shifts: Shift[]) => {
    let total = 0;
    shifts.forEach((shift) => {
      // Solo contar turnos con horas válidas
      if (!shift.startTime || !shift.endTime) return;
      const start = parseTime(shift.startTime);
      let end = parseTime(shift.endTime);
      if (end < start) end += 24;
      total += end - start;
    });
    return Math.round(total * 100) / 100;
  };

  const getDayOfWeek = (dateStr: string): number => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 ? 6 : day - 1; // Lunes = 0, Domingo = 6
  };

  const getShiftsForDay = (employeeShifts: Shift[], dayIndex: number): Shift[] => {
    // Calcular la fecha del día basada en la semana
    const weekStart = getWeekStartDate(schedule.week, schedule.year);
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayIndex);

    return employeeShifts.filter((shift) => {
      const shiftDate = new Date(shift.date);
      return (
        shiftDate.getDate() === dayDate.getDate() &&
        shiftDate.getMonth() === dayDate.getMonth() &&
        shiftDate.getFullYear() === dayDate.getFullYear()
      );
    });
  };

  const getWeekStartDate = (week: number, year: number): Date => {
    const jan1 = new Date(year, 0, 1);
    const daysOffset = (jan1.getDay() + 6) % 7; // Ajustar para que lunes = 0
    const firstMonday = new Date(jan1);
    firstMonday.setDate(jan1.getDate() - daysOffset);
    const weekMonday = new Date(firstMonday);
    weekMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
    return weekMonday;
  };

  const getDateForDay = (dayIndex: number): string => {
    const weekStart = getWeekStartDate(schedule.week, schedule.year);
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayIndex);
    const year = dayDate.getFullYear();
    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Formatear fecha para mostrar en header (DD/MM)
  const getFormattedDateForDay = (dayIndex: number): string => {
    const weekStart = getWeekStartDate(schedule.week, schedule.year);
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayIndex);
    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayDate.getDate()).padStart(2, '0');
    return `${day}/${month}`;
  };

  const handleAddShift = (e: React.MouseEvent, employeeId: string, dayIndex: number) => {
    e.stopPropagation();
    if (onAddShift) {
      const date = getDateForDay(dayIndex);
      onAddShift(employeeId, date);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                Empleado
              </th>
              {daysOfWeek.map((day, dayIndex) => (
                <th
                  key={day}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                >
                  <div className="flex flex-col items-center">
                    <div className="font-semibold">{day}</div>
                    <div className="text-xs text-gray-500 font-normal mt-0.5">
                      {getFormattedDateForDay(dayIndex)}
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total hrs
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {schedule.employees.map((employee) => {
              const totalHours = calculateHours(employee.shifts);
              return (
                <tr key={employee.employeeId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="text-sm font-medium text-gray-900">
                      {employee.employeeName}
                    </div>
                    <div className="text-xs text-gray-500">{employee.employeePosition}</div>
                  </td>
                  {daysOfWeek.map((day, dayIndex) => {
                    const dayShifts = getShiftsForDay(employee.shifts, dayIndex);
                    const hasShifts = dayShifts.length > 0;
                    return (
                      <td
                        key={dayIndex}
                        className={`px-2 py-2 align-top relative group transition-colors ${
                          !hasShifts 
                            ? '' 
                            : 'hover:bg-gray-50'
                        }`}
                        style={
                          !hasShifts
                            ? {
                                background: 'repeating-linear-gradient(45deg, #fafafa, #fafafa 12px, #f5f5f5 12px, #f5f5f5 24px)',
                              }
                            : undefined
                        }
                      >
                        {hasShifts ? (
                          <div className="space-y-1.5">
                            {dayShifts.map((shift, idx) => (
                              <div key={shift.id}>
                                <ShiftCard
                                  shift={shift}
                                  onDelete={onDeleteShift}
                                  onEdit={onEditShift}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-2 px-3 text-xs text-gray-400">
                            <Home className="h-4 w-4 mb-1" />
                            <span className="text-[10px] font-medium">Libre</span>
                          </div>
                        )}
                        {onAddShift && (
                          <button
                            onClick={(e) => handleAddShift(e, employee.employeeId, dayIndex)}
                            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-blue-700 transition-all shadow-sm z-10 export-hide"
                            title="Añadir turno"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                    {totalHours}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
