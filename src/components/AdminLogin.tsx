import { useState } from 'react';
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  onSuccess: () => void;
  onBack: () => void;
};

export default function AdminLogin({ onSuccess, onBack }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);

  const checkAdmin = async (): Promise<boolean> => {
    const { data, error: rpcError } = await supabase.rpc('is_admin');
    if (rpcError || !data) return false;
    return data as boolean;
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);
    setPendingApproval(false);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const isAdmin = await checkAdmin();
        if (!isAdmin) {
          await supabase.auth.signOut();
          setPendingApproval(true);
          return;
        }

        onSuccess();
      } else {
        // Signup: create the account but do NOT auto-login.
        // The user must wait for super admin approval.
        const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (signUpData.user) {
          // Sign out immediately - they should not have access yet
          await supabase.auth.signOut();
          setPendingApproval(true);
        }
      }
    } catch (err: any) {
      setError(
        err.message?.includes('Invalid login')
          ? 'Correo o contraseña incorrectos'
          : err.message?.includes('already registered') || err.message?.includes('already been registered')
            ? 'Este correo ya esta registrado. Inicia sesion o contacta al administrador.'
            : err.message || 'Error de autenticacion'
      );
    } finally {
      setLoading(false);
    }
  };

  // Pending approval screen
  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full max-w-sm">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al portal
          </button>

          <div className="bg-white rounded-3xl p-8 shadow-2xl animate-scale-in text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-amber-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Cuenta creada
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Tu cuenta ha sido registrada correctamente, pero <strong>aun no tienes
              acceso</strong> al panel de administracion.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
              <p className="text-xs text-amber-800 leading-relaxed">
                Debes esperar a que el <strong>super administrador</strong> autorice tu
                cuenta. Una vez autorizada, podras ingresar con tu correo y contraseña.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Te notificaremos cuando tu cuenta sea activada</span>
            </div>
            <button
              onClick={() => {
                setPendingApproval(false);
                setMode('login');
                setEmail('');
                setPassword('');
              }}
              className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all text-sm"
            >
              Volver a iniciar sesion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al portal
        </button>

        <div className="bg-white rounded-3xl p-8 shadow-2xl animate-scale-in">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-amber-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {mode === 'login' ? 'Panel de Administracion' : 'Solicitar Acceso'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'login'
                ? 'Accede para gestionar pagos y clientes'
                : 'Registra tu cuenta para solicitar acceso al sistema'}
            </p>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Correo</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmit()}
                  placeholder="admin@rtst.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Contrasena</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmit()}
                  placeholder="Minimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 animate-fade-in">
              {error.includes('permisos') || error.includes('autorizad') ? (
                <ShieldAlert className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              )}
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'login' ? 'Ingresando...' : 'Registrando...'}</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Ingresar' : 'Solicitar Acceso'}</span>
            )}
          </button>

          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
              setPendingApproval(false);
            }}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-800 mt-4 transition-colors"
          >
            {mode === 'login' ? 'No tienes cuenta? Solicita acceso' : 'Ya tienes cuenta? Inicia sesion'}
          </button>

          {mode === 'signup' && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Al registrarte, tu cuenta queda <strong>pendiente de autorizacion</strong>.
                El super administrador debe aprobarla para que puedas ingresar.
                No tendras acceso al panel hasta que sea aprobada.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
