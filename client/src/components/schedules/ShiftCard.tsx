import { Shift } from '../../services/shifts';
import { X } from 'lucide-react';
import { Employee } from '../../services/employees';

interface ShiftCardProps {
  shift: Shift;
  employee?: Employee;
  onDelete: (id: string) => void;
  onEdit?: (shift: Shift) => void;
}

const typeEmojis = {
  MORNING: '☀️',
  AFTERNOON: '🌆',
  NIGHT: '🌙',
};

const typeLabels = {
  MORNING: 'Mañana',
  AFTERNOON: 'Tarde',
  NIGHT: 'Noche',
};

// Convertir color hexadecimal a RGB para opacidad
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function ShiftCard({ shift, employee, onDelete, onEdit }: ShiftCardProps) {
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

  // Color del empleado o color por defecto
  const employeeColor = employee?.color || '#3b82f6';
  const backgroundColor = hexToRgba(employeeColor, 0.1); // 10% opacidad
  const borderColor = employeeColor;
  const dotPatternColor = hexToRgba(employeeColor, 0.3); // 30% para patrón de puntos
  const gradientColor1 = hexToRgba(employeeColor, 0.1);
  const gradientColor2 = hexToRgba(employeeColor, 0.2);

  // Estilos base comunes
  const baseStyles = 'relative rounded-lg p-3 backdrop-blur-sm hover:shadow-md transition-all duration-200 cursor-pointer border-l-4';

  // Estilos específicos según tipo de turno
  let typeStyles = '';
  let typeIndicator = null;
  let dotPattern = null;

  switch (shift.type) {
    case 'MORNING':
      typeStyles = baseStyles;
      break;
    
    case 'AFTERNOON':
      typeStyles = baseStyles;
      dotPattern = (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            backgroundImage: `radial-gradient(circle, ${dotPatternColor} 1px, transparent 1px)`,
            backgroundSize: '10px 10px',
          }}
        />
      );
      break;
    
    case 'NIGHT':
      typeStyles = `${baseStyles} border-t-2`;
      typeIndicator = (
        <span className="text-xs opacity-60 absolute top-2 right-2">
          🌙
        </span>
      );
      break;
  }

  return (
    <div
      className={typeStyles}
      style={{
        backgroundColor,
        borderLeftColor: borderColor,
        ...(shift.type === 'NIGHT' && {
          borderTopColor: hexToRgba(borderColor, 0.5),
          backgroundImage: `linear-gradient(to bottom right, ${gradientColor1}, ${gradientColor2})`,
        }),
      }}
      onClick={handleClick}
    >
      {dotPattern}
      
      {/* Badge de tipo de turno en la esquina superior derecha */}
      {shift.type !== 'NIGHT' && (
        <div className="absolute top-2 right-2">
          <span className="text-xs opacity-60">
            {typeEmojis[shift.type as keyof typeof typeEmojis]}
          </span>
        </div>
      )}
      {typeIndicator}

      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          {shift.startTime && shift.endTime && (
            <>
              <div className="text-sm font-medium text-gray-700 mb-0.5">
                {shift.startTime} - {shift.endTime}
              </div>
              <div className="text-xs text-gray-500">
                {calculateHours()}h
              </div>
            </>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-black/10 transition-all duration-200 export-hide text-gray-400 hover:text-gray-600"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
