import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Calendar, AlertCircle } from 'lucide-react';
import { useAttendanceStore } from '../../store/attendanceStore';
import { shiftService } from '../../services/shifts';
import type { Shift } from '../../services/shifts';
import type { AttendanceRecord } from '../../services/attendance';

interface CheckInOutProps {
  employeeId: string;
  employeeName?: string;
}

type Status = 'esperando' | 'en_turno' | 'completado';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatShiftTime(t: string): string {
  if (!t) return '--:--';
  const [h, m] = t.split(':');
  return `${h}:${m}`;
}

export default function CheckInOut({ employeeId, employeeName }: CheckInOutProps) {
  const [time, setTime] = useState(() => formatTime(new Date()));
  const [pin, setPin] = useState('');
  const [notes, setNotes] = useState('');
  const [todayShift, setTodayShift] = useState<Shift | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);

  const {
    todaySummary,
    checkIn,
    checkOut,
    fetchTodayAttendances,
    loading,
    error,
    clearError,
  } = useAttendanceStore();

  const todayAttendance: AttendanceRecord | undefined = todaySummary?.attendances.find(
    (a) => a.employeeId === employeeId
  );

  const status: Status = todayAttendance
    ? todayAttendance.checkOut
      ? 'completado'
      : 'en_turno'
    : 'esperando';

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().split('T')[0];
    setLoadingShift(true);
    shiftService
      .getByEmployee(employeeId, today, today)
      .then((shifts) => {
        if (!cancelled && shifts.length > 0) setTodayShift(shifts[0]);
        else if (!cancelled) setTodayShift(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingShift(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  useEffect(() => {
    fetchTodayAttendances();
  }, [fetchTodayAttendances]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 4) return;
    try {
      await checkIn(employeeId, pin, notes || undefined);
      setPin('');
      setNotes('');
    } catch {
      // error already in store
    }
  };

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todayAttendance?.id) return;
    try {
      await checkOut(todayAttendance.id, notes || undefined);
      setNotes('');
    } catch {
      // error already in store
    }
  };

  return (
    <div className="flex justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/80 p-6 shadow-xl backdrop-blur-sm border border-white/60">
        {/* Reloj */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Clock className="h-8 w-8 text-slate-500" aria-hidden />
          <span className="text-3xl font-semibold tabular-nums text-slate-800">{time}</span>
        </div>

        {/* Estado */}
        <div className="mb-6 rounded-xl bg-slate-100/80 px-4 py-3 text-center">
          <span className="text-sm font-medium text-slate-600">Estado:</span>
          <p className="mt-1 text-lg font-semibold text-slate-800">
            {status === 'esperando' && 'Esperando entrada'}
            {status === 'en_turno' && 'En turno'}
            {status === 'completado' && 'Turno completado'}
          </p>
        </div>

        {/* Turno del día */}
        {loadingShift ? (
          <p className="mb-4 text-sm text-slate-500">Cargando turno...</p>
        ) : todayShift ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50/80 px-3 py-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Turno hoy: {formatShiftTime(todayShift.startTime)} – {formatShiftTime(todayShift.endTime)}
            </span>
          </div>
        ) : (
          <p className="mb-4 text-sm text-amber-700">Sin turno programado hoy</p>
        )}

        {/* Retraso */}
        {todayAttendance?.isLate && todayAttendance.minutesLate != null && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50/80 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Llegaste {todayAttendance.minutesLate} min tarde
            </span>
          </div>
        )}

        {employeeName && (
          <p className="mb-4 text-sm text-slate-600">Fichando como: <strong>{employeeName}</strong></p>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {status === 'esperando' && (
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-slate-700 mb-1">
                PIN (4 dígitos)
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-center text-lg tracking-[0.5em] focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                placeholder="••••"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="notes-in" className="block text-sm font-medium text-slate-700 mb-1">
                Notas (opcional)
              </label>
              <input
                id="notes-in"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-2 text-slate-800"
                placeholder="Ej: Entrada por puerta trasera"
              />
            </div>
            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="h-5 w-5" />
              FICHAR ENTRADA
            </button>
          </form>
        )}

        {(status === 'en_turno') && (
          <form onSubmit={handleCheckOut} className="space-y-4">
            {todayAttendance?.checkIn && (
              <p className="text-sm text-slate-600">
                Entrada: <strong>{String(todayAttendance.checkIn).length >= 16 ? String(todayAttendance.checkIn).slice(11, 16) : todayAttendance.checkIn}</strong>
              </p>
            )}
            <div>
              <label htmlFor="notes-out" className="block text-sm font-medium text-slate-700 mb-1">
                Notas (opcional)
              </label>
              <input
                id="notes-out"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-2 text-slate-800"
                placeholder="Ej: Salida normal"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-orange-600 disabled:opacity-50"
            >
              <LogOut className="h-5 w-5" />
              FICHAR SALIDA
            </button>
          </form>
        )}

        {status === 'completado' && todayAttendance && (
          <div className="rounded-xl bg-slate-100/80 px-4 py-4 space-y-1 text-sm text-slate-700">
            <p>Entrada: <strong>{todayAttendance.checkIn ? String(todayAttendance.checkIn).slice(11, 16) : '—'}</strong></p>
            <p>Salida: <strong>{todayAttendance.checkOut ? String(todayAttendance.checkOut).slice(11, 16) : '—'}</strong></p>
            {todayAttendance.workedHours != null && (
              <p>Horas: <strong>{todayAttendance.workedHours.toFixed(1)} h</strong></p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
