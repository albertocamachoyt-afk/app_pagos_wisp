import { useEffect, useRef, useState } from 'react';
import {
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  CalendarDays,
  FileDown,
  TrendingDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase, type Plan, type Sector, type Client } from '@/lib/supabase';
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
        <h1 className="text-2xl font-bold text-slate-900">Importar y Reportes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Carga clientes desde Excel y genera reportes de morosidad
        </p>
      </div>

      <ExcelImport plans={plans} sectors={sectors} onImported={loadData} />
      <DebtorsReport plans={plans} sectors={sectors} />
    </div>
  );
}

// =====================================================
// Excel Import
// =====================================================
function ExcelImport({
  plans,
  sectors,
  onImported,
}: {
  plans: Plan[];
  sectors: Sector[];
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<{
    success: number;
    errors: string[];
    duplicates: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  type ParsedRow = {
    cedula: string;
    full_name: string;
    plan_name: string;
    sector_name: string;
    phone: string;
    address: string;
    monthly_amount: number;
    due_day: number;
    status: string;
    valid: boolean;
    issue: string;
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);
    setPreview([]);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) {
        setError('El archivo no tiene hojas validas');
        setParsing(false);
        return;
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      if (rows.length === 0) {
        setError('El archivo no tiene datos');
        setParsing(false);
        return;
      }

      const planNames = new Map(plans.map((p) => [p.name.toLowerCase(), p]));
      const sectorNames = new Map(sectors.map((s) => [s.name.toLowerCase(), s]));

      const headerKeys = Object.keys(rows[0]).map((k) => k.toLowerCase().trim());

      const findCol = (row: Record<string, unknown>, options: string[]): string => {
        for (const opt of options) {
          const key = Object.keys(row).find((k) => k.toLowerCase().trim() === opt);
          if (key) return String(row[key] || '').trim();
        }
        return '';
      };

      const parsed: ParsedRow[] = rows.map((row) => {
        const cedula = findCol(row, ['cedula', 'ci', 'c.i.', 'documento', 'id']).replace(/\D/g, '');
        const full_name = findCol(row, [
          'nombre',
          'full_name',
          'nombre completo',
          'cliente',
          'nombres',
          'razon social',
        ]);
        const plan_name = findCol(row, ['plan', 'plan_name', 'tipo plan', 'servicio']);
        const sector_name = findCol(row, ['sector', 'zona', 'sector_name', 'ubicacion']);
        const phone = findCol(row, ['telefono', 'phone', 'celular', 'movil', 'tlf']);
        const address = findCol(row, ['direccion', 'address', 'dir', 'ubicacion exacta']);
        const monthlyRaw = findCol(row, ['monto', 'monthly_amount', 'precio', 'costo', 'tarifa']);
        const dueDayRaw = findCol(row, ['dia de corte', 'due_day', 'dia', 'corte', 'vencimiento']);
        const statusRaw = findCol(row, ['estado', 'status', 'situacion']).toLowerCase();

        const plan = planNames.get(plan_name.toLowerCase());
        const monthly_amount = monthlyRaw
          ? parseFloat(monthlyRaw.replace(/[^\d.]/g, ''))
          : plan
            ? plan.price_usd
            : 25;
        const due_day = dueDayRaw ? parseInt(dueDayRaw.replace(/\D/g, '')) || 5 : 5;
        const status = ['activo', 'suspendido', 'cortado'].includes(statusRaw)
          ? statusRaw
          : 'activo';

        let issue = '';
        if (!cedula) issue = 'Falta cedula';
        else if (!full_name) issue = 'Falta nombre';
        else if (!plan && plan_name) issue = `Plan "${plan_name}" no encontrado`;
        else if (!plan && !plan_name) issue = 'Sin plan asignado';

        return {
          cedula,
          full_name,
          plan_name: plan?.name || plan_name,
          sector_name,
          phone,
          address,
          monthly_amount,
          due_day,
          status,
          valid: !issue,
          issue,
        };
      });

      setPreview(parsed);
    } catch {
      setError('No se pudo leer el archivo. Asegurate de que sea un Excel valido (.xlsx, .xls)');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    const validRows = preview.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    setError(null);
    setResult(null);

    const planMap = new Map(plans.map((p) => [p.name.toLowerCase(), p]));
    const sectorMap = new Map(sectors.map((s) => [s.name.toLowerCase(), s]));

    const existingCedulas = new Set<string>();
    const { data: existing } = await supabase.from('clients').select('cedula');
    (existing || []).forEach((c: { cedula: string }) => existingCedulas.add(c.cedula));

    const toInsert: Record<string, unknown>[] = [];
    const errors: string[] = [];
    let duplicates = 0;

    for (const row of validRows) {
      if (existingCedulas.has(row.cedula)) {
        duplicates++;
        errors.push(`${formatCedula(row.cedula)} - ${row.full_name}: ya existe en la base de datos`);
        continue;
      }
      const plan = planMap.get(row.plan_name.toLowerCase());
      const sector = row.sector_name ? sectorMap.get(row.sector_name.toLowerCase()) : null;

      toInsert.push({
        cedula: row.cedula,
        full_name: row.full_name,
        plan_id: plan?.id || null,
        sector_id: sector?.id || null,
        plan_name: plan?.name || row.plan_name || '',
        monthly_amount: row.monthly_amount,
        status: row.status,
        due_day: row.due_day,
        phone: row.phone || null,
        address: row.address || null,
        balance: 0,
      });
      existingCedulas.add(row.cedula);
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('clients').insert(toInsert);
      if (insertError) {
        errors.push(`Error al guardar: ${insertError.message}`);
      }
    }

    setResult({
      success: toInsert.length,
      errors,
      duplicates,
    });

    if (toInsert.length > 0) {
      onImported();
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const planNames = plans.map((p) => p.name).join(' / ');
    const sectorNames = sectors.map((s) => s.name).join(' / ');
    const tmpl = [
      ['Cedula', 'Nombre', 'Plan', 'Sector', 'Telefono', 'Direccion', 'Monto', 'DiaCorte', 'Estado'],
      ['12345678', 'Carlos Mendoza', plans[0]?.name || 'Plan Basico', sectors[0]?.name || '', '0414-1234567', 'Calle 5 Casa 12', '25', '5', 'activo'],
      ['87654321', 'Maria Rodriguez', plans[1]?.name || plans[0]?.name || 'Plan Basico', sectors[1]?.name || '', '0412-9876543', 'Avenida 3 #45', '30', '5', 'activo'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(tmpl);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'plantilla_clientes_rtst.xlsx');
    void planNames;
    void sectorNames;
  };

  const reset = () => {
    setPreview([]);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <FileSpreadsheet className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Importar clientes desde Excel</h2>
          <p className="text-[11px] text-slate-400">
            Sube un archivo .xlsx con los datos de tus clientes
          </p>
        </div>
      </div>

      {/* Info / template */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
          <strong>Columnas que reconoce el sistema:</strong> Cedula, Nombre, Plan, Sector,
          Telefono, Direccion, Monto, DiaCorte, Estado. El Plan debe coincidir con uno ya
 creado. Sector es opcional. Si dejas Monto en blanco, se usa el precio del plan.
        </p>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 font-medium"
        >
          <Download className="w-3.5 h-3.5" />
          Descargar plantilla de Excel
        </button>
      </div>

      {/* Upload area */}
      {preview.length === 0 && !result && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-2xl py-10 px-4 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all"
        >
          {parsing ? (
            <Loader2 className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          )}
          <p className="text-sm text-slate-600 font-medium">
            {parsing ? 'Leyendo archivo...' : 'Haz clic para seleccionar un archivo Excel'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Formatos: .xlsx, .xls</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && !result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              {preview.length} filas leidas - {preview.filter((r) => r.valid).length} validas
            </span>
            <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-800">
              Cancelar
            </button>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Cedula</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Nombre</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Plan</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Estado</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Valido?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {preview.map((r, i) => (
                  <tr key={i} className={r.valid ? '' : 'bg-rose-50/40'}>
                    <td className="px-3 py-2 font-mono text-slate-700">{formatCedula(r.cedula) || '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{r.full_name || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.plan_name || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.status}</td>
                    <td className="px-3 py-2">
                      {r.valid ? (
                        <span className="text-emerald-600 font-medium">Si</span>
                      ) : (
                        <span className="text-rose-500" title={r.issue}>{r.issue}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={importing || preview.filter((r) => r.valid).length === 0}
              className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>Importar {preview.filter((r) => r.valid).length} cliente(s)</span>
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3 animate-fade-in">
          {result.success > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">
                {result.success} cliente(s) importados correctamente
              </p>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
              {result.errors.slice(0, 15).map((e, i) => (
                <p key={i} className="text-[11px] text-rose-700 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {e}
                </p>
              ))}
              {result.errors.length > 15 && (
                <p className="text-[11px] text-rose-500">
                  ...y {result.errors.length - 15} mas
                </p>
              )}
            </div>
          )}
          <button
            onClick={reset}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all"
          >
            Subir otro archivo
          </button>
        </div>
      )}
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
