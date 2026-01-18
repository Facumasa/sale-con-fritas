import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { useEmployeeStore } from '../../store/employeeStore';
import { Shift, CreateShiftRequest } from '../../services/shifts';
import { getShiftPresets } from '../../constants/shiftDefaults';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateShiftRequest) => Promise<void>;
  editingShift?: Shift | null;
  selectedDate?: Date;
  preselectedEmployeeId?: string;
  preselectedDate?: string;
}

const typeOptions = [
  { value: 'MORNING', label: 'Mañana' },
  { value: 'AFTERNOON', label: 'Tarde' },
  { value: 'NIGHT', label: 'Noche' },
  { value: 'OFF', label: 'Día libre' },
];

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
  const [type, setType] = useState<'MORNING' | 'AFTERNOON' | 'NIGHT' | 'OFF'>('MORNING');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingShift) {
      setEmployeeId(editingShift.employeeId);
      setDate(editingShift.date.split('T')[0]);
      setStartTime(editingShift.startTime);
      setEndTime(editingShift.endTime);
      setType(editingShift.type as 'MORNING' | 'AFTERNOON' | 'NIGHT');
      setNotes(editingShift.notes || '');
    } else {
      // Aplicar presets cuando cambia el tipo (solo si no es edición)
      const presets = getShiftPresets();
      if (presets[type] && !editingShift) {
        setStartTime(presets[type].startTime || '09:00');
        setEndTime(presets[type].endTime || '17:00');
      }

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
  }, [editingShift, selectedDate, preselectedEmployeeId, preselectedDate, type]);

  // Actualizar horas cuando cambia el tipo (si no está editando)
  useEffect(() => {
    if (!editingShift && isOpen) {
      const presets = getShiftPresets();
      if (presets[type]) {
        setStartTime(presets[type].startTime || '09:00');
        setEndTime(presets[type].endTime || '17:00');
      }
    }
  }, [type, isOpen, editingShift]);

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const calculateHours = () => {
    // Los días libres no tienen horas
    if (type === 'OFF' || !startTime || !endTime) return 0;
    const start = parseTime(startTime);
    let end = parseTime(endTime);
    if (end < start) end += 24;
    return Math.round((end - start) * 100) / 100;
  };

  // Limpiar horas cuando se selecciona OFF
  useEffect(() => {
    if (type === 'OFF' && !editingShift) {
      setStartTime('');
      setEndTime('');
    }
  }, [type, editingShift]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!employeeId || !date || !type) {
      setError('Por favor completa todos los campos requeridos');
      setLoading(false);
      return;
    }

    // Para días libres no se requieren horas
    if (type !== 'OFF' && (!startTime || !endTime)) {
      setError('Por favor completa las horas de inicio y fin');
      setLoading(false);
      return;
    }

    try {
      await onSave({
        employeeId,
        date,
        startTime: type === 'OFF' ? '' : startTime,
        endTime: type === 'OFF' ? '' : endTime,
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
    setType('MORNING');
    setNotes('');
    setError('');
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Turno
                  <span className="ml-2 inline-flex items-center text-xs text-gray-500" title="Horario sugerido - puedes modificarlo">
                    <Info className="h-3 w-3 mr-1" />
                    Horario sugerido
                  </span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'OFF')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {type === 'OFF' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    Los días libres no requieren horario
                  </p>
                </div>
              ) : (
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
                      required={type !== 'OFF'}
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
                      required={type !== 'OFF'}
                    />
                  </div>
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
