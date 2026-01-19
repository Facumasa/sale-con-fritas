import { X, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';

interface EmployeeBadgeProps {
  employeeName: string;
  employeeColor: string;
  className?: string;
  draggable?: boolean;
  onDelete?: () => void;
  onClick?: () => void;
  children?: ReactNode;
}

// Convertir color hexadecimal a RGBA
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function EmployeeBadge({
  employeeName,
  employeeColor,
  className = '',
  draggable = false,
  onDelete,
  onClick,
  children,
}: EmployeeBadgeProps) {
  const color = employeeColor || '#3b82f6';

  // Determinar si el className incluye un tamaño de texto personalizado
  const hasCustomTextSize = className.includes('text-xs') || className.includes('text-sm') || className.includes('text-base') || className.includes('text-lg');
  const defaultTextSize = hasCustomTextSize ? '' : 'text-sm';
  
  return (
    <div
      className={`inline-flex items-center px-3 py-1.5 rounded-full
                  font-medium ${defaultTextSize}
                  backdrop-blur-sm border
                  transition-all duration-200
                  ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
                  ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}
                  ${onDelete ? 'pr-2' : ''}
                  ${className}`}
      style={{
        backgroundColor: hexToRgba(color, 0.2), // 20% de opacidad
        borderColor: hexToRgba(color, 0.6), // 60% de opacidad
        color: color, // Color del texto sólido
      }}
      onClick={onClick}
    >
      <span className="font-semibold whitespace-nowrap">{employeeName}</span>
      {children}

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-2 hover:bg-white/50 rounded-full p-0.5 transition-colors"
        >
          <X size={14} className="text-gray-400 hover:text-red-500" />
        </button>
      )}
    </div>
  );
}
