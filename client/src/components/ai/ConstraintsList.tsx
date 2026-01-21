import { X } from 'lucide-react';
import { useAIStore } from '../../store/aiStore';
import { ScheduleConstraint } from '../../services/ai';

interface ConstraintsListProps {
  constraints: ScheduleConstraint[];
}

const ConstraintsList = ({ constraints }: ConstraintsListProps) => {
  const { removeConstraint } = useAIStore();

  return (
    <div className="space-y-2">
      {constraints.map((constraint) => (
        <div
          key={constraint.id}
          className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <span className="text-sm text-blue-900">{constraint.description}</span>
          <button
            onClick={() => removeConstraint(constraint.id)}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ConstraintsList;
