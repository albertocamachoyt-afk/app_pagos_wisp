import { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  X,
  Edit2,
  Loader2,
  Users,
  Phone,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase, type Client, type Plan, type Sector } from '@/lib/supabase';
import {
  formatCedula,
  parseCedula,
  formatUSD,
  statusColor,
  statusLabel,
} from '@/lib/format';

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editing, setEditing] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: clientData }, { data: planData }, { data: sectorData }] = await Promise.all([
      supabase.from('clients').select('*, plan:plans(*), sector:sectors(*)').order('full_name'),
      supabase.from('plans').select('*').order('price_usd'),
      supabase.from('sectors').select('*').order('name'),
    ]);
    setClients((clientData || []) as Client[]);
    setPlans((planData || []) as Plan[]);
    setSectors((sectorData || []) as Sector[]);
    setLoading(false);
  };

  const filtered = clients.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.full_name.toLowerCase().includes(q) && !c.cedula.includes(search) && !(c.plan?.name || c.plan_name || '').toLowerCase().includes(q)) return false;
    }
    if (filterSector !== 'all' && c.sector_id !== filterSector) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">{clients.length} clientes registrados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="bg-white border border-slate-200 hover:border-amber-400 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all text-sm"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importar</span>
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula o plan..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
          />
        </div>
        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
        >
          <option value="all">Todos los sectores</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
        >
          <option value="all">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="suspendido">Suspendidos</option>
          <option value="cortado">Cortados</option>
        </select>
      </div>

      {/* Clients list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No se encontraron clientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-200 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {c.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.full_name}</p>
                    <p className="text-[11px] text-slate-400">
                      CI: {formatCedula(c.cedula)} · {c.plan?.name || c.plan_name}
                    </p>
                    {c.sector && <p className="text-[10px] text-slate-400">{c.sector.name}</p>}
                  </div>
                </div>
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                  <span className="text-xs font-bold text-slate-700">{formatUSD(c.monthly_amount)}/mes</span>
                  {c.balance > 0 && <span className="text-[10px] font-semibold text-rose-600">Deuda: {formatUSD(c.balance)}</span>}
                </div>
                {c.phone && (
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                    <Phone className="w-3 h-3" />{c.phone}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ClientForm
          client={editing}
          plans={plans}
          sectors={sectors}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); loadData(); }}
        />
      )}

      {showImport && (
        <BulkImport
          plans={plans}
          sectors={sectors}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadData(); }}
        />
      )}
    </div>
  );
}

function ClientForm({ client, plans, sectors, onClose, onSaved }: {
  client: Client | null;
  plans: Plan[];
  sectors: Sector[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    cedula: client ? formatCedula(client.cedula) : '',
    full_name: client?.full_name || '',
    plan_id: client?.plan_id || '',
    sector_id: client?.sector_id || '',
    monthly_amount: client?.monthly_amount?.toString() || '25.00',
    status: client?.status || 'activo',
    due_day: client?.due_day?.toString() || '5',
    phone: client?.phone || '',
    address: client?.address || '',
    balance: client?.balance?.toString() || '0',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    setForm({ ...form, plan_id: planId, monthly_amount: plan ? plan.price_usd.toString() : form.monthly_amount });
  };

  const handleSave = async () => {
    if (!form.cedula || !form.full_name) { setError('Cédula y nombre son obligatorios'); return; }
    setSaving(true);
    setError(null);
    const selectedPlan = plans.find((p) => p.id === form.plan_id);
    const data = {
      cedula: parseCedula(form.cedula),
      full_name: form.full_name,
      plan_id: form.plan_id || null,
      sector_id: form.sector_id || null,
      plan_name: selectedPlan?.name || form.plan_id || '',
      monthly_amount: parseFloat(form.monthly_amount) || 25,
      status: form.status,
      due_day: parseInt(form.due_day) || 5,
      phone: form.phone || null,
      address: form.address || null,
      balance: parseFloat(form.balance) || 0,
    };
    try {
      if (client) {
        const { error } = await supabase.from('clients').update(data).eq('id', client.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert(data);
        if (error) {
          if (error.code === '23505') { setError('Ya existe un cliente con esta cédula'); setSaving(false); return; }
          throw error;
        }
      }
      onSaved();
    } catch { setError('No se pudo guardar el cliente'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-slate-900">{client ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Cédula</label>
              <input type="text" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: formatCedula(parseCedula(e.target.value)) })} placeholder="12.345.678" className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Teléfono</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0414-1234567" className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Nombre Completo</label>
            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nombre del abonado" className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Plan</label>
              <select value={form.plan_id} onChange={(e) => handlePlanChange(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500">
                <option value="">Sin plan</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} - {formatUSD(p.price_usd)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Sector / Zona</label>
              <select value={form.sector_id} onChange={(e) => setForm({ ...form, sector_id: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500">
                <option value="">Sin sector</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Monto (USD)</label>
              <input type="number" step="0.01" value={form.monthly_amount} onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Estado</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500">
                <option value="activo">Activo</option>
                <option value="suspendido">Suspendido</option>
                <option value="cortado">Cortado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Día de Corte</label>
              <input type="number" min="1" max="28" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Saldo / Deuda (USD)</label>
              <input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Dirección</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección del abonado" className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500" />
          </div>
          {error && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3"><p className="text-xs text-rose-700">{error}</p></div>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{client ? 'Guardar' : 'Crear'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkImport({ plans, sectors, onClose, onImported }: {
  plans: Plan[];
  sectors: Sector[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const handleImport = async () => {
    if (!text.trim()) return;
    setImporting(true);
    setResult(null);
    const lines = text.trim().split('\n');
    let success = 0;
    const errors: string[] = [];
    const rows: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(',').map((p) => p.trim());

      if (parts.length < 3) { errors.push(`Fila ${i + 1}: Faltan datos (mínimo: cédula, nombre, plan)`); continue; }

      const [cedula, fullName, planName, sectorName, phone, address] = parts;
      const plan = plans.find((p) => p.name.toLowerCase() === planName.toLowerCase());
      const sector = sectors.find((s) => s.name.toLowerCase() === (sectorName || '').toLowerCase());

      if (!plan) { errors.push(`Fila ${i + 1}: Plan "${planName}" no encontrado`); continue; }

      rows.push({
        cedula: parseCedula(cedula),
        full_name: fullName,
        plan_id: plan.id,
        sector_id: sector?.id || null,
        plan_name: plan.name,
        monthly_amount: plan.price_usd,
        status: 'activo',
        due_day: 5,
        phone: phone || null,
        address: address || null,
        balance: 0,
      });
    }

    if (rows.length > 0) {
      const { data, error } = await supabase.from('clients').insert(rows).select();
      if (error) {
        errors.push(`Error general: ${error.message}`);
      } else {
        success = data?.length || 0;
      }
    }

    setResult({ success, errors });
    setImporting(false);
    if (success > 0 && errors.length === 0) {
      setTimeout(() => onImported(), 1500);
    }
  };

  const downloadTemplate = () => {
    const planNames = plans.map((p) => p.name).join(' / ');
    const sectorNames = sectors.map((s) => s.name).join(' / ');
    const template = `# Plantilla para importar clientes - RTST Carora
# Formato: cedula,nombre,plan,sector,telefono,direccion
# Planes disponibles: ${planNames}
# Sectores disponibles: ${sectorNames}
#
# Ejemplos:
12345678,Carlos Mendoza,Plan Fibra 100M,Carora Centro,0414-1234567,Calle 5 Casa 12
87654321,Maria Rodriguez,Plan Fibra 50M,Carora Norte,0412-9876543,Avenida 3 #45`;
    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_clientes_rtst.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-slate-900">Importar Clientes (Masivo)</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-blue-900 font-semibold mb-1">Formato CSV (una fila por cliente):</p>
            <p className="text-[11px] text-blue-700 font-mono">cedula, nombre, plan, sector, telefono, direccion</p>
            <p className="text-[11px] text-blue-600 mt-1">El plan debe coincidir con uno ya creado. Sector es opcional.</p>
          </div>
          <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium">
            <Download className="w-3.5 h-3.5" />
            Descargar plantilla de ejemplo
          </button>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Pega aqui los datos de los clientes:</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'12345678,Carlos Mendoza,Plan Fibra 100M,Carora Centro,0414-1234567,Calle 5\n87654321,Maria Rodriguez,Plan Fibra 50M,Carora Norte,0412-9876543,Avenida 3'}
              rows={10}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono text-slate-800 resize-none"
            />
          </div>
          {result && (
            <div className="space-y-2 animate-fade-in">
              {result.success > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs text-emerald-700 font-medium">{result.success} cliente(s) importados correctamente</p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-[11px] text-rose-700 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{e}
                    </p>
                  ))}
                  {result.errors.length > 10 && <p className="text-[11px] text-rose-500">...y {result.errors.length - 10} error(es) mas</p>}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all text-sm">Cancelar</button>
            <button onClick={handleImport} disabled={importing || !text.trim()} className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>Importar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
