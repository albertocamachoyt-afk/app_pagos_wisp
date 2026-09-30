import { useEffect, useState } from 'react';
import {
  UserPlus,
  Trash2,
  Mail,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Crown,
  Lock,
  Edit2,
  KeyRound,
  X,
  CreditCard,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { supabase, type AdminRole, type AdminRecord } from '@/lib/supabase';

export default function AdminAdmins() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [changingPassAdmin, setChangingPassAdmin] = useState<AdminRecord | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminRecord | null>(null);

  // Formulario creación
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin' as AdminRole,
  });

  // Formulario edición
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'admin' as AdminRole,
  });

  // Formulario cambiar clave
  const [newPassword, setNewPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const [{ data: superRes }, { data: currentAdm }] = await Promise.all([
        supabase.rpc('is_super_admin'),
        supabase.rpc('get_current_admin'),
      ]);

      setIsSuperAdmin(Boolean(superRes));
      if (currentAdm?.email) {
        setCurrentEmail(currentAdm.email);
      }

      const { data: adminList, error: queryError } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: true });

      if (!queryError && adminList) {
        setAdmins(adminList as AdminRecord[]);
      }
    } catch (e: any) {
      setError(e?.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      setError('Debes ingresar al menos el correo y la contraseña.');
      return;
    }
    if (createForm.password.length < 4) {
      setError('La contraseña debe tener mínimo 4 caracteres.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: rpcErr } = await supabase.rpc('create_admin_user', {
      email: createForm.email.trim().toLowerCase(),
      name: createForm.name.trim() || createForm.email.split('@')[0],
      password: createForm.password.trim(),
      role: createForm.role,
    });

    if (rpcErr) {
      setError(rpcErr.message);
    } else {
      setSuccess(`Usuario ${createForm.email} creado exitosamente con rol ${createForm.role === 'admin' ? 'Administrador' : 'Operador de Caja'}`);
      setCreateForm({ name: '', email: '', password: '', role: 'admin' });
      setShowCreateModal(false);
      await loadAdmins();
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingAdmin) return;
    if (!editForm.email.trim()) {
      setError('El correo no puede estar vacío.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: rpcErr } = await supabase.rpc('update_admin_user', {
      user_id: editingAdmin.user_id,
      email: editForm.email.trim().toLowerCase(),
      name: editForm.name.trim(),
      role: editForm.role,
    });

    if (rpcErr) {
      setError(rpcErr.message);
    } else {
      setSuccess(`Datos de ${editForm.email} actualizados correctamente.`);
      setEditingAdmin(null);
      await loadAdmins();
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!changingPassAdmin) return;
    if (!newPassword || newPassword.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: rpcErr } = await supabase.rpc('reset_admin_password', {
      email: changingPassAdmin.email,
      new_password: newPassword.trim(),
    });

    if (rpcErr) {
      setError(rpcErr.message);
    } else {
      setSuccess(`Contraseña cambiada con éxito para ${changingPassAdmin.email}.`);
      setChangingPassAdmin(null);
      setNewPassword('');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingAdmin) return;
    if (deletingAdmin.role === 'super_admin') {
      setError('No es posible eliminar al Superadministrador principal.');
      setDeletingAdmin(null);
      return;
    }

    setSaving(true);
    setError(null);

    const { error: rpcErr } = await supabase.rpc('delete_admin_user', {
      user_id: deletingAdmin.user_id,
    });

    if (rpcErr) {
      setError(rpcErr.message);
    } else {
      setSuccess(`Usuario ${deletingAdmin.email} eliminado del sistema.`);
      setDeletingAdmin(null);
      await loadAdmins();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipo y Roles de Acceso</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión manual de correos, contraseñas y permisos del personal administrativo
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => {
              setError(null);
              setSuccess(null);
              setShowCreateModal(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs sm:text-sm shadow-sm shrink-0"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>+ Crear Nuevo Usuario</span>
          </button>
        )}
      </div>

      {/* Alertas informativas */}
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <p className="text-xs text-rose-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800 font-medium flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Guía de Roles y Permisos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
              1. Rol Administrador
            </span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Tiene autorización para: cambiar planes de internet, editar y registrar clientes,
            importar listas de Excel/CSV, registrar pagos y validar comprobantes. No puede gestionar usuarios.
          </p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
              2. Rol Operador de Pagos / Caja
            </span>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Exclusivo para cobranza: solo puede registrar pagos manuales en caja (punto/efectivo) y
            validar pagos reportados. <strong>No puede</strong> editar clientes, ni planes, ni configuración.
          </p>
        </div>
      </div>

      {/* Tabla de Usuarios Registrados */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Personal con Acceso Autorizado ({admins.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Solo el Superadministrador puede modificar contraseñas o remover accesos
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {admins.map((adm) => {
            const isMe = adm.email.toLowerCase() === currentEmail.toLowerCase();
            const isSuper = adm.role === 'super_admin';
            const isOperator = adm.role === 'operador';

            return (
              <div
                key={adm.user_id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${
                      isSuper
                        ? 'bg-amber-500 text-white shadow-sm'
                        : isOperator
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {isSuper ? <Crown className="w-5 h-5" /> : isOperator ? <CreditCard className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {adm.name || adm.email}
                      </p>
                      {isMe && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          Tú
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{adm.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${
                          isSuper
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : isOperator
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-blue-50 text-blue-900 border-blue-200'
                        }`}
                      >
                        {isSuper
                          ? '👑 Superadministrador'
                          : isOperator
                          ? '💳 Operador de Caja (Solo Pagos)'
                          : '🛡️ Administrador (Planes y Clientes)'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(adm.created_at).toLocaleDateString('es-VE')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones de Superadministrador */}
                {isSuperAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    {/* Botón Cambiar Contraseña */}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        setChangingPassAdmin(adm);
                        setNewPassword('');
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-amber-400 text-slate-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-amber-50/50 transition-colors"
                      title="Cambiar contraseña de este usuario"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Clave</span>
                    </button>

                    {/* Botón Editar Datos */}
                    {!isSuper && (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setSuccess(null);
                          setEditingAdmin(adm);
                          setEditForm({
                            name: adm.name || '',
                            email: adm.email,
                            role: adm.role,
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-400 text-slate-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-blue-50/50 transition-colors"
                        title="Modificar correo o rol"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Editar</span>
                      </button>
                    )}

                    {/* Botón Eliminar */}
                    {!isSuper && (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setDeletingAdmin(adm);
                        }}
                        className="p-1.5 rounded-xl border border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Crear Nuevo Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setShowCreateModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Crear Nuevo Usuario</h3>
                  <p className="text-xs text-slate-500">Ingreso manual de credenciales</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ej: Carmen Álvarez"
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="cajero@rtst.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Contraseña Inicial</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Asigna una clave segura"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Tipo de Acceso / Rol</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'admin' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      createForm.role === 'admin'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Administrador General</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Puede modificar planes, crear/editar clientes, importar de Excel y validar pagos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'operador' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      createForm.role === 'operador'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Operador de Pagos / Caja (Solo Cobranza)</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Solo puede registrar pagos manuales en caja y validar pagos. Sin permisos para cambiar planes ni clientes.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-3 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  <span>Crear Usuario</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setEditingAdmin(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Editar Usuario</h3>
              <button onClick={() => setEditingAdmin(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Rol de Acceso</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as AdminRole })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="admin">Administrador (Gestión total de planes y clientes)</option>
                  <option value="operador">Operador de Pagos / Caja (Solo registrar y validar)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-3 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={saving}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Contraseña */}
      {changingPassAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setChangingPassAdmin(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cambiar Contraseña</h3>
                <p className="text-xs text-slate-500">{changingPassAdmin.email}</p>
              </div>
            </div>

            <div className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nueva Contraseña para este usuario
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Escribe la nueva contraseña"
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  El usuario podrá ingresar de inmediato con esta nueva clave.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangingPassAdmin(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-3 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={saving || !newPassword}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Actualizar Contraseña</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminar Usuario */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setDeletingAdmin(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-scale-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">¿Remover Acceso?</h3>
            <p className="text-xs text-slate-600 mt-1">
              ¿Estás seguro de que deseas eliminar a <strong>{deletingAdmin.name || deletingAdmin.email}</strong> ({deletingAdmin.email})?
            </p>
            <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-100 mt-3">
              Esta persona perderá inmediatamente el acceso a la plataforma.
            </p>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
