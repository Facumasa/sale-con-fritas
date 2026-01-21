import QuickConstraintButtons from './QuickConstraintButtons';
import ConstraintsList from './ConstraintsList';
import { ScheduleConstraint } from '../../services/ai';

interface StepOneProps {
  freeTextConstraints: string;
  setFreeTextConstraints: (text: string) => void;
  constraints: ScheduleConstraint[];
  employees: any[];
}

const StepOne = ({ freeTextConstraints, setFreeTextConstraints, constraints, employees }: StepOneProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Describe tus necesidades</h3>
        <p className="text-sm text-gray-600 mb-4">
          Escribe en lenguaje natural las restricciones y preferencias para el horario.
        </p>
        
        <textarea
          value={freeTextConstraints}
          onChange={(e) => setFreeTextConstraints(e.target.value)}
          placeholder="Ejemplo:
- María no puede trabajar fines de semana
- Juan necesita miércoles libre
- Ana solo puede trabajar de mañana (12:00-16:00)
- Necesito mínimo 3 personas de 16:00-20:00 los viernes y sábados
- Pedro tiene que trabajar máximo 35 horas semanales"
          className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   font-mono text-sm"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Atajos rápidos</h3>
        <p className="text-sm text-gray-600 mb-4">
          O usa estos botones para añadir restricciones comunes:
        </p>
        <QuickConstraintButtons employees={employees} />
      </div>

      {constraints.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Restricciones añadidas</h3>
          <ConstraintsList constraints={constraints} />
        </div>
      )}
    </div>
  );
};

export default StepOne;
