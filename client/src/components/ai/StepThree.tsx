import ScheduleOptionCard from './ScheduleOptionCard';
import { AlertCircle } from 'lucide-react';
import { ScheduleOption } from '../../services/ai';

interface StepThreeProps {
  options: ScheduleOption[];
  selectedOption: ScheduleOption | null;
  setSelectedOption: (option: ScheduleOption) => void;
  employees: any[];
}

const StepThree = ({ options, selectedOption, setSelectedOption, employees }: StepThreeProps) => {
  if (options.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <AlertCircle size={64} className="text-amber-500" />
        <h3 className="text-xl font-semibold">No se pudieron generar opciones</h3>
        <p className="text-gray-600 text-center max-w-md">
          Las restricciones que especificaste son muy difíciles de cumplir. 
          Intenta ser más flexible o reduce algunas restricciones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Opciones generadas ({options.length})
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Selecciona la opción que más te guste y aplícala a tu horario.
        </p>
      </div>

      <div className="space-y-4">
        {options.map((option) => (
          <ScheduleOptionCard
            key={option.id}
            option={option}
            isSelected={selectedOption?.id === option.id}
            onSelect={() => setSelectedOption(option)}
            employees={employees}
          />
        ))}
      </div>
    </div>
  );
};

export default StepThree;
