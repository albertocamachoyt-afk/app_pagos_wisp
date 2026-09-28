import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  DollarSign,
  AlertTriangle,
  Wifi,
  MapPin,
} from 'lucide-react';
import { supabase, type Payment, type Client, type Plan, type Sector } from '@/lib/supabase';
import { formatUSD, formatBs, formatDate, statusColor, statusLabel } from '@/lib/format';
import type { AdminTab } from './AdminLayout';

type Props = {
  onNavigate: (tab: AdminTab) => void;
};

export default function AdminDashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    suspendedClients: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    rejectedPayments: 0,
    totalRevenue: 0,
    outstandingDebt: 0,
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ name: string; count: number }[]>([]);
  const [sectorDistribution, setSectorDistribution] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    const [
      { data: clients },
      { data: recentPay },
      { count: pendingCount },
      { count: approvedCount },
      { count: rejectedCount },
      { data: approvedPay },
    ] = await Promise.all([
      supabase.from('clients').select('*, plan:plans(*), sector:sectors(*)'),
      supabase.from('payments').select('*, client:clients(*)').order('submitted_at', { ascending: false }).limit(5),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'aprobado'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'rechazado'),
      supabase.from('payments').select('amount_usd').eq('status', 'aprobado'),
    ]);

    const clientList = (clients || []) as Client[];
    const paymentList = (recentPay || []) as Payment[];

    setStats({
      totalClients: clientList.length,
      activeClients: clientList.filter((c) => c.status === 'activo').length,
      suspendedClients: clientList.filter((c) => c.status !== 'activo').length,
      pendingPayments: pendingCount || 0,
      approvedPayments: approvedCount || 0,
      rejectedPayments: rejectedCount || 0,
      totalRevenue: (approvedPay || []).reduce((sum, p) => sum + Number(p.amount_usd), 0),
      outstandingDebt: clientList.reduce((sum, c) => sum + Number(c.balance), 0),
    });
    setRecentPayments(paymentList);

    // Plan distribution
    const planCounts: Record<string, number> = {};
    clientList.forEach((c) => {
      const name = c.plan?.name || c.plan_name || 'Sin plan';
      planCounts[name] = (planCounts[name] || 0) + 1;
    });
    setPlanDistribution(Object.entries(planCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));

    // Sector distribution
    const sectorCounts: Record<string, number> = {};
    clientList.forEach((c) => {
      const name = c.sector?.name || 'Sin sector';
      sectorCounts[name] = (sectorCounts[name] || 0) + 1;
    });
    setSectorDistribution(Object.entries(sectorCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));

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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resumen General</h1>
        <p className="text-sm text-slate-500 mt-1">Estado actual del sistema de pagos RTST</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Clientes Totales"
          value={stats.totalClients.toString()}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Clientes Activos"
          value={stats.activeClients.toString()}
          color="bg-emerald-50 text-emerald-600"
          sub={`${stats.suspendedClients} suspendidos`}
        />
        <StatCard
          icon={Clock}
          label="Pagos Pendientes"
          value={stats.pendingPayments.toString()}
          color="bg-amber-50 text-amber-600"
          onClick={() => onNavigate('payments')}
          clickable
        />
        <StatCard
          icon={DollarSign}
          label="Ingresos (Aprobados)"
          value={formatUSD(stats.totalRevenue)}
          color="bg-teal-50 text-teal-600"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-600">Pagos Aprobados</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.approvedPayments}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-semibold text-slate-600">Pagos Rechazados</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.rejectedPayments}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-600">Deuda Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatUSD(stats.outstandingDebt)}</p>
        </div>
      </div>

      {/* Recent payments */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Pagos Recientes</h2>
          <button
            onClick={() => onNavigate('payments')}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
          >
            Ver todos
          </button>
        </div>
        {recentPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No hay pagos registrados todavía
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentPayments.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                      p.status === 'aprobado'
                        ? 'bg-emerald-100 text-emerald-700'
                        : p.status === 'pendiente'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {p.client?.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {p.client?.full_name || 'Cliente'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatUSD(p.amount_usd)} · {formatDate(p.submitted_at)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(p.status)}`}
                >
                  {statusLabel(p.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan distribution */}
      {planDistribution.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-teal-500" />
            <h2 className="text-sm font-bold text-slate-900">Distribución por Plan</h2>
          </div>
          <div className="p-4 space-y-2">
            {planDistribution.map((p) => {
              const pct = stats.totalClients > 0 ? (p.count / stats.totalClients) * 100 : 0;
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 w-32 truncate">{p.name}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                    <div className="h-full bg-teal-400 rounded-lg flex items-center justify-end pr-2 transition-all" style={{ width: `${Math.max(pct, 8)}%` }}>
                      <span className="text-[10px] font-bold text-white">{p.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sector distribution */}
      {sectorDistribution.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Distribución por Sector</h2>
          </div>
          <div className="p-4 space-y-2">
            {sectorDistribution.map((s) => {
              const pct = stats.totalClients > 0 ? (s.count / stats.totalClients) * 100 : 0;
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-600 w-32 truncate">{s.name}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-lg flex items-center justify-end pr-2 transition-all" style={{ width: `${Math.max(pct, 8)}%` }}>
                      <span className="text-[10px] font-bold text-white">{s.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
  onClick,
  clickable,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  color: string;
  sub?: string;
  onClick?: () => void;
  clickable?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 border border-slate-100 ${clickable ? 'cursor-pointer hover:border-amber-300 transition-colors' : ''}`}
    >
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
        <Icon className="w-4.5 h-4.5" strokeWidth={1.5} />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
