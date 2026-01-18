import { Shift } from '../../services/shifts';
import { X, Home } from 'lucide-react';

interface ShiftCardProps {
  shift: Shift;
  onDelete: (id: string) => void;
  onEdit?: (shift: Shift) => void;
}

const typeColors = {
  MORNING: 'bg-blue-100 text-blue-800 border-blue-200',
  AFTERNOON: 'bg-orange-100 text-orange-800 border-orange-200',
  NIGHT: 'bg-purple-100 text-purple-800 border-purple-200',
  OFF: 'bg-gray-100 text-gray-800 border-gray-200',
};

const typeLabels = {
  MORNING: 'Mañana',
  AFTERNOON: 'Tarde',
  NIGHT: 'Noche',
  OFF: 'Descanso',
};

export default function ShiftCard({ shift, onDelete, onEdit }: ShiftCardProps) {
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const calculateHours = () => {
    // Los días libres no tienen horas
    if (shift.type === 'OFF' || !shift.startTime || !shift.endTime) return 0;
    const start = parseTime(shift.startTime);
    let end = parseTime(shift.endTime);
    if (end < start) end += 24;
    return Math.round((end - start) * 100) / 100;
  };

  // Si es día libre, mostrar estilo especial
  if (shift.type === 'OFF') {
    return (
      <div
        className="relative w-full flex items-center justify-center py-2 px-3 rounded border border-gray-300 text-xs cursor-pointer hover:shadow-md transition-shadow bg-transparent"
        onClick={handleClick}
        style={{
          background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 10px, #e5e7eb 10px, #e5e7eb 20px)',
        }}
      >
        <div className="flex items-center space-x-2 text-gray-700">
          <Home className="h-4 w-4" />
          <span className="font-medium">Día libre</span>
        </div>
        <button
          onClick={handleDelete}
          className="absolute top-1 right-1 p-1 rounded hover:bg-black/10 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

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

  return (
    <div
      className={`relative mb-1 p-2 rounded border text-xs cursor-pointer hover:shadow-md transition-shadow ${
        typeColors[shift.type]
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium">{typeLabels[shift.type]}</div>
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
          className="ml-2 p-1 rounded hover:bg-black/10 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
