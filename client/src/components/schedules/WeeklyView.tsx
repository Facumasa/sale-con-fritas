import { WeeklySchedule, Shift } from '../../services/shifts';
import ShiftCard from './ShiftCard';
import { Plus } from 'lucide-react';
import { useEmployeeStore } from '../../store/employeeStore';

interface WeeklyViewProps {
  schedule: WeeklySchedule;
  onDeleteShift: (id: string) => void;
  onEditShift?: (shift: Shift) => void;
  onAddShift?: (employeeId: string, date: string) => void;
}

const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function WeeklyView({ schedule, onDeleteShift, onEditShift, onAddShift }: WeeklyViewProps) {
  const { employees } = useEmployeeStore();
  
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
    <div className="bg-gray-50/50 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gradient-to-b from-gray-50 to-white z-10 min-w-[150px] border-b-2 border-gray-200/60">
                Empleado
              </th>
              {daysOfWeek.map((day, dayIndex) => (
                <th
                  key={day}
                  className="px-6 py-4 text-center text-sm font-semibold text-gray-700 min-w-[120px] bg-gradient-to-b from-gray-50 to-white border-b-2 border-gray-200/60"
                >
                  <div className="flex flex-col items-center">
                    <div className="font-semibold">{day}</div>
                    <div className="text-xs text-gray-400 font-normal mt-0.5">
                      {getFormattedDateForDay(dayIndex)}
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 bg-gradient-to-b from-gray-50 to-white border-b-2 border-gray-200/60">
                Total hrs
              </th>
            </tr>
          </thead>
          <tbody>
            {schedule.employees.map((employee) => {
              const totalHours = calculateHours(employee.shifts);
              return (
                <tr key={employee.employeeId} className="border-b border-gray-200/40">
                  <td className="px-6 py-4 sticky left-0 bg-white/80 backdrop-blur-sm z-10 border-r border-gray-200/50 bg-gradient-to-r from-gray-50 to-white">
                    <div className="text-sm font-medium text-gray-700">
                      {employee.employeeName}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{employee.employeePosition}</div>
                  </td>
                  {daysOfWeek.map((day, dayIndex) => {
                    const dayShifts = getShiftsForDay(employee.shifts, dayIndex);
                    const hasShifts = dayShifts.length > 0;
                    return (
                      <td
                        key={dayIndex}
                        className={`px-4 py-3 align-top relative group transition-all duration-300 ease-out border border-gray-200/30 ${
                          !hasShifts 
                            ? 'bg-gray-50/20 backdrop-blur-sm' 
                            : 'bg-white/60 backdrop-blur-sm hover:bg-gray-50/80'
                        }`}
                      >
                        {hasShifts ? (
                          <div className="space-y-2">
                            {dayShifts.map((shift, idx) => {
                              // Buscar el empleado correspondiente al turno
                              const shiftEmployee = employees.find((emp) => emp.id === shift.employeeId);
                              return (
                                <div key={shift.id} className="group">
                                  <ShiftCard
                                    shift={shift}
                                    employee={shiftEmployee}
                                    onDelete={onDeleteShift}
                                    onEdit={onEditShift}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="relative overflow-hidden min-h-[60px] transition-all duration-300 ease-out hover:bg-gradient-to-br hover:from-blue-50/10 hover:to-purple-50/10 hover:shadow-inner group">
                            {/* Patrón de rayas diagonales sutiles */}
                            <div 
                              className="absolute inset-0 opacity-30"
                              style={{
                                backgroundImage: `repeating-linear-gradient(
                                  135deg,
                                  transparent,
                                  transparent 15px,
                                  rgba(229, 231, 235, 0.3) 15px,
                                  rgba(229, 231, 235, 0.3) 16px
                                )`
                              }}
                            />
                            
                            {/* Overlay con gradiente sutil */}
                            <div 
                              className="absolute inset-0 bg-gradient-to-br from-gray-50/40 to-transparent transition-opacity duration-300 group-hover:opacity-60"
                            />
                            
                            {/* Contenido */}
                            <div className="relative z-10 flex flex-col items-center justify-center min-h-[60px] gap-1 animate-fade-in">
                              {/* Icono minimalista - tres líneas horizontales */}
                              <div className="flex flex-col gap-1 transition-transform duration-300 group-hover:scale-110">
                                <div className="w-8 h-0.5 bg-gray-300/40 rounded-full transition-colors duration-300 group-hover:bg-gray-300/60"/>
                                <div className="w-8 h-0.5 bg-gray-300/40 rounded-full transition-colors duration-300 group-hover:bg-gray-300/60"/>
                                <div className="w-8 h-0.5 bg-gray-300/40 rounded-full transition-colors duration-300 group-hover:bg-gray-300/60"/>
                              </div>
                              
                              {/* Texto sutil */}
                              <span className="text-xs font-medium text-gray-300/90 tracking-wide transition-colors duration-300 group-hover:text-gray-400">
                                Libre
                              </span>
                            </div>
                          </div>
                        )}
                        {onAddShift && (
                          <button
                            onClick={(e) => handleAddShift(e, employee.employeeId, dayIndex)}
                            className={`absolute top-2 right-2 w-6 h-6 rounded-full
                                       bg-white/80 backdrop-blur-sm border border-gray-200
                                       flex items-center justify-center
                                       shadow-sm export-hide
                                       transition-all duration-300 ease-out
                                       ${
                                         !hasShifts
                                           ? 'opacity-0 group-hover:opacity-100'
                                           : ''
                                       }
                                       hover:bg-blue-50 hover:border-blue-300 hover:scale-110
                                       hover:shadow-md`}
                            title="Añadir turno"
                          >
                            <Plus size={14} className="text-gray-400 transition-colors duration-300 hover:text-blue-600" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-700 bg-white/60 backdrop-blur-sm border border-gray-200/40">
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
