import { Loader2, Sparkles } from 'lucide-react';

const StepTwo = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="relative">
        <Loader2 size={64} className="text-blue-500 animate-spin" />
        <Sparkles size={24} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-500" />
      </div>
      
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Generando horarios inteligentes...
        </h3>
        <p className="text-gray-600">
          Claude está analizando tus restricciones y creando las mejores opciones
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
        <p className="text-sm text-blue-800 text-center">
          💡 Tip: La IA considerará los slots de horario que has configurado y 
          balanceará las horas entre todos los empleados.
        </p>
      </div>
    </div>
  );
};

export default StepTwo;
