import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useEmployeeStore } from '../../store/employeeStore';
import type { AttendanceRecord } from '../../services/attendance';

type StatusFilter = 'todos' | 'presente' | 'ausente' | 'retraso' | 'completado';

function getStatusBadge(record: AttendanceRecord, opts?: { fichajesCount?: number }) {
  if (record.isAbsent)
    return { label: 'Ausente', className: 'bg-red-100 text-red-800 border-red-200' };
  const count = opts?.fichajesCount ?? 1;
  const isInside = count % 2 === 1;
  if (!isInside)
    return { label: 'Completado', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (record.isLate) {
    const min = record.minutesLate ?? 0;
    if (min <= 0)
      return { label: 'A tiempo', className: 'bg-brand-50 text-brand-700 border-brand-500' };
    if (min <= 15)
      return { label: 'Retraso <15min', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    if (min <= 30)
      return { label: 'Retraso 15-30min', className: 'bg-orange-100 text-orange-700 border-orange-200' };
    if (min <= 60)
      return { label: 'Retraso 30-60min', className: 'bg-red-100 text-red-600 border-red-200' };
    return { label: 'Retraso >1h', className: 'bg-red-200 text-red-800 border-red-300' };
  }
  return { label: 'En turno', className: 'bg-brand-50 text-brand-700 border-brand-500' };
}

function fichajeLabel(index: number, total: number): string {
  const isOdd = index % 2 === 0;
  if (isOdd) return index === 0 ? 'Entrada' : 'Regreso';
  if (index === 1 && total > 2) return 'Salida (almuerzo)';
  if (index === total - 1) return 'Salida final';
  return 'Salida';
}

function toTimeStr(v: string | null | undefined): string {
  if (v == null) return '—';
  const s = String(v);
  return s.length >= 16 ? s.slice(11, 16) : s.slice(0, 5);
}

function workedHoursFromFichajes(records: AttendanceRecord[]): number | null {
  const sorted = [...records].sort(
    (a, b) => new Date(a.checkIn ?? 0).getTime() - new Date(b.checkIn ?? 0).getTime()
  );
  let total = 0;
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    const t1 = new Date(sorted[i].checkIn ?? 0).getTime();
    const t2 = new Date(sorted[i + 1].checkIn ?? 0).getTime();
    if (!isNaN(t1) && !isNaN(t2)) total += (t2 - t1) / (1000 * 60 * 60);
  }
  return total > 0 ? total : null;
}

function avatarColor(employeeId: string, employees: { id: string; color: string }[]): string {
  const emp = employees.find((e) => e.id === employeeId);
  return emp?.color || '#94a3b8';
}

function getDistanceBadge(meters: number | null | undefined) {
  if (meters == null) return null;
  const m = Math.round(meters);
  if (m <= 50) return { label: `${m} m`, className: 'bg-brand-50 text-brand-700 border-brand-500' };
  if (m <= 100) return { label: `${m} m`, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return { label: `${m} m`, className: 'bg-red-100 text-red-600 border-red-200' };
}

function googleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

function exportToCSV(rows: AttendanceRecord[], employees: { id: string; name: string }[]) {
  const headers = [
    'Empleado',
    'Turno (inicio-fin)',
    'Entrada',
    'Salida',
    'Horas',
    'Estado',
    'Distancia (m)',
    'Min. retraso',
  ];
  const getStatus = (r: AttendanceRecord) => getStatusBadge(r).label;
  const getShift = (r: AttendanceRecord) =>
    r.shift ? `${r.shift.startTime}-${r.shift.endTime}` : '—';
  const data = rows.map((r) => {
    const name = r.employee?.name ?? employees.find((e) => e.id === r.employeeId)?.name ?? r.employeeId;
    const dist = r.distanceFromRestaurant != null ? String(Math.round(r.distanceFromRestaurant)) : '—';
    return [
      name,
      getShift(r),
      r.checkIn ?? '—',
      r.checkOut ?? '—',
      r.workedHours != null ? r.workedHours.toFixed(1) : '—',
      getStatus(r),
      dist,
      r.minutesLate ?? '—',
    ];
  });
  const csv = [headers.join(','), ...data.map((row) => row.map((c) => `"${c}"`).join(','))].join(
    '\n'
  );
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asistencia-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceTable() {
  const { employees, fetchEmployees } = useEmployeeStore();
  const {
    attendances,
    todaySummary,
    filters,
    setFilters,
    fetchAttendances,
    fetchTodayAttendances,
    fetchStats,
    loading,
    error,
    clearError,
  } = useAttendanceStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    setFilters({ date: filterDate });
  }, [filterDate, setFilters]);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances, filters]);

  useEffect(() => {
    fetchTodayAttendances();
  }, [fetchTodayAttendances]);

  // Auto-refresh cada 30 s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAttendances();
      fetchTodayAttendances();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAttendances, fetchTodayAttendances, fetchStats]);

  const total = (todaySummary?.totalPresent ?? 0) + (todaySummary?.totalAbsent ?? 0);
  const statsCards = [
    {
      label: 'Total',
      value: total,
      icon: Users,
      className: 'bg-violet-50/80 border-violet-200/60 text-violet-800',
    },
    {
      label: 'Presentes',
      value: todaySummary?.totalPresent ?? 0,
      icon: UserCheck,
      className: 'bg-green-50/80 border-green-200/60 text-green-800',
    },
    {
      label: 'Retrasos',
      value: todaySummary?.totalLate ?? 0,
      icon: Clock,
      className: 'bg-amber-50/80 border-amber-200/60 text-amber-800',
    },
    {
      label: 'Ausentes',
      value: todaySummary?.totalAbsent ?? 0,
      icon: UserX,
      className: 'bg-rose-50/80 border-rose-200/60 text-rose-800',
    },
  ];

  const rows = useMemo(() => {
    let list = attendances;
    const byEmp = new Map<string, AttendanceRecord[]>();
    list.forEach((a) => {
      if (!byEmp.has(a.employeeId)) byEmp.set(a.employeeId, []);
      byEmp.get(a.employeeId)!.push(a);
    });
    if (statusFilter === 'presente') {
      list = list.filter(
        (a) => !a.isAbsent && a.checkIn && ((byEmp.get(a.employeeId)?.length ?? 0) % 2 === 1)
      );
    } else if (statusFilter === 'ausente') list = list.filter((a) => a.isAbsent);
    else if (statusFilter === 'retraso') list = list.filter((a) => a.isLate);
    else if (statusFilter === 'completado') {
      list = list.filter((a) => (byEmp.get(a.employeeId)?.length ?? 0) % 2 === 0);
    }
    return list;
  }, [attendances, statusFilter]);

  const groupedRows = useMemo(() => {
    const byEmployee = new Map<string, AttendanceRecord[]>();
    rows.forEach((r) => {
      if (!byEmployee.has(r.employeeId)) byEmployee.set(r.employeeId, []);
      byEmployee.get(r.employeeId)!.push(r);
    });
    return Array.from(byEmployee.entries()).map(([employeeId, recs]) => {
      const sorted = [...recs].sort(
        (a, b) => new Date(a.checkIn ?? 0).getTime() - new Date(b.checkIn ?? 0).getTime()
      );
      return { employeeId, records: sorted };
    });
  }, [rows]);

  const handleExportCSV = () => {
    exportToCSV(rows, employees);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsCards.map(({ label, value, icon: Icon, className }) => (
          <div
            key={label}
            className={`rounded-xl border bg-white/80 p-4 shadow-sm backdrop-blur-sm ${className}`}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 opacity-80" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur-sm border border-white/60">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={filters.employeeId ?? ''}
              onChange={(e) => setFilters({ employeeId: e.target.value || undefined })}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm min-w-[160px]"
            >
              <option value="">Todos los empleados</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="todos">Todos los estados</option>
            <option value="presente">Presente / En turno</option>
            <option value="retraso">Con retraso</option>
            <option value="completado">Completado</option>
            <option value="ausente">Ausente</option>
          </select>
          <button
            type="button"
            onClick={handleExportCSV}
            className="ml-auto flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => { fetchAttendances(); fetchTodayAttendances(); }}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
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
                  Turno programado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Entrada
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Fichajes
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Horas
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Ubicación
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No hay registros para esta fecha/filtro.
                  </td>
                </tr>
              ) : (
                groupedRows.map(({ employeeId, records }) => {
                  const first = records[0];
                  const badge = getStatusBadge(first, { fichajesCount: records.length });
                  const color = avatarColor(employeeId, employees);
                  const name =
                    first.employee?.name ??
                    employees.find((e) => e.id === employeeId)?.name ??
                    '—';
                  const shiftStr = first.shift
                    ? `${first.shift.startTime} - ${first.shift.endTime}`
                    : '—';
                  const checkInStr = toTimeStr(first.checkIn);
                  const hoursComputed = workedHoursFromFichajes(records);
                  const hoursStr =
                    hoursComputed != null ? `${hoursComputed.toFixed(1)} h` : '—';
                  const distanceBadge = getDistanceBadge(first.distanceFromRestaurant);
                  const hasCoords =
                    first.latitude != null && first.longitude != null;
                  const fichajesTooltipText = records
                    .map((r, i) => `${toTimeStr(r.checkIn)} - ${fichajeLabel(i, records.length)}`)
                    .join('\n');

                  return (
                    <tr key={employeeId} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: color }}
                          >
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{name}</p>
                            {first.employee?.position && (
                              <p className="text-xs text-slate-500">{first.employee.position}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{shiftStr}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{checkInStr}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <span
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                          title={fichajesTooltipText}
                        >
                          {records.length} fichaje{records.length !== 1 ? 's' : ''}
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{hoursStr}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {distanceBadge ? (
                          hasCoords ? (
                            <a
                              href={googleMapsUrl(first.latitude!, first.longitude!)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium hover:opacity-90 ${distanceBadge.className}`}
                              title="Ver en Google Maps"
                            >
                              <MapPin className="h-3 w-3" />
                              {distanceBadge.label}
                            </a>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${distanceBadge.className}`}
                            >
                              <MapPin className="h-3 w-3" />
                              {distanceBadge.label}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
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
