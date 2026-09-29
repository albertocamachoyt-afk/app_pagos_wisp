import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  Phone,
  MessageSquare,
  Filter,
  Loader2,
  Bell,
  Volume2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Wifi,
  Trash2,
} from 'lucide-react';
import { supabase, type FailureReport } from '@/lib/supabase';
import { formatCedula, formatDate } from '@/lib/format';
import { playAlertChime, requestPushPermission } from '@/lib/notifications';

type StatusFilter = 'todos' | 'pendiente' | 'en_revision' | 'resuelto';

export default function AdminFailures() {
  const [reports, setReports] = useState<FailureReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<FailureReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pushState, setPushState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('failure_reports')
      .select('*')
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  const handleStatusChange = async (reportId: string, newStatus: 'pendiente' | 'en_revision' | 'resuelto') => {
    setSavingAction(true);
    const { error } = await supabase
      .from('failure_reports')
      .update({
        status: newStatus,
        admin_notes: adminNotes || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (!error) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: newStatus, admin_notes: adminNotes || r.admin_notes, updated_at: new Date().toISOString() }
            : r
        )
      );
      if (selectedReport?.id === reportId) {
        setSelectedReport((prev) =>
          prev ? { ...prev, status: newStatus, admin_notes: adminNotes || prev.admin_notes } : null
        );
      }
    }
    setSavingAction(false);
  };

  const handleDeleteReport = async (reportId: string) => {
    setSavingAction(true);
    try {
      await supabase.from('failure_reports').delete().eq('id', reportId);
    } catch (err) {
      console.error('Error removing report from database:', err);
    }
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    if (selectedReport?.id === reportId) {
      setSelectedReport(null);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('failure-report-deleted', { detail: { id: reportId } }));
    }
    setConfirmDeleteId(null);
    setSavingAction(false);
  };

  const handleEnablePush = async () => {
    const permission = await requestPushPermission();
    setPushState(permission);
    if (permission === 'granted') {
      playAlertChime();
      try {
        new Notification('🔔 Notificaciones Push Activas', {
          body: 'Recibirás alertas en tiempo real cada vez que un cliente reporte una avería.',
          icon: '/vite.svg',
        });
      } catch {
        // ignore
      }
    }
  };

  // Unique sectors for filtering
  const sectors = Array.from(new Set(reports.map((r) => r.sector_name).filter(Boolean))) as string[];

  // Filtered reports
  const filtered = reports.filter((r) => {
    if (statusFilter !== 'todos' && r.status !== statusFilter) return false;
    if (sectorFilter !== 'todos' && r.sector_name !== sectorFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.client_name?.toLowerCase().includes(q) ||
      r.client_cedula?.includes(q) ||
      r.client_phone?.includes(q) ||
      r.issue_type?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
  });

  const pendingCount = reports.filter((r) => r.status === 'pendiente').length;
  const inProgressCount = reports.filter((r) => r.status === 'en_revision').length;
  const resolvedCount = reports.filter((r) => r.status === 'resuelto').length;

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <span>Reportes de Fallas y Averías</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión y seguimiento de alertas técnicas enviadas por clientes desde el portal.
          </p>
        </div>

        {/* Notifications Bar */}
        <div className="flex items-center gap-2">
          {pushState !== 'granted' ? (
            <button
              onClick={handleEnablePush}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Bell className="w-3.5 h-3.5 text-amber-600" />
              <span>Activar Notificaciones Push</span>
            </button>
          ) : (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-emerald-600" />
              <span>Push Activo</span>
            </span>
          )}

          <button
            onClick={() => playAlertChime()}
            title="Probar sonido de alerta"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Probar Sonido</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('todos')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            statusFilter === 'todos'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-xs uppercase font-bold tracking-wider opacity-75">Total Averías</span>
          <p className="text-2xl font-black mt-1">{reports.length}</p>
        </div>

        <div
          onClick={() => setStatusFilter('pendiente')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            statusFilter === 'pendiente'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md'
              : 'bg-rose-50/70 border-rose-200 hover:border-rose-300 text-rose-900'
          }`}
        >
          <span className="text-xs uppercase font-bold tracking-wider opacity-85 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Pendientes
          </span>
          <p className="text-2xl font-black mt-1 text-rose-600 group-hover:text-rose-700">
            {pendingCount}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter('en_revision')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            statusFilter === 'en_revision'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-blue-50/70 border-blue-200 hover:border-blue-300 text-blue-900'
          }`}
        >
          <span className="text-xs uppercase font-bold tracking-wider opacity-85 flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5" />
            En Revisión
          </span>
          <p className="text-2xl font-black mt-1 text-blue-600">{inProgressCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter('resuelto')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            statusFilter === 'resuelto'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-300 text-emerald-900'
          }`}
        >
          <span className="text-xs uppercase font-bold tracking-wider opacity-85 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resueltos
          </span>
          <p className="text-2xl font-black mt-1 text-emerald-600">{resolvedCount}</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, cédula, teléfono, falla..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
          />
        </div>

        {/* Sector filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-800"
          >
            <option value="todos">Todos los sectores</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadReports}
          className="text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No se encontraron reportes</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'todos' || sectorFilter !== 'todos'
              ? 'Prueba modificando los filtros o la búsqueda actual.'
              : 'Actualmente no hay reportes de fallas registrados en la plataforma.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((report) => {
            const isSelected = selectedReport?.id === report.id;
            const cleanPhone = (report.client_phone || '').replace(/\D/g, '');
            const waNumber = cleanPhone.startsWith('58') ? cleanPhone : `58${cleanPhone.replace(/^0/, '')}`;
            const waMessage = encodeURI(
              `Hola ${report.client_name}, te saludamos de RTST Carora respecto a tu reporte de avería (${report.issue_type}).`
            );

            return (
              <div
                key={report.id}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                  report.status === 'pendiente'
                    ? 'border-rose-300 ring-1 ring-rose-200/50'
                    : report.status === 'en_revision'
                      ? 'border-blue-300'
                      : 'border-slate-200/80 opacity-90'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900">{report.client_name}</h4>
                        <span className="font-mono text-xs text-slate-400">
                          CI: {formatCedula(report.client_cedula)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                        {report.sector_name && (
                          <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {report.sector_name}
                          </span>
                        )}
                        {report.plan_name && (
                          <span className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                            <Wifi className="w-3 h-3 text-slate-400" />
                            {report.plan_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        report.status === 'pendiente'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                          : report.status === 'en_revision'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {report.status === 'pendiente'
                        ? 'Pendiente'
                        : report.status === 'en_revision'
                          ? 'En Revisión'
                          : 'Resuelto'}
                    </span>
                  </div>

                  {/* Issue Type Highlight */}
                  <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-3 mb-3">
                    <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{report.issue_type}</span>
                    </p>
                    {report.description && (
                      <p className="text-[11px] text-slate-700 mt-1.5 leading-relaxed bg-white/70 p-2 rounded-lg border border-rose-100">
                        {report.description}
                      </p>
                    )}
                  </div>

                  {/* Admin notes if any */}
                  {report.admin_notes && (
                    <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-2.5 mb-3 text-xs text-amber-900">
                      <span className="font-bold text-[10px] uppercase text-amber-700 block">
                        Nota técnica / Resolución:
                      </span>
                      <p className="text-[11px] mt-0.5">{report.admin_notes}</p>
                    </div>
                  )}

                  {/* Date & Contact Info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 py-1 border-t border-slate-100">
                    <span>Reportado: {formatDate(report.created_at)}</span>
                    {report.client_phone && (
                      <span className="font-mono font-medium text-slate-700">
                        Tel: {report.client_phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  {/* Top sub-row: Contact buttons & Note drawer toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {report.client_phone && (
                        <>
                          <a
                            href={`https://wa.me/${waNumber}?text=${waMessage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl transition-all shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                          <a
                            href={`tel:${report.client_phone}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 px-2.5 py-1.5 rounded-xl transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>Llamar</span>
                          </a>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(isSelected ? null : report);
                        setAdminNotes(report.admin_notes || '');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl transition-colors ml-auto"
                      title="Editar notas técnicas"
                    >
                      <span>Notas</span>
                      {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Bottom sub-row: Operational buttons (En Revisión, Resolver / Reabrir, and Eliminar) */}
                  <div className="flex items-center gap-2">
                    {report.status !== 'en_revision' && report.status !== 'resuelto' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(report.id, 'en_revision')}
                        disabled={savingAction}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50 truncate"
                      >
                        En Revisión
                      </button>
                    )}

                    {report.status !== 'resuelto' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(report.id, 'resuelto')}
                        disabled={savingAction}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50 truncate"
                      >
                        Resolver
                      </button>
                    )}

                    {report.status === 'resuelto' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(report.id, 'pendiente')}
                        disabled={savingAction}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold h-9 px-2.5 rounded-xl transition-colors disabled:opacity-50 truncate"
                      >
                        Reabrir Avería
                      </button>
                    )}

                    {/* Delete action with clean aligned confirmation */}
                    {confirmDeleteId === report.id ? (
                      <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 h-9 rounded-xl animate-fade-in shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={savingAction}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-2 py-1 rounded-lg transition-all"
                        >
                          ¿Borrar?
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-slate-500 hover:text-slate-800 text-xs px-1.5 py-1 rounded-lg"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(report.id)}
                        disabled={savingAction}
                        className="inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 text-xs font-bold h-9 px-3 rounded-xl transition-all shadow-xs shrink-0 disabled:opacity-50"
                        title="Eliminar este reporte de avería"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Accordion Note Edit */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-fade-in">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Observación del equipo técnico / Asignación:
                    </label>
                    <textarea
                      rows={2}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Ej. Técnico Carlos enviado al sector. Se cambió conector de fibra..."
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-800"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReport(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5"
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        disabled={savingAction}
                        onClick={() => handleStatusChange(report.id, report.status)}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                      >
                        Guardar Nota
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
