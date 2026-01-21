import { Calendar, Users, Clock, TrendingUp } from 'lucide-react';
import { useAIStore } from '../../store/aiStore';
import { ScheduleConstraint } from '../../services/ai';

interface QuickConstraintButtonsProps {
  employees: any[];
}

const QuickConstraintButtons = ({ employees }: QuickConstraintButtonsProps) => {
  const { addConstraint } = useAIStore();

  const quickActions = [
    {
      icon: TrendingUp,
      label: 'Balancear horas',
      action: () => {
        const constraint: ScheduleConstraint = {
          id: `quick-${Date.now()}`,
          type: 'shift_pattern',
          description: 'Distribuir horas equitativamente entre todos los empleados',
          details: {},
        };
        addConstraint(constraint);
      }
    },
    {
      icon: Calendar,
      label: 'Maximizar días libres',
      action: () => {
        const constraint: ScheduleConstraint = {
          id: `quick-${Date.now()}`,
          type: 'employee_preference',
          description: 'Intentar dar el máximo de días libres consecutivos posibles',
          details: {},
        };
        addConstraint(constraint);
      }
    },
    {
      icon: Clock,
      label: 'Minimizar nocturnos',
      action: () => {
        const constraint: ScheduleConstraint = {
          id: `quick-${Date.now()}`,
          type: 'shift_pattern',
          description: 'Reducir al mínimo los turnos nocturnos',
          details: {},
        };
        addConstraint(constraint);
      }
    },
    {
      icon: Users,
      label: 'Cobertura fines de semana',
      action: () => {
        const constraint: ScheduleConstraint = {
          id: `quick-${Date.now()}`,
          type: 'minimum_staff',
          description: 'Asegurar cobertura completa los fines de semana',
          details: {
            days: ['saturday', 'sunday'],
            minStaff: 3,
          },
        };
        addConstraint(constraint);
      }
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {quickActions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <button
            key={idx}
            onClick={action.action}
            className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg
                     hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
          >
            <Icon size={24} className="text-gray-600 group-hover:text-blue-600" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-center">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default QuickConstraintButtons;
