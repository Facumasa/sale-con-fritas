import { useMemo } from 'react';
import { Plus, Settings } from 'lucide-react';
import { WeeklySchedule, Shift } from '../../services/shifts';
import { HourlySlot, getHourlySlots } from '../../constants/hourlySlots';
import { useEmployeeStore } from '../../store/employeeStore';

interface HourlyViewProps {
  schedule: WeeklySchedule;
  onEditShift?: (shift: Shift) => void;
  onDeleteShift?: (id: string) => void;
  onAddShift?: (date: string, startTime: string, endTime: string) => void;
  onConfigSlots?: () => void;
}

const daysOfWeek = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

export default function HourlyView({ schedule, onEditShift, onDeleteShift, onAddShift, onConfigSlots }: HourlyViewProps) {
  const { employees } = useEmployeeStore();
  // Obtener slots directamente sin memo para que se actualice cuando cambien
  const hourlySlots = getHourlySlots();

  // Crear mapa de colores de empleados con estilos suaves
  const getEmployeeBadgeStyle = (employeeId: string) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    if (!employee) {
      return 'bg-blue-50 border-blue-200 text-blue-700';
    }

    const color = employee.color || '#3b82f6';
    
    // Mapear colores comunes a estilos suaves
    const colorMap: Record<string, string> = {
      '#3b82f6': 'bg-blue-50 border-blue-200 text-blue-700',
      '#10b981': 'bg-emerald-50 border-emerald-200 text-emerald-700',
      '#f59e0b': 'bg-amber-50 border-amber-200 text-amber-700',
      '#ef4444': 'bg-rose-50 border-rose-200 text-rose-700',
      '#ec4899': 'bg-pink-50 border-pink-200 text-pink-700',
      '#8b5cf6': 'bg-purple-50 border-purple-200 text-purple-700',
      '#06b6d4': 'bg-cyan-50 border-cyan-200 text-cyan-700',
    };

    return colorMap[color.toLowerCase()] || 'bg-blue-50 border-blue-200 text-blue-700';
  };

  // Función para obtener fecha de un día de la semana
  const getDateForDay = (dayIndex: number): Date => {
    const jan1 = new Date(schedule.year, 0, 1);
    const daysOffset = (jan1.getDay() + 6) % 7;
    const firstMonday = new Date(jan1);
    firstMonday.setDate(jan1.getDate() - daysOffset);
    const weekMonday = new Date(firstMonday);
    weekMonday.setDate(firstMonday.getDate() + (schedule.week - 1) * 7);
    const dayDate = new Date(weekMonday);
    dayDate.setDate(weekMonday.getDate() + dayIndex);
    return dayDate;
  };

  // Función para formatear fecha a string YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convertir hora HH:MM a minutos desde medianoche
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Verificar si un turno se solapa con una franja horaria
  const shiftOverlapsSlot = (shift: Shift, slot: HourlySlot): boolean => {
    const shiftStart = timeToMinutes(shift.startTime);
    let shiftEnd = timeToMinutes(shift.endTime);
    const slotStart = timeToMinutes(slot.startTime);
    let slotEnd = timeToMinutes(slot.endTime);

    // Manejar turnos que cruzan medianoche
    const maxMinutes = 24 * 60;
    if (shiftEnd < shiftStart) {
      shiftEnd += maxMinutes;
    }
    if (slotEnd < slotStart) {
      slotEnd += maxMinutes;
    }

    // Verificar solapamiento: el turno se solapa si empieza antes de que termine la franja
    // y termina después de que empiece la franja
    // También si el turno cruza medianoche y la franja también
    return shiftStart < slotEnd && slotStart < shiftEnd;
  };

  // Obtener turnos para un día específico
  const getShiftsForDay = (dayIndex: number): Shift[] => {
    const dayDate = getDateForDay(dayIndex);
    const dateString = formatDateString(dayDate);

    const allShifts: Shift[] = [];
    schedule.employees.forEach((employeeShift) => {
      employeeShift.shifts.forEach((shift) => {
        const shiftDate = new Date(shift.date);
        const shiftDateString = formatDateString(shiftDate);
        if (shiftDateString === dateString && shift.type !== 'OFF') {
          allShifts.push(shift);
        }
      });
    });

    return allShifts;
  };

  // Obtener empleados que trabajan en una franja horaria específica de un día
  const getEmployeesForSlot = (dayIndex: number, slot: HourlySlot): Array<{ shift: Shift; employeeName: string; employeeId: string }> => {
    const shiftsForDay = getShiftsForDay(dayIndex);
    const employeesInSlot: Array<{ shift: Shift; employeeName: string; employeeId: string }> = [];

    shiftsForDay.forEach((shift) => {
      if (shiftOverlapsSlot(shift, slot)) {
        const employee = schedule.employees.find((emp) => emp.employeeId === shift.employeeId);
        if (employee) {
          employeesInSlot.push({
            shift,
            employeeName: employee.employeeName,
            employeeId: shift.employeeId,
          });
        }
      }
    });

    return employeesInSlot;
  };

  const handleEmployeeBadgeClick = (shift: Shift) => {
    if (onEditShift) {
      onEditShift(shift);
    }
  };

  const handleAddShiftClick = (e: React.MouseEvent, dayIndex: number, slot: HourlySlot) => {
    e.stopPropagation();
    if (onAddShift) {
      const date = formatDateString(getDateForDay(dayIndex));
      onAddShift(date, slot.startTime, slot.endTime);
    }
  };

  // Formatear franja horaria para mostrar
  const formatSlotLabel = (slot: HourlySlot): string => {
    return `${slot.startTime} - ${slot.endTime}`;
  };

  // Formatear fecha para mostrar en header (DD/MM)
  const getFormattedDateForDay = (dayIndex: number): string => {
    const dayDate = getDateForDay(dayIndex);
    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayDate.getDate()).padStart(2, '0');
    return `${day}/${month}`;
  };

  return (
    <div className="bg-gray-50/50 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 bg-gradient-to-b from-gray-50 to-white min-w-[120px] border-b-2 border-gray-200/60">
                <div className="flex flex-col">
                  <div>Horario</div>
                  {onConfigSlots && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfigSlots();
                      }}
                      className="mt-2 text-xs text-gray-500 hover:text-blue-600 transition-all duration-200 flex items-center gap-1"
                      title="Configurar franjas horarias"
                    >
                      <Settings className="h-3 w-3" />
                      <span>Configurar</span>
                    </button>
                  )}
                </div>
              </th>
              {daysOfWeek.map((day, dayIndex) => (
                <th
                  key={day}
                  className="px-6 py-4 text-center text-sm font-semibold text-gray-700 bg-gradient-to-b from-gray-50 to-white min-w-[150px] border-b-2 border-gray-200/60"
                >
                  <div className="flex flex-col items-center">
                    <div>{day}</div>
                    <div className="text-xs text-gray-400 font-normal mt-0.5">
                      {getFormattedDateForDay(dayIndex)}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hourlySlots.map((slot) => (
              <tr key={slot.id} className="border-b border-gray-200/40">
                <td className="px-6 py-4 text-left text-sm font-medium text-gray-700 bg-gradient-to-r from-gray-50 to-white border-r border-gray-200/50">
                  {formatSlotLabel(slot)}
                </td>
                {daysOfWeek.map((_, dayIndex) => {
                  const employeesInSlot = getEmployeesForSlot(dayIndex, slot);
                  return (
                    <td
                      key={dayIndex}
                      className={`px-4 py-3 align-top relative group transition-all duration-200 border border-gray-200/40 min-h-[60px] ${
                        employeesInSlot.length === 0 
                          ? 'bg-gray-50/40 backdrop-blur-sm' 
                          : 'bg-white/60 backdrop-blur-sm hover:bg-gray-50/80'
                      }`}
                    >
                      {employeesInSlot.length > 0 ? (
                        <div className="space-y-2">
                          {employeesInSlot.map(({ shift, employeeName, employeeId }) => {
                            const badgeStyle = getEmployeeBadgeStyle(employeeId);
                            return (
                              <div
                                key={shift.id}
                                onClick={() => handleEmployeeBadgeClick(shift)}
                                className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer backdrop-blur-sm bg-opacity-60 border shadow-sm hover:shadow-md transition-all duration-200 ${badgeStyle}`}
                                title={`${employeeName} - ${shift.startTime} a ${shift.endTime}`}
                              >
                                {employeeName}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-300 text-center py-4">—</div>
                      )}
                      {onAddShift && (
                        <button
                          onClick={(e) => handleAddShiftClick(e, dayIndex, slot)}
                          className="absolute top-1 right-1 w-6 h-6 bg-white/80 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all duration-200 backdrop-blur-sm shadow-sm export-hide"
                          title="Añadir turno"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
