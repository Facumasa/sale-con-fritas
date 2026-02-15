import { CheckCircle, LogOut, ClipboardList } from 'lucide-react';
import type { FichajeDelDia } from '../../services/publicFichaje';

function getLabel(index: number, total: number): string {
  const isOdd = index % 2 === 0; // 0-based: 0,2,4 = entrada/regreso
  if (isOdd) {
    return index === 0 ? 'Entrada' : 'Regreso';
  }
  if (index === 1 && total > 2) return 'Salida (almuerzo)';
  if (index === total - 1) return 'Salida final';
  return 'Salida';
}

function getIcon(index: number): React.ReactNode {
  const isOdd = index % 2 === 0;
  if (isOdd) return <CheckCircle className="h-5 w-5 text-brand-600" />;
  return <LogOut className="h-5 w-5 text-orange-500" />;
}

function formatCheckIn(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface FichajesDelDiaProps {
  fichajes: FichajeDelDia[];
  loading: boolean;
}

export default function FichajesDelDia({ fichajes, loading }: FichajesDelDiaProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4">
        <div className="flex items-center gap-2 text-slate-500 mb-3">
          <ClipboardList className="h-5 w-5" />
          <span className="font-medium text-slate-700">Tus fichajes de hoy</span>
        </div>
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/80 p-4 max-h-[300px] overflow-y-auto">
      <div className="flex items-center gap-2 text-slate-700 mb-3 sticky top-0 bg-white/95 py-1">
        <ClipboardList className="h-5 w-5 text-slate-500" />
        <span className="font-medium">Tus fichajes de hoy</span>
      </div>
      {fichajes.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">Aún no has fichado hoy</p>
      ) : (
        <ul className="space-y-2">
          {fichajes.map((f, index) => {
            const isOdd = index % 2 === 0;
            const bg = isOdd ? 'bg-brand-50/80 border-brand-200/60' : 'bg-orange-50/80 border-orange-200/60';
            return (
              <li
                key={f.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${bg} transition-all duration-200`}
              >
                {getIcon(index)}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {formatCheckIn(f.checkIn)}
                  </span>
                  <span className="ml-2 text-sm text-slate-600">
                    {getLabel(index, fichajes.length)}
                  </span>
                </div>
                {f.minutesLate != null && f.minutesLate > 0 && (
                  <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    +{f.minutesLate} min
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
