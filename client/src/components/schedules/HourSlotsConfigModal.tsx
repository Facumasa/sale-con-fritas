import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { HourlySlot, getHourlySlots, saveHourlySlots, resetToDefaultSlots, DEFAULT_HOURLY_SLOTS } from '../../constants/hourlySlots';

interface HourSlotsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSlotsChange?: (slots: HourlySlot[]) => void;
}

export default function HourSlotsConfigModal({
  isOpen,
  onClose,
  onSlotsChange,
}: HourSlotsConfigModalProps) {
  const [slots, setSlots] = useState<HourlySlot[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSlots(getHourlySlots());
      setError('');
    }
  }, [isOpen]);

  const handleAddSlot = () => {
    const newSlot: HourlySlot = {
      id: `slot-${Date.now()}`,
      startTime: '09:00',
      endTime: '17:00',
    };
    setSlots([...slots, newSlot]);
  };

  const handleRemoveSlot = (id: string) => {
    if (slots.length <= 1) {
      setError('Debe haber al menos una franja horaria');
      return;
    }
    setSlots(slots.filter((slot) => slot.id !== id));
    setError('');
  };

  const handleSlotChange = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setSlots(
      slots.map((slot) => {
        if (slot.id === id) {
          return { ...slot, [field]: value };
        }
        return slot;
      })
    );
    setError('');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSlots = [...slots];
    [newSlots[index - 1], newSlots[index]] = [newSlots[index], newSlots[index - 1]];
    setSlots(newSlots);
  };

  const handleMoveDown = (index: number) => {
    if (index === slots.length - 1) return;
    const newSlots = [...slots];
    [newSlots[index], newSlots[index + 1]] = [newSlots[index + 1], newSlots[index]];
    setSlots(newSlots);
  };

  const handleSave = () => {
    // Validar que no haya slots vacíos
    const invalidSlots = slots.some((slot) => !slot.startTime || !slot.endTime);
    if (invalidSlots) {
      setError('Todos los campos de hora deben estar completos');
      return;
    }

    saveHourlySlots(slots);
    if (onSlotsChange) {
      onSlotsChange(slots);
    }
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('¿Restaurar franjas horarias predeterminadas? Se perderán las personalizaciones.')) {
      resetToDefaultSlots();
      const defaultSlots = [...DEFAULT_HOURLY_SLOTS];
      setSlots(defaultSlots);
      if (onSlotsChange) {
        onSlotsChange(defaultSlots);
      }
      setError('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Configurar Franjas Horarias
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {slots.map((slot, index) => (
                  <div
                    key={slot.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover arriba"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === slots.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover abajo"
                      >
                        <GripVertical className="h-4 w-4 rotate-90" />
                      </button>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Inicio
                        </label>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleSlotChange(slot.id, 'startTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Fin
                        </label>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleSlotChange(slot.id, 'endTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveSlot(slot.id)}
                      disabled={slots.length <= 1}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Eliminar franja"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddSlot}
                className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Añadir Franja Horaria
              </button>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Restaurar Predeterminado
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
