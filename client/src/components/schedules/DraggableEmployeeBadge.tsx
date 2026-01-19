import { useDraggable } from '@dnd-kit/core';
import { Shift } from '../../services/shifts';
import EmployeeBadge from './EmployeeBadge';

interface DraggableEmployeeBadgeProps {
  shift: Shift;
  employeeName: string;
  employeeColor: string;
  onClick?: (shift: Shift) => void;
}

export default function DraggableEmployeeBadge({
  shift,
  employeeName,
  employeeColor,
  onClick,
}: DraggableEmployeeBadgeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shift.id,
  });

  const handleClick = () => {
    if (onClick && !isDragging) {
      onClick(shift);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-50 scale-95 z-50' : 'opacity-100'}
    >
      <EmployeeBadge
        employeeName={employeeName}
        employeeColor={employeeColor}
        draggable={true}
        onClick={handleClick}
        className="mb-1"
      />
    </div>
  );
}
