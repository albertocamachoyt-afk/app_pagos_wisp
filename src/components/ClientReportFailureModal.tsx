import { useState } from 'react';
import {
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Phone,
  WifiOff,
  Radio,
  Zap,
  Activity,
  HelpCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { supabase, type Client } from '@/lib/supabase';
import { formatCedula } from '@/lib/format';
import { emitFailureAlert } from '@/lib/notifications';

type Props = {
  client: Client;
  onClose: () => void;
};

const ISSUE_OPTIONS = [
  {
    id: 'sin_internet',
    label: 'Sin señal de Internet (Totalmente caído)',
    desc: 'No navega ningún dispositivo conectado por cable o WiFi',
    icon: WifiOff,
    color: 'text-rose-500 bg-rose-50 border-rose-200',
  },
  {
    id: 'luz_roja_los',
    label: 'Luz roja en router / módem (LOS / Alarm)',
    desc: 'El indicador LOS o Alarm en la ONT está en rojo o parpadeando',
    icon: Radio,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    id: 'lento_intermitente',
    label: 'Internet lento o intermitente',
    desc: 'Se cae y vuelve constantemente o la velocidad es muy baja',
    icon: Activity,
    color: 'text-amber-500 bg-amber-50 border-amber-200',
  },
  {
    id: 'cable_daniado',
    label: 'Cable de fibra roto o conector suelto',
    desc: 'Cable cortado en la calle o conector dañado en la vivienda',
    icon: Zap,
    color: 'text-purple-500 bg-purple-50 border-purple-200',
  },
  {
    id: 'otro',
    label: 'Otro problema técnico',
    desc: 'Falla con router WiFi, cambio de contraseña u otro detalle',
    icon: HelpCircle,
    color: 'text-slate-500 bg-slate-50 border-slate-200',
  },
];

export default function ClientReportFailureModal({ client, onClose }: Props) {
  const [selectedIssue, setSelectedIssue] = useState(ISSUE_OPTIONS[0].label);
  const [phone, setPhone] = useState(client.phone || '');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Por favor indica un número de teléfono de contacto para que el técnico pueda comunicarse.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const generatedId = `FAIL-${Date.now().toString().slice(-6)}`;
      const newReportData = {
        id: generatedId,
        client_id: client.id,
        client_name: client.full_name,
        client_cedula: client.cedula,
        client_phone: phone.trim(),
        sector_name: client.sector?.name || 'Sector no especificado',
        plan_name: client.plan?.name || client.plan_name || 'Plan de Internet',
        issue_type: selectedIssue,
        description: description.trim() || 'El cliente reportó falla en el servicio sin observaciones adicionales.',
        status: 'pendiente' as const,
        admin_notes: null,
      };

      const { error: insertError } = await supabase
        .from('failure_reports')
        .insert(newReportData);

      if (insertError) {
        throw insertError;
      }

      setReportId(generatedId);

      // Trigger realtime notification and alert sound for administrative panel
      emitFailureAlert({
        id: generatedId,
        ...newReportData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        client,
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar la falla. Intente de nuevo o comuníquese por WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reportar Falla Técnica</h3>
              <p className="text-xs text-slate-500">Notificación prioritaria al panel de soporte RTST</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          /* Success confirmation screen */
          <div className="p-6 text-center space-y-4 overflow-y-auto animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900">¡Falla Reportada con Éxito!</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                Se ha generado una <strong>alerta prioritaria</strong> en el panel administrativo de RTST Carora.
                El equipo técnico ha sido notificado para atender tu avería.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Ticket #:</span>
                <span className="font-mono font-bold text-slate-800">{reportId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Abonado:</span>
                <span className="font-semibold text-slate-800">{client.full_name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Cédula:</span>
                <span className="font-mono font-semibold text-slate-800">{formatCedula(client.cedula)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Sector:</span>
                <span className="font-medium text-slate-800">{client.sector?.name || 'Carora'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Tipo de falla:</span>
                <span className="font-medium text-rose-700">{selectedIssue}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Estado:</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Clock className="w-3 h-3" />
                  Pendiente por revisión
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all text-sm shadow-md"
            >
              Entendido, volver a mi cuenta
            </button>
          </div>
        ) : (
          /* Failure Report Form */
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
            {/* Client mini banner */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3.5 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-amber-900">
                  {client.full_name} · CI: {formatCedula(client.cedula)}
                </p>
                <p className="text-amber-700 text-[11px] mt-0.5">
                  Plan: {client.plan?.name || client.plan_name} · Sector: {client.sector?.name || 'No especificado'}
                </p>
              </div>
            </div>

            {/* Issue selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                ¿Qué tipo de problema estás experimentando?
              </label>
              <div className="space-y-2">
                {ISSUE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedIssue === opt.label;
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="issue_type"
                        className="mt-1 text-amber-500 focus:ring-amber-500 shrink-0"
                        checked={isSelected}
                        onChange={() => setSelectedIssue(opt.label)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                          <Icon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>{opt.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Phone number */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Teléfono de contacto / WhatsApp para el técnico
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 0414-1234567"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                El soporte técnico se comunicará a este número para confirmar o coordinar visita técnica.
              </p>
            </div>

            {/* Problem details */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Detalles adicionales (opcional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Empezó hoy a las 10:00 AM, la luz LOS parpadea en rojo y el WiFi no da acceso a internet..."
                className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando reporte...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Enviar Alerta de Falla</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
