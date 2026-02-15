import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle, UtensilsCrossed } from 'lucide-react';
import { publicFichajeService } from '../services/publicFichaje';

export default function ChangePinPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const publicToken = searchParams.get('publicToken');

  const [status, setStatus] = useState<'loading' | 'invalid' | 'valid' | 'success'>('loading');
  const [employeeName, setEmployeeName] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    publicFichajeService
      .verifyPinToken(token)
      .then((res) => {
        if (res.valid && res.employeeName) {
          setStatus('valid');
          setEmployeeName(res.employeeName);
        } else {
          setStatus('invalid');
        }
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('El nuevo PIN debe tener exactamente 4 dígitos numéricos');
      return;
    }
    if (newPin !== confirmPin) {
      setError('El nuevo PIN y la confirmación no coinciden');
      return;
    }
    if (oldPin === newPin) {
      setError('El nuevo PIN debe ser distinto al actual');
      return;
    }

    setLoading(true);
    try {
      await publicFichajeService.changePin(token, oldPin, newPin);
      setStatus('success');
      if (publicToken) {
        const t = setTimeout(() => {
          window.location.href = `/fichaje/${publicToken}`;
        }, 3000);
        return () => clearTimeout(t);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cambiar el PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/20 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl border border-white/60 p-6">
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 mb-3">
            <Lock className="h-8 w-8 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Cambiar PIN de Fichaje</h1>
          <p className="text-slate-500 text-sm mt-1">Sale Con Fritas</p>
        </header>

        {status === 'loading' && (
          <p className="text-center text-slate-600 py-8">Verificando enlace...</p>
        )}

        {status === 'invalid' && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-6 text-center text-red-700">
            <p className="font-medium">Link expirado o inválido</p>
            <p className="text-sm mt-1">Solicita un nuevo enlace desde la página de fichaje.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-xl bg-brand-50 border border-brand-200 px-4 py-6 text-center">
            <CheckCircle className="h-12 w-12 text-brand-600 mx-auto mb-2" />
            <p className="font-semibold text-brand-800">PIN cambiado correctamente</p>
            <p className="text-sm text-brand-700 mt-1">
              {publicToken
                ? 'Redirigiendo a la página de fichaje en unos segundos...'
                : 'Ya puedes volver a la página de fichaje y usar tu nuevo PIN.'}
            </p>
            {publicToken && (
              <a
                href={`/fichaje/${publicToken}`}
                className="inline-flex items-center gap-2 mt-4 text-brand-600 hover:text-brand-700 font-medium"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Ir a fichaje ahora
              </a>
            )}
          </div>
        )}

        {status === 'valid' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-slate-600 text-sm text-center mb-4">
              Cambiar PIN para <strong>{employeeName}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PIN actual</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg tracking-[0.4em]"
                placeholder="••••"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nuevo PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg tracking-[0.4em]"
                placeholder="••••"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar nuevo PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg tracking-[0.4em]"
                placeholder="••••"
                autoComplete="new-password"
                required
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading || oldPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
              className="w-full rounded-xl bg-brand-500 py-3 text-white font-semibold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {loading ? 'Cambiando...' : 'Cambiar PIN'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
