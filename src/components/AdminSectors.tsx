import { useEffect, useState } from 'react';
import { Plus, X, Edit2, Loader2, MapPin, Trash2, Check } from 'lucide-react';
import { supabase, type Sector } from '@/lib/supabase';

export default function AdminSectors() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Sector | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [clientCounts, setClientCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadSectors();
  }, []);

  const loadSectors = async () => {
    setLoading(true);
    const [{ data: sectorData }, { data: clientData }] = await Promise.all([
      supabase.from('sectors').select('*').order('name'),
      supabase.from('clients').select('sector_id'),
    ]);
    const sectorList = (sectorData || []) as Sector[];
    const counts: Record<string, number> = {};
    (clientData || []).forEach((c: any) => {
      if (c.sector_id) counts[c.sector_id] = (counts[c.sector_id] || 0) + 1;
    });
    setSectors(sectorList);
    setClientCounts(counts);
    setLoading(false);
  };

  const handleDelete = async (sector: Sector) => {
    const count = clientCounts[sector.id] || 0;
    if (!confirm(`¿Eliminar el sector "${sector.name}"?${count > 0 ? ` Tiene ${count} cliente(s) asignado(s).` : ''}`)) return;
    await supabase.from('sectors').delete().eq('id', sector.id);
    loadSectors();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sectores / Zonas</h1>
          <p className="text-sm text-slate-500 mt-1">{sectors.length} sectores registrados</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Sector</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : sectors.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay sectores configurados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sectors.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-200 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{clientCounts[s.id] || 0} cliente(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setEditing(s); setShowForm(true); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(s)} className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {s.description && <p className="mt-2 text-[11px] text-slate-400">{s.description}</p>}
              <div className="mt-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {s.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SectorForm
          sector={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); loadSectors(); }}
        />
      )}
    </div>
  );
}

function SectorForm({ sector, onClose, onSaved }: { sector: Sector | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: sector?.name || '',
    description: sector?.description || '',
    active: sector?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name) { setError('El nombre del sector es obligatorio'); return; }
    setSaving(true);
    setError(null);
    const data = { name: form.name, description: form.description || null, active: form.active };
    try {
      if (sector) {
        const { error } = await supabase.from('sectors').update(data).eq('id', sector.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sectors').insert(data);
        if (error) throw error;
      }
      onSaved();
    } catch { setError('No se pudo guardar el sector'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-slate-900">{sector ? 'Editar Sector' : 'Nuevo Sector'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Nombre del Sector</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Carora Centro" className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción de la zona..." rows={2} className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <button type="button" onClick={() => setForm({ ...form, active: !form.active })} className={`relative w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.active ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-xs font-medium text-slate-600">Sector activo</span>
            {form.active && <Check className="w-3.5 h-3.5 text-emerald-500" />}
          </label>
          {error && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3"><p className="text-xs text-rose-700">{error}</p></div>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{sector ? 'Guardar' : 'Crear'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
