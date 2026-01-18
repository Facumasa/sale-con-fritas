import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { useEmployeeStore } from '../../store/employeeStore';
import { Shift, CreateShiftRequest } from '../../services/shifts';
import { shiftService } from '../../services/shifts';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateShiftRequest) => Promise<void>;
  editingShift?: Shift | null;
  selectedDate?: Date;
  preselectedEmployeeId?: string;
  preselectedDate?: string;
}

// Función para determinar el tipo de turno según la hora de inicio
const getShiftTypeFromStartTime = (startTime: string): 'MORNING' | 'AFTERNOON' | 'NIGHT' => {
  if (!startTime) return 'MORNING';
  
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  
  // MORNING: 06:00 - 14:59 (360 - 899 minutos)
  // AFTERNOON: 15:00 - 21:59 (900 - 1319 minutos)
  // NIGHT: 22:00 - 05:59 (1320 - 1439 o 0 - 359 minutos)
  
  if (totalMinutes >= 360 && totalMinutes < 900) {
    return 'MORNING';
  } else if (totalMinutes >= 900 && totalMinutes < 1320) {
    return 'AFTERNOON';
  } else {
    return 'NIGHT'; // 22:00-23:59 o 00:00-05:59
  }
};

// Configuración de badges por tipo
const typeBadgeConfig = {
  MORNING: {
    emoji: '🌅',
    label: 'Turno de Mañana',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  AFTERNOON: {
    emoji: '🌆',
    label: 'Turno de Tarde',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  NIGHT: {
    emoji: '🌙',
    label: 'Turno de Noche',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

export default function AddShiftModal({
  isOpen,
  onClose,
  onSave,
  editingShift,
  selectedDate,
  preselectedEmployeeId,
  preselectedDate,
}: AddShiftModalProps) {
  const { employees } = useEmployeeStore();
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingShifts, setExistingShifts] = useState<Shift[]>([]);

  // Calcular tipo automáticamente basado en hora de inicio
  const detectedType = getShiftTypeFromStartTime(startTime);

  // Obtener turnos existentes del empleado para el día seleccionado
  useEffect(() => {
    const fetchExistingShifts = async () => {
      if (!employeeId || !date || editingShift) {
        setExistingShifts([]);
        return;
      }

      try {
        const shifts = await shiftService.getByEmployee(employeeId, date, date);
        // Filtrar solo los turnos del día exacto (no OFF legacy)
        const targetDate = new Date(date);
        const shiftsForDay = shifts.filter((shift) => {
          const shiftDate = new Date(shift.date);
          const isSameDay =
            shiftDate.getDate() === targetDate.getDate() &&
            shiftDate.getMonth() === targetDate.getMonth() &&
            shiftDate.getFullYear() === targetDate.getFullYear();
          return isSameDay && shift.type !== 'OFF';
        });
        setExistingShifts(shiftsForDay);
      } catch (err) {
        // Si hay error, no mostrar advertencia
        setExistingShifts([]);
      }
    };

    fetchExistingShifts();
  }, [employeeId, date, editingShift]);

  useEffect(() => {
    if (editingShift) {
      setEmployeeId(editingShift.employeeId);
      setDate(editingShift.date.split('T')[0]);
      setStartTime(editingShift.startTime);
      setEndTime(editingShift.endTime);
      setNotes(editingShift.notes || '');
    } else {
      // Aplicar preselecciones
      if (preselectedEmployeeId) {
        setEmployeeId(preselectedEmployeeId);
      }
      if (preselectedDate) {
        setDate(preselectedDate);
      } else if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        setDate(`${year}-${month}-${day}`);
      }
    }
  }, [editingShift, selectedDate, preselectedEmployeeId, preselectedDate]);

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const start = parseTime(startTime);
    let end = parseTime(endTime);
    if (end < start) end += 24;
    return Math.round((end - start) * 100) / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!employeeId || !date) {
      setError('Por favor completa todos los campos requeridos');
      setLoading(false);
      return;
    }

    // Validar que se completen las horas
    if (!startTime || !endTime) {
      setError('Por favor completa las horas de inicio y fin');
      setLoading(false);
      return;
    }

    try {
      // El tipo se determina automáticamente según la hora de inicio
      const type = getShiftTypeFromStartTime(startTime);
      
      await onSave({
        employeeId,
        date,
        startTime,
        endTime,
        type,
        notes: notes || undefined,
      });
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar turno');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmployeeId('');
    setDate('');
    setStartTime('09:00');
    setEndTime('17:00');
    setNotes('');
    setError('');
    setExistingShifts([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingShift ? 'Editar Turno' : 'Añadir Turno'}
              </h3>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Advertencia informativa si el empleado ya tiene turnos ese día */}
              {!editingShift && existingShifts.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm flex items-start">
                  <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>ℹ️ Este empleado ya tiene {existingShifts.length} turno{existingShifts.length > 1 ? 's' : ''} este día.</strong>
                    <p className="mt-1 text-blue-700">
                      Asegúrate de que no se solapen los horarios. Turnos existentes:
                    </p>
                    <ul className="mt-1 ml-4 list-disc text-blue-700">
                      {existingShifts.map((shift) => (
                        <li key={shift.id}>
                          {shift.startTime} - {shift.endTime}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empleado
                </label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecciona un empleado</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Badge de preview del tipo detectado */}
              {startTime && (
                <div className={`inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium ${typeBadgeConfig[detectedType].className}`}>
                  <span className="mr-2">{typeBadgeConfig[detectedType].emoji}</span>
                  {typeBadgeConfig[detectedType].label}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-900">
                  <strong>Horas totales:</strong> {calculateHours()} horas
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : editingShift ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
