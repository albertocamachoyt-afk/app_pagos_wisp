import { useEffect, useState } from 'react';
import { Save, Loader2, CheckCircle, Building2, Banknote, Calendar } from 'lucide-react';
import { supabase, type Settings } from '@/lib/supabase';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    setSettings(data);
    setForm(data);
    setLoading(false);
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
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ajusta los datos que ven los clientes en el portal de pagos
        </p>
      </div>

      {/* Company info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Datos de la Empresa</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Nombre</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Ubicación</label>
            <input
              type="text"
              value={form.company_location}
              onChange={(e) => setForm({ ...form, company_location: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* BCV rate */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Tasa BCV y Facturación</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Tasa BCV (Bs./$)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.bcv_rate}
              onChange={(e) => setForm({ ...form, bcv_rate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Día de Corte</label>
            <input
              type="number"
              min="1"
              max="28"
              value={form.due_day}
              onChange={(e) => setForm({ ...form, due_day: parseInt(e.target.value) || 5 })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Bank info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Banknote className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Datos Bancarios (Pago Móvil)</h2>
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
              <label className="block text-xs font-bold text-slate-800 mb-1">Código</label>
              <input
                type="text"
                value={form.bank_code}
                onChange={(e) => setForm({ ...form, bank_code: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">RIF</label>
            <input
              type="text"
              value={form.bank_rif}
              onChange={(e) => setForm({ ...form, bank_rif: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Teléfono</label>
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
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Guardar Configuración</span>
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            Guardado correctamente
          </span>
        )}
      </div>
    </div>
  );
}
