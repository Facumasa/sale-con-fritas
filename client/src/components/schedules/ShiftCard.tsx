import { Shift } from '../../services/shifts';
import { X } from 'lucide-react';

interface ShiftCardProps {
  shift: Shift;
  onDelete: (id: string) => void;
  onEdit?: (shift: Shift) => void;
}

const typeColors = {
  MORNING: 'bg-blue-100 text-blue-800 border-blue-200',
  AFTERNOON: 'bg-orange-100 text-orange-800 border-orange-200',
  NIGHT: 'bg-purple-100 text-purple-800 border-purple-200',
};

const typeLabels = {
  MORNING: 'Mañana',
  AFTERNOON: 'Tarde',
  NIGHT: 'Noche',
};

export default function ShiftCard({ shift, onDelete, onEdit }: ShiftCardProps) {
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const calculateHours = () => {
    if (!shift.startTime || !shift.endTime) return 0;
    const start = parseTime(shift.startTime);
    let end = parseTime(shift.endTime);
    if (end < start) end += 24;
    return Math.round((end - start) * 100) / 100;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que quieres eliminar este turno?')) {
      onDelete(shift.id);
    }
  };

  const handleClick = () => {
    if (onEdit) {
      onEdit(shift);
    }
  };

  // Si el turno es de tipo OFF (legacy), no mostrar nada
  // El componente WeeklyView mostrará "Libre" automáticamente
  if (shift.type === 'OFF') {
    return null;
  }

  return (
    <div
      className={`relative mb-1 p-2 rounded border text-xs cursor-pointer hover:shadow-md transition-shadow ${
        typeColors[shift.type as keyof typeof typeColors]
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium">{typeLabels[shift.type as keyof typeof typeLabels]}</div>
          {shift.startTime && shift.endTime && (
            <>
              <div className="text-xs opacity-75">
                {shift.startTime} - {shift.endTime}
              </div>
              <div className="text-xs opacity-75">{calculateHours()}h</div>
            </>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="ml-2 p-1 rounded hover:bg-black/10 transition-colors export-hide"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
