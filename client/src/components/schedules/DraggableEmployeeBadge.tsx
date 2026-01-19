import { useDraggable } from '@dnd-kit/core';
import { Shift } from '../../services/shifts';

interface DraggableEmployeeBadgeProps {
  shift: Shift;
  employeeName: string;
  employeeColor: string;
  badgeStyle: string;
  onClick?: (shift: Shift) => void;
}

export default function DraggableEmployeeBadge({
  shift,
  employeeName,
  employeeColor,
  badgeStyle,
  onClick,
}: DraggableEmployeeBadgeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shift.id,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (onClick && !isDragging) {
      onClick(shift);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium
                  backdrop-blur-sm bg-opacity-60 border shadow-sm
                  transition-all duration-200 cursor-grab active:cursor-grabbing
                  ${isDragging ? 'opacity-50 scale-95 z-50' : 'opacity-100 hover:shadow-md'}
                  ${badgeStyle}`}
      title={`${employeeName} - ${shift.startTime} a ${shift.endTime}`}
    >
      {employeeName}
    </div>
  );
}
