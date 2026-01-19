import { Shift } from '../../services/shifts';
import { Trash2 } from 'lucide-react';
import { Employee } from '../../services/employees';

interface ShiftCardProps {
  shift: Shift;
  employee?: Employee;
  onDelete: (id: string) => void;
  onEdit?: (shift: Shift) => void;
}

export default function ShiftCard({ shift, employee, onDelete, onEdit }: ShiftCardProps) {
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  const calculateHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const start = parseTime(startTime);
    let end = parseTime(endTime);
    if (end < start) end += 24;
    return Math.round((end - start) * 100) / 100;
  };

  const handleDelete = () => {
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
  
  // Convertir color hexadecimal a RGBA con opacidad ~3% (0.03) para el fondo del card
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div className="group relative">
      <div
        className="rounded-lg p-3 border border-gray-200/40
                   bg-white/60 backdrop-blur-sm
                   hover:shadow-md transition-all duration-200
                   cursor-pointer"
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: employeeColor,
          backgroundColor: hexToRgba(employeeColor, 0.03), // ~3% de opacidad (muy sutil)
        }}
        onClick={handleClick}
      >
        {/* Horarios - más prominentes ahora */}
        {shift.startTime && shift.endTime && (
          <>
            <div className="text-base font-semibold text-gray-700">
              {shift.startTime} - {shift.endTime}
            </div>

            {/* Horas totales */}
            <div className="text-sm text-gray-500 mt-1">
              {calculateHours(shift.startTime, shift.endTime)}h
            </div>
          </>
        )}

        {/* Botón eliminar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
                     transition-opacity duration-200
                     bg-white/90 rounded-full p-1 shadow-sm
                     hover:bg-red-50 border border-gray-200"
        >
          <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
        </button>
      </div>
    </div>
  );
}
