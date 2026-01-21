import { CheckCircle, AlertTriangle, TrendingUp, Users, Clock } from 'lucide-react';
import { ScheduleOption } from '../../services/ai';

interface ScheduleOptionCardProps {
  option: ScheduleOption;
  isSelected: boolean;
  onSelect: () => void;
  employees: any[];
}

const ScheduleOptionCard = ({ option, isSelected, onSelect, employees }: ScheduleOptionCardProps) => {
  return (
    <div
      onClick={onSelect}
      className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-lg' 
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-xl font-bold text-gray-900 mb-1">
            {option.name}
          </h4>
          <p className="text-sm text-gray-600">
            {option.description}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Score badge */}
          <div className={`px-3 py-1 rounded-full font-semibold text-sm
            ${option.complianceScore >= 90 
              ? 'bg-green-100 text-green-700' 
              : option.complianceScore >= 70
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'}`}
          >
            {option.complianceScore}% cumplimiento
          </div>

          {/* Checkbox */}
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
            ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}
          >
            {isSelected && <CheckCircle size={16} className="text-white" />}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock size={16} className="text-gray-400" />
          <span className="text-gray-600">
            {option.metrics.totalHours.toFixed(1)}h totales
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Users size={16} className="text-gray-400" />
          <span className="text-gray-600">
            {option.metrics.employeesUsed} empleados
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <TrendingUp size={16} className="text-gray-400" />
          <span className="text-gray-600">
            {option.metrics.constraintsMet}/{option.metrics.constraintsTotal} cumplidas
          </span>
        </div>
      </div>

      {/* Warnings */}
      {option.warnings && option.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {option.warnings.map((warning, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Preview mini-table (opcional) */}
      {isSelected && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>✓ {option.shifts.length} turnos programados</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleOptionCard;
