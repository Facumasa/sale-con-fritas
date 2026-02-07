import { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  Briefcase,
  Clock,
  UserX,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { useAttendanceStore } from '../../store/attendanceStore';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function MonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const {
    monthlyReport,
    fetchMonthlyReport,
    loading,
    error,
    clearError,
  } = useAttendanceStore();

  useEffect(() => {
    fetchMonthlyReport(year, month);
  }, [year, month, fetchMonthlyReport]);

  const report = monthlyReport;
  const totalDays = report?.totalDays ?? 0;

  const handleExportCSV = () => {
    if (!report) return;
    const headers = [
      'Empleado',
      'Días trabajados',
      'Total días',
      'Ausencias',
      'Horas totales',
      'Retrasos',
      'Min. retraso',
      'Promedio h/día',
    ];
    const rows = report.byEmployee.map((e) => {
      const avgHours = e.attendances > 0 ? (e.workedHours / e.attendances).toFixed(1) : '—';
      return [
        e.employeeName,
        e.attendances,
        totalDays,
        e.absences,
        e.workedHours.toFixed(1),
        e.lateCount,
        '—', // API no devuelve minutos totales por empleado
        avgHours,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Selectores */}
      <div className="rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur-sm border border-white/60">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-500" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800"
            >
              {MONTHS.map((name, i) => (
                <option key={i} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800"
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 4 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!report || loading}
            className="ml-auto flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Nota normativa */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 flex gap-3">
        <FileText className="h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Conservación de registros (normativa española)</p>
          <p className="mt-1 text-amber-700/90">
            El artículo 34.9 del Estatuto de los Trabajadores y el Real Decreto Ley 8/2015 establecen
            la obligación de conservar los registros de jornada durante un plazo de 4 años y ponerlos
            a disposición de empleados, inspección de trabajo y representantes legales de los
            trabajadores.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={clearError} className="text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {/* Cards de totales */}
      {report && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Briefcase}
            label="Días del mes"
            value={report.totalDays}
            className="bg-violet-50/80 border-violet-200/60 text-violet-800"
          />
          <StatCard
            icon={Clock}
            label="Horas totales"
            value={report.totalWorkedHours.toFixed(1)}
            suffix="h"
            className="bg-green-50/80 border-green-200/60 text-green-800"
          />
          <StatCard
            icon={AlertTriangle}
            label="Total retrasos"
            value={report.totalLateCount}
            className="bg-amber-50/80 border-amber-200/60 text-amber-800"
          />
          <StatCard
            icon={UserX}
            label="Total ausencias"
            value={report.totalAbsences}
            className="bg-rose-50/80 border-rose-200/60 text-rose-800"
          />
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl bg-white/80 shadow-sm backdrop-blur-sm border border-white/60">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/60">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Empleado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Días trab. / Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Ausencias
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Horas totales
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Retrasos
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Min. retraso
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Promedio h/día
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !report ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Cargando reporte...
                  </td>
                </tr>
              ) : !report?.byEmployee?.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No hay datos para este mes.
                  </td>
                </tr>
              ) : (
                report!.byEmployee.map((row) => {
                  const avgHours =
                    row.attendances > 0 ? (row.workedHours / row.attendances).toFixed(1) : '—';
                  return (
                    <tr key={row.employeeId} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.attendances} / {totalDays}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.absences}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.workedHours.toFixed(1)} h
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.lateCount}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">—</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{avgHours} h</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  suffix?: string;
  className: string;
}) {
  return (
    <div className={`rounded-xl border bg-white/80 p-4 shadow-sm backdrop-blur-sm ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 opacity-80" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">
        {value}
        {suffix}
      </p>
    </div>
  );
}
