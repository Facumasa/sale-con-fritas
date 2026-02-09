import { useState, useEffect, useRef } from 'react';
import { Settings, MapPin, RefreshCw, Download, Printer, Copy, Check } from 'lucide-react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { restaurantService } from '../../services/restaurants';
import type { RestaurantFichajeSettings } from '../../services/restaurants';

export default function FichajeSettings() {
  const [restaurant, setRestaurant] = useState<RestaurantFichajeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const [requireGeolocation, setRequireGeolocation] = useState(false);
  const [fichajeRadiusMeters, setFichajeRadiusMeters] = useState(200);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [publicToken, setPublicToken] = useState<string | null>(null);

  useEffect(() => {
    restaurantService
      .getMy()
      .then((data) => {
        setRestaurant(data);
        setRequireGeolocation(data.requireGeolocation ?? false);
        setFichajeRadiusMeters(data.fichajeRadiusMeters ?? 200);
        setLatitude(data.latitude != null ? String(data.latitude) : '');
        setLongitude(data.longitude != null ? String(data.longitude) : '');
        setPublicToken(data.publicFichajeToken ?? null);
      })
      .catch((err) => setError(err.response?.data?.error || 'Error al cargar'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!restaurant) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await restaurantService.update(restaurant.id, {
        requireGeolocation,
        fichajeRadiusMeters: Math.max(100, Math.min(1000, fichajeRadiusMeters)) || 200,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      });
      setRestaurant(updated);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLatitude(p.coords.latitude.toFixed(6));
        setLongitude(p.coords.longitude.toFixed(6));
        setError(null);
      },
      () => setError('No se pudo obtener la ubicación')
    );
  };

  const handleGenerateToken = async () => {
    if (!restaurant) return;
    setGenerating(true);
    setError(null);
    try {
      const { publicFichajeToken } = await restaurantService.generateFichajeToken(restaurant.id);
      setPublicToken(publicFichajeToken);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al generar token');
    } finally {
      setGenerating(false);
    }
  };

  const fichajeUrl = publicToken
    ? `${window.location.origin}/fichaje/${publicToken}`
    : '';

  const handleCopyLink = () => {
    if (!fichajeUrl) return;
    navigator.clipboard.writeText(fichajeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = async () => {
    if (!qrRef.current) return;
    try {
      const canvas = await html2canvas(qrRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'qr-fichaje.png';
      a.click();
    } catch {
      setError('Error al descargar QR');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/80 p-8 text-center text-slate-500">
        Cargando configuración...
      </div>
    );
  }
  if (!restaurant) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-center text-red-700">
        {error || 'No se pudo cargar el restaurante'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-slate-600" />
        <h2 className="text-xl font-bold text-slate-800">Configuración de fichaje</h2>
      </div>

      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm p-6 space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800">Requerir geolocalización</p>
            <p className="text-sm text-slate-500">Los empleados deberán permitir ubicación al fichar</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={requireGeolocation}
            onClick={() => setRequireGeolocation(!requireGeolocation)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
              requireGeolocation ? 'bg-blue-600 border-blue-600' : 'bg-slate-200 border-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                requireGeolocation ? 'translate-x-5' : 'translate-x-0.5'
              }`}
              style={{ marginTop: 2 }}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Radio permitido (metros)
          </label>
          <input
            type="number"
            min={100}
            max={1000}
            value={fichajeRadiusMeters}
            onChange={(e) => setFichajeRadiusMeters(Number(e.target.value) || 200)}
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-2"
          />
          <p className="text-xs text-slate-500 mt-1">Entre 100 y 1000 m</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Coordenadas del restaurante
          </label>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[120px]">
              <span className="text-xs text-slate-500">Latitud</span>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="40.4168"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <span className="text-xs text-slate-500">Longitud</span>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-3.7038"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleUseMyLocation}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <MapPin className="h-4 w-4" />
              Usar mi ubicación actual
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>

      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">QR de fichaje público</h3>
        <p className="text-sm text-slate-600 mb-4">
          Genera un QR para que los empleados puedan fichar desde el móvil sin iniciar sesión.
        </p>
        {!publicToken ? (
          <button
            type="button"
            onClick={handleGenerateToken}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-white font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generando...' : 'Generar QR de fichaje'}
          </button>
        ) : (
          <div className="space-y-4">
            <div
              ref={qrRef}
              className="inline-flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200"
            >
              <QRCode value={fichajeUrl} size={256} />
              <p className="text-xs text-slate-500 mt-2 text-center max-w-[256px]">
                Escanea para fichar
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerateToken}
                disabled={generating}
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                Regenerar
              </button>
              <button
                type="button"
                onClick={handleDownloadQR}
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                <Download className="h-4 w-4" />
                Descargar QR
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
            <p className="text-xs text-slate-500 break-all">{fichajeUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
}
