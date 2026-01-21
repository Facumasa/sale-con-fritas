import { useDraggable } from '@dnd-kit/core';
import { Shift } from '../../services/shifts';
import EmployeeBadge from './EmployeeBadge';

interface DraggableEmployeeBadgeProps {
  shift: Shift;
  employeeName: string;
  employeeColor: string;
  onClick?: (shift: Shift) => void;
  onDelete?: (shiftId: string) => void;
}

export default function DraggableEmployeeBadge({
  shift,
  employeeName,
  employeeColor,
  onClick,
  onDelete,
}: DraggableEmployeeBadgeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shift.id,
  });

  const handleClick = () => {
    if (onClick && !isDragging) {
      onClick(shift);
    }
  };

  const handleDelete = () => {
    if (onDelete && !isDragging) {
      onDelete(shift.id);
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
        onDelete={onDelete ? handleDelete : undefined}
        className="mb-1"
      />
    </div>
  );
}
