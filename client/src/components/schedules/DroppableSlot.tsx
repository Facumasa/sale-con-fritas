import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';

interface DroppableSlotProps {
  id: string;
  children: ReactNode;
  className?: string;
  isEmpty?: boolean;
}

export default function DroppableSlot({
  id,
  children,
  className = '',
  isEmpty = false,
}: DroppableSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const baseClasses = `px-4 py-3 align-top relative group transition-all duration-200 
                       border min-h-[60px] ${isEmpty ? 'bg-gray-50/40 backdrop-blur-sm' : 'bg-white/60 backdrop-blur-sm hover:bg-gray-50/80'}`;

  const borderClass = isOver
    ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50'
    : 'border-gray-200/40';

  return (
    <td
      ref={setNodeRef}
      className={`${baseClasses} ${borderClass} ${className}`}
    >
      {children}
    </td>
  );
}
