import { useState, type ReactNode } from 'react';
import { LayoutDashboard, Receipt, Users, Settings as SettingsIcon, LogOut, Menu, X, Wifi, MapPin, ShieldCheck, FileBarChart } from 'lucide-react';

export type AdminTab = 'dashboard' | 'payments' | 'clients' | 'plans' | 'sectors' | 'admins' | 'reports' | 'settings';

type Props = {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onSignOut: () => void;
  children: ReactNode;
  pendingCount: number;
};

const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
  { id: 'payments', label: 'Pagos', icon: Receipt },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'plans', label: 'Planes', icon: Wifi },
  { id: 'sectors', label: 'Sectores', icon: MapPin },
  { id: 'admins', label: 'Admins', icon: ShieldCheck },
  { id: 'reports', label: 'Importar/Reportes', icon: FileBarChart },
  { id: 'settings', label: 'Configuración', icon: SettingsIcon },
];

export default function AdminLayout({ activeTab, onTabChange, onSignOut, children, pendingCount }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-900 text-white shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <span className="text-black font-black text-xs">RTST</span>
            </div>
            <div>
              <h1 className="text-sm font-bold">RTST Admin</h1>
              <p className="text-[10px] text-slate-400">Panel de Gestión</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
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
                {item.id === 'payments' && pendingCount > 0 && (
                  <span
                    className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-slate-900 text-amber-400' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {pendingCount}
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
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
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
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
                    {item.id === 'payments' && pendingCount > 0 && (
                      <span
                        className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          active ? 'bg-slate-900 text-amber-400' : 'bg-rose-500 text-white'
                        }`}
                      >
                        {pendingCount}
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
