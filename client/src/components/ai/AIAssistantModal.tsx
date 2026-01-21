import { useState } from 'react';
import { X, Sparkles, ChevronRight, CheckCircle } from 'lucide-react';
import { useAIStore } from '../../store/aiStore';
import { useEmployeeStore } from '../../store/employeeStore';
import { useShiftStore } from '../../store/shiftStore';
import { generateScheduleWithAI } from '../../services/ai';
import { shiftService } from '../../services/shifts';
import QuickConstraintButtons from './QuickConstraintButtons';
import ConstraintsList from './ConstraintsList';
import StepOne from './StepOne';
import StepTwo from './StepTwo';
import StepThree from './StepThree';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeek: number;
  currentYear: number;
  hourlySlots: string[];
}

// Helper para calcular la fecha desde el día de la semana (1-7, donde 1 = lunes)
const getWeekStartDate = (week: number, year: number): Date => {
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (jan1.getDay() + 6) % 7; // Ajustar para que lunes = 0
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() - daysOffset);
  const weekMonday = new Date(firstMonday);
  weekMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
  return weekMonday;
};

// Helper para convertir día (1-7) a fecha string (YYYY-MM-DD)
const calculateDateFromDay = (day: number, week: number, year: number): string => {
  const weekStart = getWeekStartDate(week, year);
  const dayDate = new Date(weekStart);
  dayDate.setDate(weekStart.getDate() + (day - 1)); // day 1 = lunes, day 7 = domingo
  const yearStr = dayDate.getFullYear();
  const monthStr = String(dayDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(dayDate.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
};

// Helper para determinar el tipo de turno
const determineShiftType = (startTime: string, endTime: string): 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'OFF' => {
  const [startHour] = startTime.split(':').map(Number);
  if (startHour >= 6 && startHour < 12) {
    return 'MORNING';
  } else if (startHour >= 12 && startHour < 18) {
    return 'AFTERNOON';
  } else {
    return 'NIGHT';
  }
};

const AIAssistantModal = ({ isOpen, onClose, currentWeek, currentYear, hourlySlots }: AIAssistantModalProps) => {
  const [step, setStep] = useState(1); // 1: Input, 2: Generate, 3: Review
  const { 
    freeTextConstraints, 
    constraints,
    setFreeTextConstraints,
    isGenerating,
    setIsGenerating,
    generatedOptions,
    setGeneratedOptions,
    selectedOption,
    setSelectedOption,
    setImpossibleConstraints,
    setSuggestions,
    clearAll
  } = useAIStore();
  
  const { employees } = useEmployeeStore();
  const { fetchWeekly, currentWeek: storeWeek, currentYear: storeYear } = useShiftStore();

  const handleGenerate = async () => {
    if (!freeTextConstraints.trim() && constraints.length === 0) {
      alert('Añade al menos una restricción o descripción');
      return;
    }

    setIsGenerating(true);
    setStep(2);

    try {
      const result = await generateScheduleWithAI(
        constraints,
        freeTextConstraints,
        hourlySlots,
        currentWeek,
        currentYear
      );

      setGeneratedOptions(result.options || []);
      setImpossibleConstraints(result.impossibleConstraints || []);
      setSuggestions(result.suggestions || []);
      setStep(3);
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error al generar horarios. Inténtalo de nuevo.';
      alert(errorMessage);
      setStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySchedule = async () => {
    if (!selectedOption) return;

    try {
      // Convertir los shifts del formato de la IA al formato del backend
      const shiftsToCreate = selectedOption.shifts.map(shift => ({
        employeeId: shift.employeeId,
        date: calculateDateFromDay(shift.day, currentWeek, currentYear),
        startTime: shift.startTime,
        endTime: shift.endTime,
        type: shift.type as 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'OFF' || determineShiftType(shift.startTime, shift.endTime),
      }));

      // Usar el servicio bulkCreate
      await shiftService.bulkCreate(shiftsToCreate);
      
      // Refrescar el horario
      await fetchWeekly(storeWeek, storeYear);
      
      alert('¡Horario aplicado correctamente!');
      handleClose();
    } catch (error: any) {
      console.error('Error applying schedule:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error al aplicar horario';
      alert(errorMessage);
    }
  };

  const handleClose = () => {
    clearAll();
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles size={28} />
            <div>
              <h2 className="text-2xl font-bold">Asistente IA de Horarios</h2>
              <p className="text-blue-100 text-sm">
                Genera horarios inteligentes en segundos
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-4 px-6 bg-gray-50 border-b">
          <StepIndicator step={1} currentStep={step} label="Restricciones" />
          <ChevronRight size={16} className="text-gray-400" />
          <StepIndicator step={2} currentStep={step} label="Generando" />
          <ChevronRight size={16} className="text-gray-400" />
          <StepIndicator step={3} currentStep={step} label="Revisar" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <StepOne
              freeTextConstraints={freeTextConstraints}
              setFreeTextConstraints={setFreeTextConstraints}
              constraints={constraints}
              employees={employees}
            />
          )}

          {step === 2 && (
            <StepTwo />
          )}

          {step === 3 && (
            <StepThree
              options={generatedOptions}
              selectedOption={selectedOption}
              setSelectedOption={setSelectedOption}
              employees={employees}
            />
          )}
        </div>

        {/* Footer with actions */}
        <div className="border-t p-6 bg-gray-50 flex justify-between items-center">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex gap-3">
            {step === 1 && (
              <button
                onClick={handleGenerate}
                disabled={(!freeTextConstraints.trim() && constraints.length === 0) || isGenerating}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg
                         font-semibold hover:shadow-lg transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                <Sparkles size={20} />
                Generar Horarios
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleApplySchedule}
                disabled={!selectedOption}
                className="px-6 py-3 bg-green-500 text-white rounded-lg
                         font-semibold hover:bg-green-600 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                <CheckCircle size={20} />
                Aplicar Horario
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-componente para indicador de pasos
interface StepIndicatorProps {
  step: number;
  currentStep: number;
  label: string;
}

const StepIndicator = ({ step, currentStep, label }: StepIndicatorProps) => (
  <div className="flex items-center gap-2">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
      ${currentStep >= step 
        ? 'bg-blue-500 text-white' 
        : 'bg-gray-200 text-gray-500'}`}
    >
      {step}
    </div>
    <span className={`text-sm font-medium ${currentStep >= step ? 'text-gray-900' : 'text-gray-500'}`}>
      {label}
    </span>
  </div>
);

export default AIAssistantModal;
