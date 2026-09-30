import { useState } from 'react';
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft, KeyRound, CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  onSuccess: () => void;
  onBack: () => void;
};

export default function AdminLogin({ onSuccess, onBack }: Props) {
  const [mode, setMode] = useState<'login' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'success'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const checkAdmin = async (): Promise<boolean> => {
    const { data, error: rpcError } = await supabase.rpc('is_admin');
    if (rpcError || !data) return false;
    return data as boolean;
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      if (signInErr) throw signInErr;

      const isAdmin = await checkAdmin();
      if (!isAdmin) {
        await supabase.auth.signOut();
        setError('Tu cuenta no tiene permisos autorizados en el sistema. Contacta al Superadministrador.');
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(
        err.message?.includes('Invalid login') || err.message?.includes('incorrect')
          ? 'Correo o contraseña incorrectos.'
          : err.message || 'Error de autenticación'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async () => {
    if (!email.trim()) {
      setError('Ingresa el correo electrónico asociado a tu cuenta administrativa.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Verifícalas e inténtalo de nuevo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcErr } = await supabase.rpc('reset_admin_password', {
        email: email.trim().toLowerCase(),
        new_password: newPassword.trim(),
      });

      if (rpcErr || !data) {
        throw new Error(rpcErr?.message || 'No se pudo restablecer la contraseña.');
      }

      setRecoveryStep('success');
      setSuccessMsg('Tu contraseña ha sido actualizada con éxito. Ya puedes ingresar con tu nueva clave.');
    } catch (err: any) {
      setError(err?.message || 'Error al restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-10">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al portal de clientes
        </button>

        <div className="bg-white rounded-3xl p-7 shadow-2xl animate-scale-in">
          {mode === 'login' ? (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-3 shadow-md">
                  <Lock className="w-7 h-7 text-amber-400" strokeWidth={1.75} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Panel Administrativo</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Acceso exclusivo para administradores y operadores de caja
                </p>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
                      placeholder="usuario@rtst.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('recovery');
                        setError(null);
                        setSuccessMsg(null);
                        setRecoveryStep('request');
                      }}
                      className="text-[11px] text-amber-600 hover:text-amber-800 font-semibold transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-rose-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <span>Ingresar al Sistema</span>
                )}
              </button>

              {/* Botones de credenciales demo para pruebas rápidas */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                <p className="text-[10px] text-center uppercase tracking-wider text-slate-400 font-bold">
                  Acceso rápido de prueba
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('albertocamacho26@gmail.com');
                      setPassword('admin');
                    }}
                    className="text-[11px] text-amber-800 bg-amber-50 hover:bg-amber-100 p-2 rounded-xl font-bold transition-colors text-center border border-amber-200/60"
                  >
                    👑 Super Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('caja@rtst.com');
                      setPassword('caja123');
                    }}
                    className="text-[11px] text-emerald-800 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-xl font-bold transition-colors text-center border border-emerald-200/60"
                  >
                    💳 Operador Caja
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Modo Recuperación de Contraseña */
            <div>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Recuperar Contraseña</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Restablece tu contraseña administrativa ingresando tu correo registrado
                </p>
              </div>

              {recoveryStep === 'request' ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Correo Electrónico Registrado
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu-correo@rtst.com"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite la contraseña"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 animate-fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-rose-700">{error}</p>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Nota: El <strong>Superadministrador</strong> también puede cambiar tu contraseña o correo manualmente en cualquier momento desde el panel.
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-3 rounded-xl transition-all text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handlePasswordRecovery}
                      disabled={loading}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Restablecer Clave</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Éxito al restablecer */
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    {successMsg}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setPassword(newPassword);
                      setError(null);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-sm"
                  >
                    Iniciar Sesión Ahora
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
