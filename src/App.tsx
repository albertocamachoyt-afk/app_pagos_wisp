import { useEffect, useState } from 'react';
import { Shield, Clock, ArrowLeft, LogOut } from 'lucide-react';
import { supabase, type Client, type Settings, type Payment } from '@/lib/supabase';
import ClientHeader from '@/components/ClientHeader';
import Footer from '@/components/Footer';
import ClientLookup from '@/components/ClientLookup';
import PaymentReport from '@/components/PaymentReport';
import AdminLogin from '@/components/AdminLogin';
import AdminLayout, { type AdminTab } from '@/components/AdminLayout';
import AdminDashboard from '@/components/AdminDashboard';
import AdminPayments from '@/components/AdminPayments';
import AdminClients from '@/components/AdminClients';
import AdminPlans from '@/components/AdminPlans';
import AdminSectors from '@/components/AdminSectors';
import AdminSettings from '@/components/AdminSettings';
import AdminAdmins from '@/components/AdminAdmins';
import AdminReports from '@/components/AdminReports';

type View = 'client-lookup' | 'payment-report' | 'admin-login' | 'admin-panel' | 'admin-pending';

export default function App() {
  const [view, setView] = useState<View>('client-lookup');
  const [client, setClient] = useState<Client | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [pendingCount, setPendingCount] = useState(0);

  const verifyAdmin = async (): Promise<boolean> => {
    const { data } = await supabase.rpc('is_admin');
    const admin = !!data;
    setIsAdmin(admin);
    return admin;
  };

  // Check for existing session and set up realtime settings subscription
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s) {
        setSession(s);
        const admin = await verifyAdmin();
        setView(admin ? 'admin-panel' : 'admin-pending');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setIsAdmin(false);
        setView('client-lookup');
      }
    });

    // Realtime: keep settings fresh so client portal shows current BCV rate
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload: any) => {
        setSettings(payload.new as Settings);
      })
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load pending count for admin badge
  useEffect(() => {
    if (session) {
      loadPendingCount();
    }
  }, [session, adminTab]);

  const loadPendingCount = async () => {
    const { count } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendiente');
    setPendingCount(count || 0);
  };

  // Listen for demo cedula clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const cedula = (e as CustomEvent).detail;
      const input = document.querySelector('input[placeholder*="cédula"]') as HTMLInputElement;
      if (input) {
        input.value = cedula.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    window.addEventListener('demo-cedula', handler);
    return () => window.removeEventListener('demo-cedula', handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setView('client-lookup');
  };

  // Pending approval screen (session exists but not admin)
  if (view === 'admin-pending' && session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Acceso pendiente de autorizacion</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Tu cuenta aun no ha sido autorizada por el super administrador.
            Una vez aprobada, podras ingresar al panel de administracion.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setView('client-lookup')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ir al portal</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesion</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin panel
  if (view === 'admin-panel' && session && isAdmin) {
    return (
      <AdminLayout
        activeTab={adminTab}
        onTabChange={setAdminTab}
        onSignOut={handleSignOut}
        pendingCount={pendingCount}
      >
        {adminTab === 'dashboard' && <AdminDashboard onNavigate={setAdminTab} />}
        {adminTab === 'payments' && <AdminPayments session={session} />}
        {adminTab === 'clients' && <AdminClients />}
        {adminTab === 'plans' && <AdminPlans />}
        {adminTab === 'sectors' && <AdminSectors />}
        {adminTab === 'settings' && <AdminSettings />}
        {adminTab === 'admins' && <AdminAdmins />}
        {adminTab === 'reports' && <AdminReports />}
      </AdminLayout>
    );
  }

  // Admin login
  if (view === 'admin-login') {
    return (
      <AdminLogin
        onSuccess={async () => {
          const admin = await verifyAdmin();
          if (admin) setView('admin-panel');
        }}
        onBack={() => setView('client-lookup')}
      />
    );
  }

  // Client portal
  return (
    <div className="min-h-screen flex flex-col justify-between text-slate-800 bg-[#f4f5f8] antialiased relative selection:bg-amber-100">
      <ClientHeader />

      {view === 'payment-report' && client && settings ? (
        <PaymentReport
          client={client}
          settings={settings}
          onBack={() => {
            setView('client-lookup');
            setClient(null);
          }}
        />
      ) : (
        <ClientLookup
          onFound={(c, s) => {
            setClient(c);
            setSettings(s);
            setView('payment-report');
          }}
        />
      )}

      <Footer />

      {/* Admin access button */}
      <button
        onClick={() => setView('admin-login')}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
        title="Panel de Administración"
      >
        <Shield className="w-6 h-6" strokeWidth={1.5} />
      </button>
    </div>
  );
}
