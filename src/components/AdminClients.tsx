import { useEffect, useState, useRef } from 'react';
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
  FileSpreadsheet,
  Clock,
  MapPin,
  Trash2,
  CreditCard,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase, type Client, type Plan, type Sector, type AdminRole } from '@/lib/supabase';
import {
  formatCedula,
  parseCedula,
  formatUSD,
  statusColor,
  statusLabel,
} from '@/lib/format';

const downloadExcelTemplateHelper = (plans: Plan[], sectors: Sector[]) => {
  const samplePlans = plans.map((p) => p.name).slice(0, 3);
  const plan1 = samplePlans[0] || 'Plan Fibra 50M';
  const plan2 = samplePlans[1] || 'Plan Fibra 100M';
  const sampleSector1 = sectors[0]?.name || 'Carora Centro';
  const sampleSector2 = sectors[1]?.name || 'Carora Norte';

  const data = [
    ['cedula', 'nombre', 'plan', 'sector', 'ciclo', 'telefono', 'direccion', 'saldo'],
    ['12345678', 'Carlos Mendoza', plan1, sampleSector1, '5', '0414-1234567', 'Calle 5 Casa 12', '0'],
    ['87654321', 'Maria Rodriguez', plan2, sampleSector2, '19', '0412-9876543', 'Avenida 3 #45', '0'],
    ['15678901', 'Juan Perez', plan1, sampleSector1, 'Ciclo 5', '0416-5551234', 'Sector El Carmen', '0'],
    ['22345678', 'Elena Gomez', plan2, sampleSector2, 'Ciclo 19', '0424-7778899', 'Av. Francisco de Miranda', '0'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 15 },
    { wch: 25 },
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_clientes_rtst_ciclos.xlsx';
  a.click();
  URL.revokeObjectURL(url);
};

const downloadCsvTemplateHelper = (plans: Plan[], sectors: Sector[]) => {
  const plan1 = plans[0]?.name || 'Plan Fibra 50M';
  const plan2 = plans[1]?.name || 'Plan Fibra 100M';
  const sector1 = sectors[0]?.name || 'Carora Centro';
  const sector2 = sectors[1]?.name || 'Carora Norte';

  const csvContent = [
    '# Plantilla oficial de importación - RTST Carora',
    '# Columnas requeridas: cedula, nombre, plan',
    '# Columna ciclo: coloca 5 (corte día 5) o 19 (corte día 19)',
    'cedula,nombre,plan,sector,ciclo,telefono,direccion,saldo',
    `12345678,Carlos Mendoza,${plan1},${sector1},5,0414-1234567,Calle 5 Casa 12,0`,
    `87654321,Maria Rodriguez,${plan2},${sector2},19,0412-9876543,Avenida 3 #45,0`,
    `15678901,Juan Perez,${plan1},${sector1},5,0416-5551234,Sector El Carmen,0`,
    `22345678,Elena Gomez,${plan2},${sector2},19,0424-7778899,Av. Miranda,0`,
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_clientes_rtst_ciclos.csv';
  a.click();
  URL.revokeObjectURL(url);
};

export default function AdminClients({ role = 'admin' }: { role?: AdminRole }) {
  const isOperator = role === 'operador';
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterCycle, setFilterCycle] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editing, setEditing] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const confirmDeleteClient = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('clients').delete().eq('id', deletingClient.id);
      if (error) throw error;
      setClients((prev) => prev.filter((c) => c.id !== deletingClient.id));
      setDeletingClient(null);
    } catch (err: any) {
      alert('Error al eliminar cliente: ' + (err?.message || 'Error desconocido'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = clients.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.full_name.toLowerCase().includes(q) &&
        !c.cedula.includes(search) &&
        !(c.plan?.name || c.plan_name || '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filterSector !== 'all' && c.sector_id !== filterSector) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    
    // Filtro por ciclo
    const dueDay = Number(c.due_day) || 5;
    if (filterCycle === '5' && dueDay > 10) return false;
    if (filterCycle === '19' && dueDay <= 10) return false;

    return true;
  });

  const cycle5Count = clients.filter((c) => (Number(c.due_day) || 5) <= 10).length;
  const cycle19Count = clients.filter((c) => (Number(c.due_day) || 5) > 10).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">
            {clients.length} clientes registrados ·{' '}
            <span className="text-amber-600 font-semibold">{cycle5Count} en Ciclo 5</span> y{' '}
            <span className="text-blue-600 font-semibold">{cycle19Count} en Ciclo 19</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {isOperator ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Modo Caja: Consulta de Saldos (Solo Lectura)</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => downloadExcelTemplateHelper(plans, sectors)}
                className="bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 font-bold py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-all text-xs sm:text-sm shadow-sm"
                title="Descargar plantilla oficial de Excel (.xlsx)"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Plantilla Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="bg-white border border-slate-200 hover:border-amber-400 text-slate-700 font-bold py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-all text-xs sm:text-sm shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Importar Clientes</span>
              </button>
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 transition-all text-xs sm:text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Cliente</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Buscador + Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula o plan..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-sm"
          />
        </div>

        {/* Filtro de Ciclo */}
        <select
          value={filterCycle}
          onChange={(e) => setFilterCycle(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-sm font-medium"
        >
          <option value="all">Todos los ciclos (5 y 19)</option>
          <option value="5">Ciclo 5 (Corte día 5 · Cobro 1 al 5)</option>
          <option value="19">Ciclo 19 (Corte día 19 · Cobro 15 al 19)</option>
        </select>

        {/* Filtro de Sector */}
        <select
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-sm font-medium"
        >
          <option value="all">Todos los sectores</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Filtro de Estado */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 shadow-sm font-medium"
        >
          <option value="all">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="suspendido">Suspendidos</option>
          <option value="cortado">Cortados</option>
        </select>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No se encontraron clientes</p>
          <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros o agregando nuevos clientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const dueDay = Number(c.due_day) || 5;
            const isCycle5 = dueDay <= 10;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
              >
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
                      {c.sector && <p className="text-[10px] text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-300" />{c.sector.name}</p>}
                    </div>
                  </div>
                  {!isOperator && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditing(c);
                          setShowForm(true);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Editar cliente"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingClient(c)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Badge Estado */}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>

                    {/* Badge Ciclo */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        isCycle5
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {isCycle5 ? 'Ciclo 5 (Corte 5)' : 'Ciclo 19 (Corte 19)'}
                    </span>

                    <span className="text-xs font-bold text-slate-700">{formatUSD(c.monthly_amount)}/mes</span>
                    {c.balance > 0 && (
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        Deuda: {formatUSD(c.balance)}
                      </span>
                    )}
                  </div>
                  {c.phone && (
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                      <Phone className="w-3 h-3" />
                      {c.phone}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ClientForm
          client={editing}
          plans={plans}
          sectors={sectors}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            loadData();
          }}
          onDelete={(c) => {
            setShowForm(false);
            setEditing(null);
            setDeletingClient(c);
          }}
        />
      )}

      {/* Modal de confirmación para eliminar cliente */}
      {deletingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeletingClient(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-scale-in text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">¿Eliminar Cliente?</h3>
            <p className="text-sm text-slate-600 mt-2">
              ¿Estás seguro de que deseas eliminar a{' '}
              <strong className="text-slate-900">{deletingClient.full_name}</strong> (CI:{' '}
              {formatCedula(deletingClient.cedula)})?
            </p>
            <p className="text-xs text-rose-600 mt-3 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
              Esta acción eliminará al cliente del listado activo de cobranza.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingClient(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteClient}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors flex-1 flex items-center justify-center gap-2 shadow-sm"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <BulkImport
          plans={plans}
          sectors={sectors}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// =====================================================
// Formulario de Cliente (Crear / Editar con Ciclo 5 o 19)
// =====================================================
function ClientForm({
  client,
  plans,
  sectors,
  onClose,
  onSaved,
  onDelete,
}: {
  client: Client | null;
  plans: Plan[];
  sectors: Sector[];
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (client: Client) => void;
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
    setForm({
      ...form,
      plan_id: planId,
      monthly_amount: plan ? plan.price_usd.toString() : form.monthly_amount,
    });
  };

  const handleSave = async () => {
    if (!form.cedula || !form.full_name) {
      setError('Cédula y nombre son obligatorios');
      return;
    }
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
          if (error.code === '23505') {
            setError('Ya existe un cliente con esta cédula');
            setSaving(false);
            return;
          }
          throw error;
        }
      }
      onSaved();
    } catch {
      setError('No se pudo guardar el cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-slate-900">
            {client ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Cédula</label>
              <input
                type="text"
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: formatCedula(parseCedula(e.target.value)) })}
                placeholder="12.345.678"
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Teléfono</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0414-1234567"
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Nombre Completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Nombre del abonado"
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          {/* Ciclo de Facturación */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Ciclo de Facturación y Día de Corte
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, due_day: '5' })}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  form.due_day === '5'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-bold">Ciclo 5</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Cobro 1 al 5 · Corte día 5</p>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, due_day: '19' })}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  form.due_day === '19'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-bold">Ciclo 19</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Cobro 15 al 19 · Corte día 19</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Plan</label>
              <select
                value={form.plan_id}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              >
                <option value="">Sin plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {formatUSD(p.price_usd)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Sector / Zona</label>
              <select
                value={form.sector_id}
                onChange={(e) => setForm({ ...form, sector_id: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              >
                <option value="">Sin sector</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Monto Mensual (USD)</label>
              <input
                type="number"
                step="0.01"
                value={form.monthly_amount}
                onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              >
                <option value="activo">Activo</option>
                <option value="suspendido">Suspendido</option>
                <option value="cortado">Cortado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Saldo / Deuda Inicial (USD)</label>
            <input
              type="number"
              step="0.01"
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: e.target.value })}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Dirección</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Dirección del abonado"
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2.5 pt-2 items-center">
            {client && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(client)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-3 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs shrink-0"
                title="Eliminar este cliente"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{client ? 'Guardar Cambios' : 'Crear Cliente'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Importación Masiva con soporte para Ciclo 5 y Ciclo 19
// =====================================================
type ParsedClientRow = {
  rawIndex: number;
  cedula: string;
  fullName: string;
  planName: string;
  sectorName: string;
  cycle: 5 | 19;
  phone: string;
  address: string;
  balance: number;
  planId: string | null;
  sectorId: string | null;
  monthlyAmount: number;
  isValid: boolean;
  error?: string;
};

function BulkImport({
  plans,
  sectors,
  onClose,
  onImported,
}: {
  plans: Plan[];
  sectors: Sector[];
  onClose: () => void;
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [defaultCycle, setDefaultCycle] = useState<'5' | '19'>('5');
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedClientRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  // Parsea ciclo desde texto o número
  const parseCycleValue = (val: any, fallback: '5' | '19'): 5 | 19 => {
    if (val === undefined || val === null || val === '') return fallback === '19' ? 19 : 5;
    const str = String(val).toLowerCase().trim();
    if (str.includes('19') || str.includes('15')) return 19;
    if (str.includes('5') || str.includes('1 al 5')) return 5;
    return fallback === '19' ? 19 : 5;
  };

  // Procesa matriz de filas (desde Excel o CSV)
  const processMatrix = (matrix: any[][]) => {
    if (!matrix || matrix.length === 0) return;
    setResult(null);

    // Identificar encabezados si la primera fila parece encabezado
    let startIndex = 0;
    const firstRowStr = matrix[0]?.map((c) => String(c).toLowerCase()).join(' ') || '';
    const hasHeader =
      firstRowStr.includes('cedula') ||
      firstRowStr.includes('nombre') ||
      firstRowStr.includes('plan') ||
      firstRowStr.includes('c.i');

    let colCedula = 0;
    let colName = 1;
    let colPlan = 2;
    let colSector = 3;
    let colCycle = 4;
    let colPhone = 5;
    let colAddress = 6;
    let colBalance = 7;

    if (hasHeader) {
      startIndex = 1;
      const headers = matrix[0].map((c) => String(c).toLowerCase().trim());
      headers.forEach((h, idx) => {
        if (h.includes('cedula') || h.includes('c.i') || h === 'ci' || h.includes('identifica')) colCedula = idx;
        else if (h.includes('nombre') || h.includes('cliente')) colName = idx;
        else if (h.includes('plan')) colPlan = idx;
        else if (h.includes('sector') || h.includes('zona')) colSector = idx;
        else if (h.includes('ciclo') || h.includes('corte') || h.includes('dia')) colCycle = idx;
        else if (h.includes('tel') || h.includes('cel') || h.includes('phone')) colPhone = idx;
        else if (h.includes('dir') || h.includes('ubic')) colAddress = idx;
        else if (h.includes('saldo') || h.includes('deuda') || h.includes('balance')) colBalance = idx;
      });
    }

    const rows: ParsedClientRow[] = [];

    for (let i = startIndex; i < matrix.length; i++) {
      const row = matrix[i];
      if (!row || row.length === 0 || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
        continue;
      }

      const rawCedula = String(row[colCedula] || '').trim();
      const rawName = String(row[colName] || '').trim();
      const rawPlan = String(row[colPlan] || '').trim();
      const rawSector = String(row[colSector] || '').trim();
      const rawCycle = row[colCycle];
      const rawPhone = String(row[colPhone] || '').trim();
      const rawAddress = String(row[colAddress] || '').trim();
      const rawBalance = parseFloat(String(row[colBalance] || '0').replace(/[^0-9.-]/g, '')) || 0;

      if (!rawCedula && !rawName) continue;

      const cleanCedula = parseCedula(rawCedula);
      const cycle = parseCycleValue(rawCycle, defaultCycle);

      // Buscar coincidencia de plan
      const plan = plans.find(
        (p) =>
          p.name.toLowerCase().trim() === rawPlan.toLowerCase().trim() ||
          p.name.toLowerCase().includes(rawPlan.toLowerCase().trim())
      );

      // Buscar coincidencia de sector
      const sector = sectors.find(
        (s) =>
          s.name.toLowerCase().trim() === rawSector.toLowerCase().trim() ||
          s.name.toLowerCase().includes(rawSector.toLowerCase().trim())
      );

      let isValid = true;
      let error = '';

      if (!cleanCedula) {
        isValid = false;
        error = 'Cédula inválida';
      } else if (!rawName) {
        isValid = false;
        error = 'Falta el nombre';
      } else if (!plan && rawPlan) {
        isValid = false;
        error = `Plan "${rawPlan}" no existe en el sistema`;
      } else if (!plan && !rawPlan) {
        isValid = false;
        error = 'Plan no especificado';
      }

      rows.push({
        rawIndex: i + 1,
        cedula: cleanCedula,
        fullName: rawName,
        planName: plan?.name || rawPlan || 'Sin plan',
        sectorName: sector?.name || rawSector || '',
        cycle,
        phone: rawPhone,
        address: rawAddress,
        balance: rawBalance,
        planId: plan?.id || null,
        sectorId: sector?.id || null,
        monthlyAmount: plan?.price_usd || 25,
        isValid,
        error,
      });
    }

    setParsedRows(rows);
  };

  // Carga de archivo Excel (.xlsx, .xls) o CSV (.csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        processMatrix(jsonData);
      } catch (err: any) {
        alert('Error al leer el archivo: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Procesar texto pegado (soporta tabulaciones de Excel o comas de CSV)
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    const lines = pastedText.trim().split('\n');
    const matrix = lines.map((l) => {
      // Si contiene tabuladores (copiado directo de Excel) divide por tab, sino por comas
      if (l.includes('\t')) return l.split('\t').map((p) => p.trim());
      return l.split(',').map((p) => p.trim());
    });
    processMatrix(matrix);
  };

  // Descargar Plantillas usando helpers compartidos
  const downloadExcelTemplate = () => downloadExcelTemplateHelper(plans, sectors);
  const downloadCsvTemplate = () => downloadCsvTemplateHelper(plans, sectors);

  // Ejecutar inserción en base de datos
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setImporting(true);
    setResult(null);

    const payload = validRows.map((r) => ({
      cedula: r.cedula,
      full_name: r.fullName,
      plan_id: r.planId,
      sector_id: r.sectorId,
      plan_name: r.planName,
      monthly_amount: r.monthlyAmount,
      status: 'activo',
      due_day: r.cycle, // 5 o 19
      phone: r.phone || null,
      address: r.address || null,
      balance: r.balance || 0,
    }));

    try {
      const { data, error } = await supabase.from('clients').insert(payload).select();
      if (error) {
        setResult({ success: 0, errors: [`Error general de importación: ${error.message}`] });
      } else {
        const count = data?.length || payload.length;
        setResult({ success: count, errors: [] });
        setTimeout(() => {
          onImported();
        }, 1500);
      }
    } catch (err: any) {
      setResult({ success: 0, errors: [err.message] });
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;
  const cycle5InPreview = parsedRows.filter((r) => r.isValid && r.cycle === 5).length;
  const cycle19InPreview = parsedRows.filter((r) => r.isValid && r.cycle === 19).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto animate-scale-in flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Importar Clientes desde Excel / CSV
              </h2>
              <p className="text-xs text-slate-400">
                Compatible con asignación automática de <strong>Ciclo 5</strong> y <strong>Ciclo 19</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1">
          {/* Tarjeta explicativa con ciclo */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Estructura de la tabla de Excel o CSV:
                </p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  cedula | nombre | plan | sector | <strong className="text-emerald-700">ciclo (5 o 19)</strong> | telefono | direccion | saldo
                </p>
              </div>

              {/* Descargas de plantillas */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Plantilla Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Plantilla CSV</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Ciclo predeterminado si no viene en el archivo:</span>
                <select
                  value={defaultCycle}
                  onChange={(e) => setDefaultCycle(e.target.value as '5' | '19')}
                  className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="5">Ciclo 5 (Corte día 5)</option>
                  <option value="19">Ciclo 19 (Corte día 19)</option>
                </select>
              </div>
              <span className="text-[11px] text-slate-400">
                (Si la columna dice "19" o "Ciclo 19" se asigna corte día 19; si dice "5" se asigna corte día 5).
              </span>
            </div>
          </div>

          {/* Opciones de carga: Subir archivo o Pegar texto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Subir archivo Excel */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center min-h-[160px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">Seleccionar archivo Excel o CSV</p>
              <p className="text-[11px] text-slate-400 mt-1">Formatos soportados: .xlsx, .xls, .csv</p>
            </div>

            {/* 2. Pegar texto copiado */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                O pega las filas copiadas desde Excel o CSV:
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={'12345678\tCarlos Mendoza\tPlan Fibra 50M\tCarora Centro\t5\t0414-1234567\n87654321\tMaria Rodriguez\tPlan Fibra 100M\tCarora Norte\t19\t0412-9876543'}
                rows={5}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono resize-none text-slate-800"
              />
              <button
                type="button"
                onClick={handleProcessPastedText}
                disabled={!pastedText.trim()}
                className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-sm"
              >
                Procesar Texto Pegado
              </button>
            </div>
          </div>

          {/* Vista previa de registros listos para importar */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Vista Previa de Importación ({parsedRows.length} filas analizadas)
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {validCount} válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {invalidCount} con errores
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Ciclo 5: {cycle5InPreview}
                  </span>
                  <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Ciclo 19: {cycle19InPreview}
                  </span>
                </div>
              </div>

              {/* Tabla de previsualización */}
              <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-slate-200 shadow-inner">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2">Fila</th>
                      <th className="text-left px-3 py-2">Cédula</th>
                      <th className="text-left px-3 py-2">Nombre</th>
                      <th className="text-left px-3 py-2">Plan</th>
                      <th className="text-left px-3 py-2">Sector</th>
                      <th className="text-center px-3 py-2">Ciclo Asignado</th>
                      <th className="text-left px-3 py-2">Teléfono</th>
                      <th className="text-right px-3 py-2">Saldo ($)</th>
                      <th className="text-center px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                        <td className="px-3 py-1.5 text-slate-400 font-mono text-[11px]">{r.rawIndex}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700 font-medium">
                          {formatCedula(r.cedula)}
                        </td>
                        <td className="px-3 py-1.5 font-medium text-slate-900">{r.fullName}</td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {r.planName}
                          {r.planId && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({formatUSD(r.monthlyAmount)})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-slate-500">{r.sectorName || '—'}</td>
                        <td className="px-3 py-1.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              r.cycle === 5
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {r.cycle === 5 ? 'Ciclo 5 (Corte 5)' : 'Ciclo 19 (Corte 19)'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-slate-500">{r.phone || '—'}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-slate-600">
                          {formatUSD(r.balance)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {r.isValid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Válido
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800"
                              title={r.error}
                            >
                              {r.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botón de Confirmación */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Se importarán <strong>{validCount}</strong> clientes a la base de datos con su ciclo correspondiente.
                </p>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importing || validCount === 0}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all text-sm shadow-md"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>Confirmar e Importar {validCount} Clientes</span>
                </button>
              </div>
            </div>
          )}

          {/* Resultado de importación */}
          {result && (
            <div className="space-y-2 animate-fade-in pt-2">
              {result.success > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700 font-bold">
                    ¡Éxito! Se importaron {result.success} clientes correctamente.
                  </p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Errores detectados:</span>
                  </div>
                  {result.errors.map((e, idx) => (
                    <p key={idx} className="text-xs text-rose-600 font-mono">
                      • {e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
