import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Mail, Loader2, ShieldCheck, AlertCircle, Calendar, Crown, Clock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Admin = {
  user_id: string;
  email: string;
  created_at: string;
  created_by: string | null;
  role: string;
};

export default function AdminAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    const [{ data, error: queryError }, { data: superAdmin }] = await Promise.all([
      supabase.from('admins').select('user_id, email, created_at, created_by, role').order('created_at', { ascending: true }),
      supabase.rpc('is_super_admin'),
    ]);
    if (!queryError && data) {
      setAdmins(data);
    }
    setIsSuperAdmin(!!superAdmin);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc('add_admin', {
      admin_email: newEmail.trim().toLowerCase(),
    });

    if (rpcError) {
      setError(
        rpcError.message.includes('No se encontro')
          ? 'No se encontro un usuario con ese correo. La persona debe crear su cuenta primero en la pantalla de login.'
          : rpcError.message.includes('super administrador')
            ? 'Solo el super administrador puede autorizar nuevos administradores.'
            : rpcError.message
      );
    } else {
      setSuccess(`${newEmail.trim()} autorizado correctamente como administrador`);
      setNewEmail('');
      await loadAdmins();
    }
    setAdding(false);
  };

  const handleRemove = async (userId: string, email: string, role: string) => {
    if (role === 'super_admin') {
      setError('No se puede remover al super administrador');
      return;
    }
    if (!confirm(`Seguro que deseas remover a ${email} como administrador?`)) return;
    setRemovingId(userId);
    setError(null);
    const { error: delError } = await supabase.from('admins').delete().eq('user_id', userId);
    if (!delError) {
      setSuccess(`${email} removido como administrador`);
      await loadAdmins();
    } else {
      setError(
        delError.message.includes('super') || delError.code === '42501'
          ? 'Solo el super administrador puede remover administradores.'
          : delError.message
      );
    }
    setRemovingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Administradores</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestiona quienes tienen acceso al panel de administracion
        </p>
      </div>

      {/* Super admin banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <Crown className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-900">Control de acceso restringido</p>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            {isSuperAdmin
              ? 'Eres el super administrador. Solo tu puedes autorizar o remover administradores. Nadie mas puede acceder al panel sin tu aprobacion.'
              : 'Solo el super administrador puede autorizar nuevos accesos. Los nuevos registros deben ser aprobados antes de poder ingresar.'}
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-blue-900">Como funciona</p>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            Para agregar un administrador, la persona debe primero solicitar acceso en la
            pantalla de login. Su cuenta queda pendiente. Luego, el super administrador
            autoriza el correo aqui. Solo despues de eso la persona podra ingresar.
          </p>
        </div>
      </div>

      {/* Add admin - only super admin */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserPlus className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Autorizar Administrador</h2>
        </div>

        {isSuperAdmin ? (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !adding && handleAdd()}
                  placeholder="correo@ejemplo.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={adding || !newEmail.trim()}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all text-sm shrink-0"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>Autorizar</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              El correo debe estar registrado previamente en el sistema.
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-500">
              Solo el super administrador puede autorizar nuevos administradores.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-xs text-rose-700 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {success && (
          <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700 flex-1">{success}</p>
            <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-600 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Admins list */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            Administradores autorizados ({admins.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-50">
          {admins.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No hay administradores registrados</p>
            </div>
          ) : (
            admins.map((admin) => (
              <div
                key={admin.user_id}
                className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${admin.role === 'super_admin' ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'}`}>
                  {admin.email.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900 truncate">{admin.email}</p>
                    {admin.role === 'super_admin' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Crown className="w-3 h-3" />
                        Super Admin
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <p className="text-[11px] text-slate-400">
                      {new Date(admin.created_at).toLocaleDateString('es-VE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                {admin.role !== 'super_admin' && isSuperAdmin ? (
                  <button
                    onClick={() => handleRemove(admin.user_id, admin.email, admin.role)}
                    disabled={removingId === admin.user_id}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                    title="Remover administrador"
                  >
                    {removingId === admin.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                ) : admin.role === 'super_admin' ? (
                  <div className="p-2 text-amber-400" title="Super administrador no puede ser removido">
                    <Crown className="w-4 h-4" />
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending registrations info */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-slate-700">Cuentas pendientes</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Cuando alguien solicita acceso, su cuenta se crea pero queda sin permisos.
            Debe aparecer aqui su correo para que el super administrador lo autorice.
            Si alguien intenta ingresar sin autorizacion, vera un mensaje indicando que
            debe esperar aprobacion.
          </p>
        </div>
      </div>
    </div>
  );
}
