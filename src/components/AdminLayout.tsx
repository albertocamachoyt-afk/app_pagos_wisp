import { useState, useEffect, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Wifi,
  MapPin,
  ShieldCheck,
  FileBarChart,
  AlertTriangle,
} from 'lucide-react';
import type { FailureReport, AdminRole } from '@/lib/supabase';
import { onFailureAlert, requestPushPermission } from '@/lib/notifications';

export type AdminTab =
  | 'dashboard'
  | 'payments'
  | 'failures'
  | 'clients'
  | 'plans'
  | 'sectors'
  | 'admins'
  | 'reports'
  | 'settings';

type Props = {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onSignOut: () => void;
  children: ReactNode;
  pendingCount: number;
  pendingFailuresCount?: number;
  role?: AdminRole;
};

const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
  { id: 'payments', label: 'Pagos y Caja', icon: Receipt },
  { id: 'failures', label: 'Fallas / Averías', icon: AlertTriangle },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'plans', label: 'Planes', icon: Wifi },
  { id: 'sectors', label: 'Sectores', icon: MapPin },
  { id: 'admins', label: 'Equipo y Roles', icon: ShieldCheck },
  { id: 'reports', label: 'Reportes', icon: FileBarChart },
  { id: 'settings', label: 'Configuración', icon: SettingsIcon },
];

export default function AdminLayout({
  activeTab,
  onTabChange,
  onSignOut,
  children,
  pendingCount,
  pendingFailuresCount = 0,
  role = 'admin',
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<FailureReport | null>(null);

  // Filtrar ítems de navegación según el rol
  const visibleNavItems = navItems.filter((item) => {
    if (role === 'operador') {
      return item.id === 'payments' || item.id === 'clients' || item.id === 'failures';
    }
    if (role === 'admin') {
      // El administrador no puede gestionar otros usuarios
      return item.id !== 'admins';
    }
    return true; // super_admin tiene acceso a todas
  });

  // Request browser push notification permission and listen for alerts
  useEffect(() => {
    requestPushPermission();

    const unsubscribe = onFailureAlert((report) => {
      setActiveToast(report);
      // Auto-dismiss in 10 seconds
      setTimeout(() => {
        setActiveToast((current) => (current?.id === report.id ? null : current));
      }, 10000);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex relative">
      {/* Floating Push Alert Banner */}
      {activeToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-rose-500/50 animate-slide-in-right flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                ¡Nueva Avería Reportada!
              </span>
              <button
                onClick={() => setActiveToast(null)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-bold text-white mt-1 truncate">{activeToast.client_name}</p>
            <p className="text-[11px] text-slate-300 mt-0.5 truncate">
              {activeToast.issue_type} · {activeToast.sector_name || 'Carora'}
            </p>
            <button
              onClick={() => {
                onTabChange('failures');
                setActiveToast(null);
              }}
              className="mt-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
            >
              <span>Ver reporte de avería</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-900 text-white shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <span className="text-black font-black text-xs">RTST</span>
            </div>
            <div>
              <h1 className="text-sm font-bold">RTST Admin</h1>
              <p className="text-[10px] text-amber-400 font-semibold">
                {role === 'super_admin' ? '👑 Super Admin' : role === 'operador' ? '💳 Operador de Caja' : '🛡️ Administrador'}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const isPayments = item.id === 'payments';
            const isFailures = item.id === 'failures';
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-amber-500 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {isPayments && pendingCount > 0 && (
                  <span
                    className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-slate-900 text-amber-400' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
                {isFailures && pendingFailuresCount > 0 && (
                  <span
                    className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse ${
                      active ? 'bg-slate-900 text-rose-400' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {pendingFailuresCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <span className="text-black font-black text-[10px]">RTST</span>
          </div>
          <span className="text-sm font-bold">RTST Admin</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 text-white animate-slide-in-right flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold">Menú</span>
              <button onClick={() => setMobileOpen(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                const isPayments = item.id === 'payments';
                const isFailures = item.id === 'failures';
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-amber-500 text-slate-900'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {isPayments && pendingCount > 0 && (
                      <span
                        className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          active ? 'bg-slate-900 text-amber-400' : 'bg-rose-500 text-white'
                        }`}
                      >
                        {pendingCount}
                      </span>
                    )}
                    {isFailures && pendingFailuresCount > 0 && (
                      <span
                        className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          active ? 'bg-slate-900 text-rose-400' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {pendingFailuresCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-800">
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:pt-0 pt-14 overflow-x-hidden">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
