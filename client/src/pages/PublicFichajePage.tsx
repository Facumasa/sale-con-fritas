import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, LogIn, LogOut, MapPin, UtensilsCrossed } from 'lucide-react';
import { publicFichajeService } from '../services/publicFichaje';

const RGPD_STORAGE_KEY = 'fichaje_rgpd_accepted';
const getDeviceId = (): string => {
  let id = localStorage.getItem('fichaje_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('fichaje_device_id', id);
  }
  return id;
};

function getLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tu navegador no soporta geolocalización'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error('Necesitas habilitar ubicación'));
        else reject(new Error('No pudimos obtener tu ubicación. Activa el GPS.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function PublicFichajePage() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [time, setTime] = useState(() => formatTime(new Date()));
  const [info, setInfo] = useState<{ name: string; requireGeolocation: boolean } | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string; position: string; color: string }[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<{ hasOpenAttendance: boolean; attendanceId?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRgpd, setShowRgpd] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!publicToken) {
      setPageError('Enlace no válido');
      setLoadingPage(false);
      return;
    }
    Promise.all([
      publicFichajeService.getInfo(publicToken),
      publicFichajeService.getEmployees(publicToken),
    ])
      .then(([infoData, employeesData]) => {
        setInfo(infoData);
        setEmployees(employeesData);
        if (infoData.requireGeolocation && !localStorage.getItem(RGPD_STORAGE_KEY)) {
          setShowRgpd(true);
        }
      })
      .catch((err) => {
        setPageError(err.response?.data?.error || 'Enlace de fichaje no válido');
      })
      .finally(() => setLoadingPage(false));
  }, [publicToken]);

  useEffect(() => {
    if (!publicToken || !selectedEmployeeId) {
      setStatus(null);
      return;
    }
    publicFichajeService
      .getEmployeeStatus(publicToken, selectedEmployeeId)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [publicToken, selectedEmployeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicToken || !selectedEmployeeId || pin.length !== 4) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    if (status?.hasOpenAttendance && status.attendanceId) {
      try {
        await publicFichajeService.checkOut(publicToken, {
          attendanceId: status.attendanceId,
          notes: notes || undefined,
        });
        setSuccess('¡Salida registrada!');
        setPin('');
        setNotes('');
        setStatus({ hasOpenAttendance: false });
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al registrar salida');
      } finally {
        setLoading(false);
      }
      return;
    }
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (info?.requireGeolocation) {
      setLocationLoading(true);
      try {
        const coords = await getLocation();
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch (err: any) {
        setError(err?.message || 'No pudimos obtener tu ubicación. Activa el GPS.');
        setLoading(false);
        setLocationLoading(false);
        return;
      }
      setLocationLoading(false);
    }
    try {
      const record = await publicFichajeService.checkIn(publicToken, {
        employeeId: selectedEmployeeId,
        pin,
        notes: notes || undefined,
        latitude,
        longitude,
        deviceId: getDeviceId(),
      }) as { id: string };
      setSuccess('¡Entrada registrada!');
      setPin('');
      setNotes('');
      setStatus({ hasOpenAttendance: true, attendanceId: record?.id });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar entrada');
    } finally {
      setLoading(false);
    }
  };

  const acceptRgpd = () => {
    localStorage.setItem(RGPD_STORAGE_KEY, 'true');
    setShowRgpd(false);
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Cargando...</p>
      </div>
    );
  }
  if (pageError || !info) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="rounded-2xl bg-white/90 p-8 text-center shadow-xl max-w-md">
          <p className="text-red-600 font-medium">{pageError || 'Enlace no válido'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 py-6 px-4">
      {showRgpd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="rounded-2xl bg-white shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">⚠️ Aviso de privacidad</h2>
            <p className="text-slate-700 text-sm mb-4">
              Este restaurante utiliza geolocalización para verificar que te encuentras en el lugar
              de trabajo al momento de fichar, conforme al Real Decreto-ley 8/2019 de registro horario.
            </p>
            <ul className="text-slate-600 text-sm space-y-2 mb-6">
              <li>✓ Tu ubicación se captura solo al fichar (no hay seguimiento continuo)</li>
              <li>✓ Los datos se conservan 4 años y luego se eliminan</li>
              <li>✓ Puedes ver tus fichajes en tu perfil</li>
              <li>✓ Solo el administrador tiene acceso</li>
            </ul>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={acceptRgpd}
                className="w-full rounded-xl bg-brand-500 py-3 text-white font-semibold hover:bg-brand-600 shadow-sm transition-all duration-200"
              >
                Acepto y continúo
              </button>
              <a href="#" className="text-center text-sm text-slate-500 hover:underline">
                Ver política de privacidad completa
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-md">
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/80 shadow-sm mb-3">
            <UtensilsCrossed className="h-8 w-8 text-slate-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{info.name}</h1>
          <p className="text-slate-500 text-sm mt-1">Fichaje de asistencia</p>
        </header>

        <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl border border-white/60 p-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Clock className="h-7 w-7 text-slate-500" />
            <span className="text-2xl font-semibold tabular-nums text-slate-800">{time}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Selecciona tu nombre
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800"
                required
              >
                <option value="">— Elige empleado —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} – {emp.position}
                  </option>
                ))}
              </select>
            </div>

            {selectedEmployeeId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    PIN de 4 dígitos
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-center text-xl tracking-[0.4em]"
                    placeholder="••••"
                    autoComplete="off"
                    disabled={loading || locationLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-800 resize-none"
                    rows={2}
                    placeholder="Ej: Entrada por puerta trasera"
                    disabled={loading || locationLoading}
                  />
                </div>
                {info.requireGeolocation && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {locationLoading ? (
                      <span>Obteniendo ubicación...</span>
                    ) : (
                      <span>Se usará tu ubicación al fichar</span>
                    )}
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700 font-medium">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                locationLoading ||
                !selectedEmployeeId ||
                pin.length !== 4
              }
              className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-lg font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: status?.hasOpenAttendance ? '#f97316' : '#22c55e',
              }}
            >
              {loading || locationLoading ? (
                <>
                  <MapPin className="h-5 w-5 animate-pulse" />
                  {locationLoading ? 'Obteniendo ubicación...' : 'Procesando...'}
                </>
              ) : status?.hasOpenAttendance ? (
                <>
                  <LogOut className="h-5 w-5" />
                  FICHAR SALIDA
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  FICHAR ENTRADA
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
