import { useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { WeeklySchedule, Shift, shiftService } from '../../services/shifts';
import { HourlySlot, getHourlySlots } from '../../constants/hourlySlots';
import { useEmployeeStore } from '../../store/employeeStore';
import DraggableEmployeeBadge from './DraggableEmployeeBadge';
import DroppableSlot from './DroppableSlot';
import EmployeeBadge from './EmployeeBadge';

interface HourlyViewProps {
  schedule: WeeklySchedule;
  onEditShift?: (shift: Shift) => void;
  onDeleteShift?: (id: string) => void;
  onAddShift?: (date: string, startTime: string, endTime: string) => void;
  onConfigSlots?: () => void;
  onRefreshSchedule?: () => void;
}

const daysOfWeek = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

export default function HourlyView({
  schedule,
  onEditShift,
  onDeleteShift,
  onAddShift,
  onConfigSlots,
  onRefreshSchedule,
}: HourlyViewProps) {
  const { employees } = useEmployeeStore();
  const [activeShift, setActiveShift] = useState<{
    shift: Shift;
    employeeName: string;
    employeeColor: string;
  } | null>(null);

  // Obtener slots directamente sin memo para que se actualice cuando cambien
  const hourlySlots = getHourlySlots();

  // Configurar sensores de dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mover 8px antes de iniciar drag
      },
    })
  );

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

  const handleDeleteShift = async (shiftId: string) => {
    // Encontrar el turno para mostrar información en la confirmación
    let shiftToDelete: Shift | null = null;
    let employeeName = 'empleado';
    let dayName = '';
    let timeSlot = '';

    schedule.employees.forEach((employeeShift) => {
      const shift = employeeShift.shifts.find((s) => s.id === shiftId);
      if (shift) {
        shiftToDelete = shift;
        employeeName = employeeShift.employeeName;
        
        // Obtener el día de la semana
        const shiftDate = new Date(shift.date);
        const dayIndex = shiftDate.getDay();
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        dayName = dayNames[dayIndex];
        
        // Obtener el slot de tiempo
        timeSlot = `${shift.startTime} - ${shift.endTime}`;
      }
    });

    if (!shiftToDelete) {
      console.error('Turno no encontrado');
      return;
    }

    // Mostrar confirmación
    const confirmMessage = `¿Eliminar turno de ${employeeName} el ${dayName} (${timeSlot})?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Llamar a la API para eliminar
      if (onDeleteShift) {
        await onDeleteShift(shiftId);
      } else {
        // Si no hay callback, usar el servicio directamente
        await shiftService.delete(shiftId);
      }

      // Refrescar la vista
      if (onRefreshSchedule) {
        onRefreshSchedule();
      }

      // Mostrar mensaje de éxito
      console.log('Turno eliminado correctamente');
    } catch (error: any) {
      console.error('Error al eliminar turno:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error al eliminar turno. Por favor, inténtalo de nuevo.';
      alert(errorMessage);
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

  // Calcular fecha ISO desde el índice del día
  const calculateDateFromDay = (dayIndex: number): string => {
    return formatDateString(getDateForDay(dayIndex));
  };

  // Validar si hay conflicto de horarios
  const hasConflictingShift = (
    employeeId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeShiftId?: string
  ): boolean => {
    const shiftsForDay = getShiftsForDay(
      daysOfWeek.findIndex((_, idx) => calculateDateFromDay(idx) === date)
    );

    const newStart = timeToMinutes(startTime);
    let newEnd = timeToMinutes(endTime);
    if (newEnd < newStart) newEnd += 24 * 60;

    return shiftsForDay.some((shift) => {
      // Excluir el turno que se está moviendo
      if (excludeShiftId && shift.id === excludeShiftId) return false;
      if (shift.employeeId !== employeeId) return false;

      const shiftStart = timeToMinutes(shift.startTime);
      let shiftEnd = timeToMinutes(shift.endTime);
      if (shiftEnd < shiftStart) shiftEnd += 24 * 60;

      // Verificar solapamiento
      return newStart < shiftEnd && shiftStart < newEnd;
    });
  };

  // Manejar inicio del drag
  const handleDragStart = (event: DragStartEvent) => {
    const shiftId = event.active.id as string;

    for (const employeeShift of schedule.employees) {
      const shift = employeeShift.shifts.find((s) => s.id === shiftId);
      if (!shift) continue;

      const foundEmployee = employees.find((e) => e.id === shift.employeeId);
      if (!foundEmployee) continue;

      setActiveShift({
        shift,
        employeeName: foundEmployee.name,
        employeeColor: foundEmployee.color,
      });
      return;
    }
  };

  // Manejar fin del drag
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveShift(null);

    if (!over) return;

    const shiftId = active.id as string;
    const overId = over.id as string;

    // over.id tiene el formato "day-slot" donde slot es "startTime-endTime"
    // Extraer día y slot
    const parts = overId.split('-');
    if (parts.length < 2) return;

    // El día está en la primera parte (índice 0-6)
    const dayIndex = parseInt(parts[0]);
    if (isNaN(dayIndex) || dayIndex < 0 || dayIndex >= daysOfWeek.length) return;

    // El slot está en el resto de las partes (puede contener "-" en las horas)
    // Necesitamos encontrar dónde termina el día y empieza el slot
    // Por ejemplo: "0-12:00-16:00" -> dayIndex=0, slot="12:00-16:00"
    const slotParts = parts.slice(1);
    const slotString = slotParts.join('-'); // "12:00-16:00"

    // Parsear el slot para obtener startTime y endTime
    const [newStartTime, newEndTime] = slotString.split('-');
    if (!newStartTime || !newEndTime) return;

    // Encontrar el turno original
    let originalShift: Shift | null = null;
    for (const employeeShift of schedule.employees) {
      const shift = employeeShift.shifts.find((s) => s.id === shiftId);
      if (shift) {
        originalShift = shift;
        break;
      }
    }

    if (!originalShift || !originalShift.employeeId) return;

    // Calcular nueva fecha
    const newDate = calculateDateFromDay(dayIndex);

    // Validar que no haya conflicto de horarios
    if (
      hasConflictingShift(
        originalShift.employeeId,
        newDate,
        newStartTime,
        newEndTime,
        shiftId
      )
    ) {
      alert('Error: El empleado ya tiene un turno en ese horario');
      return;
    }

    // Actualizar el turno
    try {
      await shiftService.update(shiftId, {
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
      });

      // Refrescar datos
      if (onRefreshSchedule) {
        onRefreshSchedule();
      }

      // Mostrar mensaje de éxito
      // Usar alert temporalmente hasta que se implemente un sistema de toast
      console.log('Turno movido correctamente');
    } catch (error: any) {
      console.error('Error al mover turno:', error);
      alert(
        error.response?.data?.error || 'Error al mover turno. Por favor, inténtalo de nuevo.'
      );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
                  const slotId = `${dayIndex}-${slot.startTime}-${slot.endTime}`;
                  return (
                    <DroppableSlot
                      key={dayIndex}
                      id={slotId}
                      isEmpty={employeesInSlot.length === 0}
                    >
                      {employeesInSlot.length > 0 ? (
                        <div className="space-y-2">
                          {employeesInSlot.map(({ shift, employeeName, employeeId }) => {
                            const employee = employees.find((e) => e.id === employeeId);
                            const employeeColor = employee?.color || '#3b82f6';

                            return (
                              <DraggableEmployeeBadge
                                key={shift.id}
                                shift={shift}
                                employeeName={employeeName}
                                employeeColor={employeeColor}
                                onClick={handleEmployeeBadgeClick}
                                onDelete={handleDeleteShift}
                              />
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
                    </DroppableSlot>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

      <DragOverlay>
        {activeShift ? (
          <EmployeeBadge
            employeeName={activeShift.employeeName}
            employeeColor={activeShift.employeeColor}
            draggable={true}
            className="shadow-lg opacity-90"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
