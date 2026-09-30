import { useEffect, useState } from 'react';
import {
  Save,
  Loader2,
  CheckCircle,
  Building2,
  Banknote,
  Calendar,
  RefreshCw,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { supabase, type Settings } from '@/lib/supabase';
import { fetchOfficialBcvRate, checkAndAutoSyncBcv } from '@/lib/bcv';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncingBcv, setSyncingBcv] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    setSettings(data);
    setForm(data);
    setLoading(false);

    // Intentar auto-sincronización si ya pasaron las 12:00 PM de hoy
    if (data) {
      checkAndAutoSyncBcv(data.bcv_rate, data.updated_at).then((res) => {
        if (res.updated && res.rate) {
          setForm((prev) => (prev ? { ...prev, bcv_rate: res.rate! } : null));
          setSyncMsg({
            type: 'success',
            text: `Tasa BCV auto-actualizada a Bs. ${res.rate.toFixed(2)}`,
          });
          setTimeout(() => setSyncMsg(null), 5000);
        }
      });
    }
  };

  const handleSyncOfficialBcv = async () => {
    setSyncingBcv(true);
    setSyncMsg(null);
    try {
      const res = await fetchOfficialBcvRate();
      if (res && res.rate) {
        setForm((prev) => (prev ? { ...prev, bcv_rate: res.rate } : null));
        setSettings((prev) => (prev ? { ...prev, bcv_rate: res.rate, updated_at: new Date().toISOString() } : null));

        // Guardar de una vez en BD
        const { error } = await supabase
          .from('settings')
          .update({
            bcv_rate: res.rate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 1);

        if (error) {
          throw new Error(error.message);
        }

        setSyncMsg({
          type: 'success',
          text: `¡Tasa oficial del BCV sincronizada con éxito: Bs. ${res.rate.toFixed(2)}! (${res.source})`,
        });
      } else {
        setSyncMsg({
          type: 'error',
          text: 'No se pudo obtener la tasa oficial en este instante. Verifica tu conexión.',
        });
      }
    } catch (err: any) {
      console.error('Error al sincronizar BCV:', err);
      setSyncMsg({
        type: 'error',
        text: `Error al sincronizar: ${err?.message || 'Error de conexión'}`,
      });
    } finally {
      setSyncingBcv(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase
      .from('settings')
      .update({
        bcv_rate: form.bcv_rate,
        bank_name: form.bank_name,
        bank_code: form.bank_code,
        bank_rif: form.bank_rif,
        bank_phone: form.bank_phone,
        company_name: form.company_name,
        company_location: form.company_location,
        due_day: form.due_day,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración del Sistema</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ajusta los datos de la empresa, cuentas bancarias y tasa de cambio BCV
        </p>
      </div>

      {/* Tasa BCV y Facturación */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tasa Oficial BCV</h2>
              <p className="text-[11px] text-slate-400">Usada para convertir mensualidades y pagos a Bolívares</p>
            </div>
          </div>

          {/* Botón sincronizar ahora */}
          <button
            type="button"
            onClick={handleSyncOfficialBcv}
            disabled={syncingBcv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            {syncingBcv ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Sincronizar BCV Oficial Ahora</span>
          </button>
        </div>

        {/* Mensaje de sincronización */}
        {syncMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
              syncMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium'
                : 'bg-rose-50 border border-rose-200 text-rose-800 font-medium'
            }`}
          >
            {syncMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <p>{syncMsg.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Tasa BCV (Bs. por 1 USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Bs.
              </span>
              <input
                type="number"
                step="0.0001"
                value={form.bcv_rate}
                onChange={(e) => setForm({ ...form, bcv_rate: parseFloat(e.target.value) || 0 })}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono font-bold text-slate-900"
              />
            </div>
            {settings?.updated_at && (
              <p className="text-[10px] text-slate-400 mt-1">
                Última actualización:{' '}
                {new Date(settings.updated_at).toLocaleString('es-VE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Día de Corte Predeterminado
            </label>
            <select
              value={form.due_day}
              onChange={(e) => setForm({ ...form, due_day: parseInt(e.target.value) || 5 })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium text-slate-800"
            >
              <option value={5}>Ciclo 5 (Día 5 · Facturación 1 al 5)</option>
              <option value={19}>Ciclo 19 (Día 19 · Facturación 15 al 19)</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Asignado por defecto a clientes sin ciclo específico
            </p>
          </div>
        </div>

        {/* Tarjeta de Automatización 12:00 PM */}
        <div className="bg-gradient-to-r from-emerald-50/60 to-teal-50/60 border border-emerald-200/70 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
          <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-950 flex items-center gap-1.5">
              <span>Sincronización Automática Diaria (12:00 PM Venezuela)</span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] bg-emerald-200 text-emerald-800 font-bold uppercase tracking-wider">
                Activa
              </span>
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              El sistema se conecta automáticamente a la API pública oficial del Banco Central de Venezuela. Cada vez que llega el mediodía (12:00 PM VET), si la tasa del día aún no está registrada, se actualiza sola al abrir la plataforma o mediante tareas en segundo plano.
            </p>
          </div>
        </div>
      </div>

      {/* Company info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Datos de la Empresa</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Nombre Comercial</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Ubicación / Ciudad</label>
            <input
              type="text"
              value={form.company_location}
              onChange={(e) => setForm({ ...form, company_location: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Bank info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Banknote className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Datos Bancarios (Pago Móvil para Clientes)</h2>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Banco</label>
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Código Bancario</label>
              <input
                type="text"
                value={form.bank_code}
                onChange={(e) => setForm({ ...form, bank_code: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">RIF / Cédula Receptor</label>
            <input
              type="text"
              value={form.bank_rif}
              onChange={(e) => setForm({ ...form, bank_rif: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Teléfono Pago Móvil</label>
            <input
              type="text"
              value={form.bank_phone}
              onChange={(e) => setForm({ ...form, bank_phone: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all text-sm shadow-md"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Guardar Configuración</span>
        </button>

        {saved && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>Configuración guardada correctamente</span>
          </div>
        )}
      </div>
    </div>
  );
}
