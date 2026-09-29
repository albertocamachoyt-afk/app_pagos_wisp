import { useEffect, useState } from 'react';
import {
  Loader2,
  CheckCircle,
  CalendarDays,
  FileDown,
  TrendingDown,
} from 'lucide-react';
import { supabase, type Plan, type Sector } from '@/lib/supabase';
import { formatUSD, formatCedula, statusLabel } from '@/lib/format';

export default function AdminReports() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: planData }, { data: sectorData }] = await Promise.all([
      supabase.from('plans').select('*').order('price_usd'),
      supabase.from('sectors').select('*').order('name'),
    ]);
    setPlans(planData || []);
    setSectors(sectorData || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Consulta y genera reportes de pagos y morosidad de abonados
        </p>
      </div>

      <DebtorsReport plans={plans} sectors={sectors} />
    </div>
  );
}

// =====================================================
// Debtors Report (CSV)
// =====================================================
function DebtorsReport({ plans, sectors }: { plans: Plan[]; sectors: Sector[] }) {
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<DebtorRow[] | null>(null);
  const [settings, setSettings] = useState<{ due_day: number; bcv_rate: number } | null>(null);
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterSector, setFilterSector] = useState<string>('all');

  type DebtorRow = {
    cedula: string;
    full_name: string;
    plan_name: string;
    sector_name: string;
    phone: string;
    monthly_amount: number;
    balance: number;
    due_day: number;
    status: string;
    has_paid: boolean;
    paid_amount: number;
    debt: number;
  };

  useEffect(() => {
    supabase
      .from('settings')
      .select('due_day, bcv_rate')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data as { due_day: number; bcv_rate: number });
      });
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    setReport(null);

    const [year, month] = monthYear.split('-').map(Number);
    const dueDay = settings?.due_day || 5;

    // Period: from day 1 to due_day of the selected month
    const periodStart = new Date(year, month - 1, 1, 0, 0, 0);
    const periodEnd = new Date(year, month - 1, dueDay, 23, 59, 59);

    // Fetch all clients, optionally filtered by sector
    let clientsQuery = supabase
      .from('clients')
      .select('*, sector:sectors(name)')
      .order('full_name');
    if (filterSector !== 'all') {
      clientsQuery = clientsQuery.eq('sector_id', filterSector);
    }
    const { data: clients } = await clientsQuery;

    // Fetch approved payments in the period
    const { data: payments } = await supabase
      .from('payments')
      .select('client_id, amount_usd, status, submitted_at')
      .eq('status', 'aprobado')
      .gte('submitted_at', periodStart.toISOString())
      .lte('submitted_at', periodEnd.toISOString());

    // Build payment totals per client
    const paidByClient = new Map<string, number>();
    (payments || []).forEach((p: { client_id: string; amount_usd: number }) => {
      paidByClient.set(
        p.client_id,
        (paidByClient.get(p.client_id) || 0) + p.amount_usd
      );
    });

    const rows: DebtorRow[] = (clients || []).map((c: any) => {
      const paid = paidByClient.get(c.id) || 0;
      const monthly = c.monthly_amount || 0;
      const debt = Math.max(0, monthly - paid + (c.balance || 0));
      return {
        cedula: c.cedula,
        full_name: c.full_name,
        plan_name: c.plan_name || c.plan?.name || '',
        sector_name: c.sector?.name || '',
        phone: c.phone || '',
        monthly_amount: monthly,
        balance: c.balance || 0,
        due_day: c.due_day || dueDay,
        status: c.status,
        has_paid: paid >= monthly,
        paid_amount: paid,
        debt,
      };
    });

    setReport(rows);
    setGenerating(false);
  };

  const debtors = report?.filter((r) => !r.has_paid) || [];
  const paid = report?.filter((r) => r.has_paid) || [];

  const selectedSectorName = sectors.find((s) => s.id === filterSector)?.name || null;
  const totalDebt = debtors.reduce((sum, r) => sum + r.debt, 0);
  const totalPaid = paid.reduce((sum, r) => sum + r.paid_amount, 0);

  const downloadCSV = () => {
    if (!report) return;
    const [year, month] = monthYear.split('-').map(Number);
    const dueDay = settings?.due_day || 5;
    const monthName = new Date(year, month - 1).toLocaleDateString('es-VE', {
      month: 'long',
      year: 'numeric',
    });

    const headers = [
      'Cedula',
      'Nombre',
      'Plan',
      'Sector',
      'Telefono',
      'Monto Mensual (USD)',
      'Ya Pagado (USD)',
      'Saldo Pendiente (USD)',
      'Dia de Corte',
      'Estado',
      'Situacion',
    ];

    const csvLines: string[] = [];
    csvLines.push(`# Reporte de Pagos y Morosos - ${monthName}`);
    csvLines.push(`# Fecha de corte: dia ${dueDay} de ${monthName}`);
    if (selectedSectorName) {
      csvLines.push(`# Zona/Sector: ${selectedSectorName}`);
    } else {
      csvLines.push(`# Zona/Sector: Todas las zonas`);
    }
    csvLines.push(`# Total clientes: ${report.length}`);
    csvLines.push(`# Clientes al dia: ${paid.length}`);
    csvLines.push(`# Morosos: ${debtors.length}`);
    csvLines.push(`# Total cobrado: $${totalPaid.toFixed(2)}`);
    csvLines.push(`# Total por cobrar: $${totalDebt.toFixed(2)}`);
    csvLines.push('');
    csvLines.push(headers.join(','));

    // Morosos first
    csvLines.push('');
    csvLines.push('--- MOROSOS ---');
    debtors.forEach((r) => {
      csvLines.push(
        [
          formatCedula(r.cedula),
          `"${r.full_name}"`,
          `"${r.plan_name}"`,
          `"${r.sector_name}"`,
          r.phone,
          r.monthly_amount.toFixed(2),
          r.paid_amount.toFixed(2),
          r.debt.toFixed(2),
          r.due_day,
          statusLabel(r.status),
          'MOROSO',
        ].join(',')
      );
    });

    // Then paid
    csvLines.push('');
    csvLines.push('--- AL DIA ---');
    paid.forEach((r) => {
      csvLines.push(
        [
          formatCedula(r.cedula),
          `"${r.full_name}"`,
          `"${r.plan_name}"`,
          `"${r.sector_name}"`,
          r.phone,
          r.monthly_amount.toFixed(2),
          r.paid_amount.toFixed(2),
          r.debt.toFixed(2),
          r.due_day,
          statusLabel(r.status),
          'AL DIA',
        ].join(',')
      );
    });

    // Summary
    csvLines.push('');
    csvLines.push('--- RESUMEN ---');
    csvLines.push(`Total clientes,${report.length}`);
    csvLines.push(`Clientes al dia,${paid.length}`);
    csvLines.push(`Morosos,${debtors.length}`);
    csvLines.push(`Total cobrado (USD),${totalPaid.toFixed(2)}`);
    csvLines.push(`Total por cobrar (USD),${totalDebt.toFixed(2)}`);

    const blob = new Blob(['\ufeff' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sectorSuffix = selectedSectorName
      ? `_${selectedSectorName.replace(/\s+/g, '_').toLowerCase()}`
      : '_todas_las_zonas';
    a.download = `reporte_morosos_${monthYear}${sectorSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthOptions: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
    monthOptions.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  void plans;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
          <TrendingDown className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Reporte de Pagos y Morosos (CSV)</h2>
          <p className="text-[11px] text-slate-400">
            Genera un archivo CSV con todos los clientes, quienes pagaron y quienes deben
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Selecciona el mes. El reporte suma todos los <strong>pagos aprobados</strong> desde
          el dia 1 hasta el dia de corte ({settings?.due_day || 5}) de ese mes. Los clientes que
          no hayan pagado su mensualidad aparecen como morosos con el monto pendiente.
        </p>
      </div>

      {/* Month + sector selector */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-800 mb-1.5">Mes del reporte</label>
          <div className="relative">
            <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={monthYear}
              onChange={(e) => {
                setMonthYear(e.target.value);
                setReport(null);
              }}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-800 mb-1.5">Zona / Sector</label>
          <select
            value={filterSector}
            onChange={(e) => {
              setFilterSector(e.target.value);
              setReport(null);
            }}
            className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
          >
            <option value="all">Todas las zonas</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={generateReport}
            disabled={generating}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
            <span>Generar Reporte</span>
          </button>
        </div>
      </div>

      {/* Results summary */}
      {report && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 font-medium uppercase">Total</p>
              <p className="text-xl font-bold text-slate-800">{report.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-emerald-600 font-medium uppercase">Al dia</p>
              <p className="text-xl font-bold text-emerald-700">{paid.length}</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-rose-600 font-medium uppercase">Morosos</p>
              <p className="text-xl font-bold text-rose-700">{debtors.length}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-amber-600 font-medium uppercase">Por cobrar</p>
              <p className="text-xl font-bold text-amber-700">{formatUSD(totalDebt)}</p>
            </div>
          </div>

          {/* Debtors table preview */}
          {debtors.length > 0 && (
            <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-slate-100">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold text-slate-600">Cedula</th>
                    <th className="text-left px-3 py-2 font-bold text-slate-600">Nombre</th>
                    <th className="text-right px-3 py-2 font-bold text-slate-600">Mensual</th>
                    <th className="text-right px-3 py-2 font-bold text-slate-600">Pagado</th>
                    <th className="text-right px-3 py-2 font-bold text-slate-600">Debe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {debtors.map((r, i) => (
                    <tr key={i} className="hover:bg-rose-50/30">
                      <td className="px-3 py-2 font-mono text-slate-700">{formatCedula(r.cedula)}</td>
                      <td className="px-3 py-2 text-slate-700">{r.full_name}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{formatUSD(r.monthly_amount)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatUSD(r.paid_amount)}</td>
                      <td className="px-3 py-2 text-right text-rose-600 font-bold">{formatUSD(r.debt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {debtors.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-sm text-emerald-700 font-medium">
                Todos los clientes estan al dia este mes
              </p>
            </div>
          )}

          <button
            onClick={downloadCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all text-sm w-full sm:w-auto"
          >
            <FileDown className="w-4 h-4" />
            <span>Descargar CSV{selectedSectorName ? ` - ${selectedSectorName}` : ' - Todas las zonas'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
