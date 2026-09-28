import { useEffect, useState } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  X,
  Loader2,
  ExternalLink,
  Filter,
  Plus,
} from 'lucide-react';
import { supabase, type Payment, type Client, type Settings } from '@/lib/supabase';
import { formatUSD, formatBs, formatDate, statusColor, statusLabel, formatCedula } from '@/lib/format';
import AdminRegisterPayment from './AdminRegisterPayment';

type FilterStatus = 'all' | 'pendiente' | 'aprobado' | 'rechazado';

export default function AdminPayments({ session }: { session?: any }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    loadPayments();
    supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setSettings(data));
  }, [filter]);

  const loadPayments = async () => {
    setLoading(true);
    let query = supabase
      .from('payments')
      .select('*, client:clients(*)')
      .order('submitted_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setPayments((data || []) as Payment[]);
    setLoading(false);
  };

  const filtered = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.client?.full_name?.toLowerCase().includes(q) ||
      p.client?.cedula?.includes(q) ||
      p.reference_number?.toLowerCase().includes(q)
    );
  });

  const handleApprove = async (payment: Payment) => {
    setActionLoading(true);
    const reviewerId = session?.user?.id || null;

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'aprobado',
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
      })
      .eq('id', payment.id);

    if (!error && payment.client) {
      const newBalance = Math.max(0, Number(payment.client.balance) - Number(payment.amount_usd));
      const newStatus = newBalance <= 0 ? 'activo' : payment.client.status;
      await supabase
        .from('clients')
        .update({ balance: newBalance, status: newStatus })
        .eq('id', payment.client_id);
    }

    await supabase.from('payment_audit').insert({
      payment_id: payment.id,
      action: 'aprobado',
      notes: adminNotes || null,
      performed_by: reviewerId,
    });

    setActionLoading(false);
    setSelected(null);
    setAdminNotes('');
    loadPayments();
  };

  const handleReject = async (payment: Payment) => {
    setActionLoading(true);
    const reviewerId = session?.user?.id || null;

    const { error } = await supabase
      .from('payments')
      .update({
        status: 'rechazado',
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
      })
      .eq('id', payment.id);

    if (!error) {
      await supabase.from('payment_audit').insert({
        payment_id: payment.id,
        action: 'rechazado',
        notes: adminNotes || null,
        performed_by: reviewerId,
      });
    }

    setActionLoading(false);
    setSelected(null);
    setAdminNotes('');
    loadPayments();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Revisión de Pagos</h1>
          <p className="text-sm text-slate-500 mt-1">Aprueba o rechaza los pagos reportados</p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all text-sm shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />\n          <span>Registrar Pago Manual</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula o referencia..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
          />
        </div>
        <div className="flex gap-1.5 bg-white border border-slate-200 rounded-xl p-1">
          {(['all', 'pendiente', 'aprobado', 'rechazado'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {f === 'pendiente' && <Clock className="w-3 h-3" />}
              {f === 'aprobado' && <CheckCircle className="w-3 h-3" />}
              {f === 'rechazado' && <XCircle className="w-3 h-3" />}
              {f === 'all' && <Filter className="w-3 h-3" />}
              <span className="capitalize">{f === 'all' ? 'Todos' : statusLabel(f)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payments list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <p className="text-sm text-slate-400">No hay pagos para mostrar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-200 transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                    p.status === 'aprobado'
                      ? 'bg-emerald-100 text-emerald-700'
                      : p.status === 'pendiente'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {p.client?.full_name?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {p.client?.full_name || 'Cliente'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    CI: {formatCedula(p.client?.cedula || '')} · {formatUSD(p.amount_usd)} ·{' '}
                    {formatDate(p.submitted_at)}
                  </p>
                  {p.reference_number && (
                    <p className="text-[10px] text-slate-400 font-mono">
                      Ref: {p.reference_number}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.payment_method && p.payment_method !== 'online' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase">
                    {p.payment_method === 'pos' ? 'POS' : 'Efectivo'}
                  </span>
                )}
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(p.status)}`}
                >
                  {statusLabel(p.status)}
                </span>
                <button
                  onClick={() => {
                    setSelected(p);
                    setAdminNotes(p.admin_notes || '');
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register payment modal */}
      {showRegister && settings && (
        <AdminRegisterPayment
          settings={settings}
          onClose={() => setShowRegister(false)}
          onRegistered={() => { setShowRegister(false); loadPayments(); }}
        />
      )}

      {/* Detail drawer */}
      {selected && (
        <PaymentDetailDrawer
          payment={selected}
          adminNotes={adminNotes}
          setAdminNotes={setAdminNotes}
          onClose={() => {
            setSelected(null);
            setAdminNotes('');
          }}
          onApprove={() => handleApprove(selected)}
          onReject={() => handleReject(selected)}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

function PaymentDetailDrawer({
  payment,
  adminNotes,
  setAdminNotes,
  onClose,
  onApprove,
  onReject,
  actionLoading,
}: {
  payment: Payment;
  adminNotes: string;
  setAdminNotes: (v: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-slate-900">Detalle del Pago</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Client info */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Cliente
            </p>
            <p className="text-base font-bold text-slate-900">{payment.client?.full_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              CI: {formatCedula(payment.client?.cedula || '')} · {payment.client?.plan_name}
            </p>
            <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500">Monto</p>
                <p className="text-lg font-bold text-slate-900">{formatUSD(payment.amount_usd)}</p>
                <p className="text-[11px] text-slate-400">{formatBs(payment.amount_bs)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-500">Tasa BCV</p>
                <p className="text-sm font-semibold text-slate-700">
                  {payment.bcv_rate.toFixed(2)} Bs./$
                </p>
              </div>
            </div>
          </div>

          {/* Payment details */}
          <div className="space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Fecha de Envío
              </p>
              <p className="text-sm text-slate-700">{formatDate(payment.submitted_at)}</p>
            </div>
            {payment.reference_number && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Número de Referencia
                </p>
                <p className="text-sm font-mono font-semibold text-slate-700">
                  {payment.reference_number}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Estado Actual
              </p>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusColor(payment.status)}`}
              >
                {statusLabel(payment.status)}
              </span>
            </div>
            {payment.payment_method && payment.payment_method !== 'online' && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Metodo de Cobro
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">
                    {payment.payment_method === 'pos' ? 'Punto de Venta (POS)' : 'Efectivo'}
                    {payment.payment_method === 'pos' && payment.terminal_id && ` - ${payment.terminal_id}`}
                  </p>
                  {payment.card_type && <p className="text-[11px] text-slate-500">{payment.card_type}</p>}
                  {payment.card_last4 && <p className="text-[11px] text-slate-400 font-mono">Tarjeta: ****{payment.card_last4}</p>}
                  {payment.batch_number && <p className="text-[11px] text-slate-400 font-mono">Lote: {payment.batch_number}</p>}
                  {payment.receipt_number && <p className="text-[11px] text-slate-400 font-mono">Recibo: {payment.receipt_number}</p>}
                  {payment.currency_received && <p className="text-[11px] text-slate-500">Moneda: {payment.currency_received}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Receipt image */}
          {payment.receipt_url && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Comprobante
              </p>
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <img
                  src={payment.receipt_url}
                  alt="Comprobante de pago"
                  className="w-full object-cover"
                />
              </div>
              <a
                href={payment.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver imagen completa
              </a>
            </div>
          )}

          {/* Admin notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Notas de Administración
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Ej. Comprobante verificado correctamente..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800 resize-none"
            />
          </div>

          {/* Action buttons */}
          {payment.status === 'pendiente' && (
            <div className="flex gap-3">
              <button
                onClick={onApprove}
                disabled={actionLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Aprobar</span>
              </button>
              <button
                onClick={onReject}
                disabled={actionLoading}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>Rechazar</span>
              </button>
            </div>
          )}

          {payment.reviewed_at && (
            <div className="text-center">
              <p className="text-[11px] text-slate-400">
                Revisado el {formatDate(payment.reviewed_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
