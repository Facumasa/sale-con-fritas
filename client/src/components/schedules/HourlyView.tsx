import { useMemo } from 'react';
import { WeeklySchedule, Shift } from '../../services/shifts';
import { HourlySlot, getHourlySlots } from '../../constants/hourlySlots';
import { useEmployeeStore } from '../../store/employeeStore';

interface HourlyViewProps {
  schedule: WeeklySchedule;
  onEditShift?: (shift: Shift) => void;
  onDeleteShift?: (id: string) => void;
}

const daysOfWeek = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

export default function HourlyView({ schedule, onEditShift, onDeleteShift }: HourlyViewProps) {
  const { employees } = useEmployeeStore();
  // Obtener slots directamente sin memo para que se actualice cuando cambien
  const hourlySlots = getHourlySlots();

  // Crear mapa de colores de empleados
  const employeeColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    employees.forEach((emp) => {
      colorMap[emp.id] = emp.color || '#3b82f6';
    });
    return colorMap;
  }, [employees]);

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

  // Formatear franja horaria para mostrar
  const formatSlotLabel = (slot: HourlySlot): string => {
    return `${slot.startTime} - ${slot.endTime}`;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border-2 border-gray-800">
          <thead>
            <tr>
              <th className="border-2 border-gray-800 bg-green-100 px-4 py-3 text-left text-sm font-bold text-gray-900 min-w-[120px]">
                Horario
              </th>
              {daysOfWeek.map((day) => (
                <th
                  key={day}
                  className="border-2 border-gray-800 bg-gray-200 px-4 py-3 text-center text-sm font-bold text-gray-900 min-w-[150px]"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hourlySlots.map((slot) => (
              <tr key={slot.id} className="hover:bg-gray-50">
                <td className="border-2 border-gray-800 bg-green-50 px-4 py-3 text-left text-sm font-medium text-gray-900">
                  {formatSlotLabel(slot)}
                </td>
                {daysOfWeek.map((_, dayIndex) => {
                  const employeesInSlot = getEmployeesForSlot(dayIndex, slot);
                  return (
                    <td
                      key={dayIndex}
                      className={`border-2 border-gray-800 px-3 py-3 align-top ${
                        employeesInSlot.length === 0 ? 'bg-gray-100' : 'bg-white'
                      } hover:bg-gray-100 transition-colors min-h-[60px]`}
                    >
                      {employeesInSlot.length > 0 ? (
                        <div className="space-y-1.5">
                          {employeesInSlot.map(({ shift, employeeName, employeeId }) => {
                            const color = employeeColors[employeeId] || '#3b82f6';
                            return (
                              <div
                                key={shift.id}
                                onClick={() => handleEmployeeBadgeClick(shift)}
                                className="inline-block px-3 py-1.5 rounded-md text-xs font-bold text-white cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                style={{ backgroundColor: color }}
                                title={`${employeeName} - ${shift.startTime} a ${shift.endTime}`}
                              >
                                {employeeName}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 text-center py-2">—</div>
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
