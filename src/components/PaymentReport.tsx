import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  X,
  Loader2,
  Smartphone,
  Info,
  CheckCheck,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { supabase, type Client, type Settings, type Payment } from '@/lib/supabase';
import ClientReportFailureModal from '@/components/ClientReportFailureModal';
import {
  formatCedula,
  formatUSD,
  formatBs,
  formatDate,
  statusColor,
  statusLabel,
} from '@/lib/format';

type Props = {
  client: Client;
  settings: Settings;
  onBack: () => void;
};

export default function PaymentReport({ client, settings, onBack }: Props) {
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const amountBs = Number((client.monthly_amount * settings.bcv_rate).toFixed(2));

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', client.id)
      .order('submitted_at', { ascending: false })
      .limit(10);
    setHistory(data || []);
    setHistoryLoaded(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) {
      setError('La imagen no debe pesar más de 5MB');
      return;
    }
    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!file && !reference) {
      setError('Sube un comprobante o ingresa un número de referencia');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let receiptUrl: string | null = null;

      if (file) {
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `receipt_${client.cedula}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file, { contentType: file.type });
        if (uploadError) throw new Error('No se pudo subir el comprobante');
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
        receiptUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('payments').insert({
        client_id: client.id,
        amount_usd: client.monthly_amount,
        amount_bs: amountBs,
        reference_number: reference || null,
        receipt_url: receiptUrl,
        bcv_rate: settings.bcv_rate,
        status: 'pendiente',
        payment_method: 'online',
      });

      if (insertError) throw new Error('No se pudo registrar el pago');
      setSuccess(true);
      loadHistory();
    } catch {
      setError('No se pudo enviar el reporte. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 max-w-md w-full mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCheck className="w-10 h-10 text-emerald-600" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">¡Pago Reportado!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Tu comprobante fue enviado correctamente. La administración de RTST validará tu pago
            en breve. Recibirás confirmación pronto.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-6">
            <p className="text-xs text-emerald-700 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Estado: <strong>En revisión</strong>
            </p>
          </div>
          <button
            onClick={onBack}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all text-sm"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-md w-full mx-auto px-4 py-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-4 animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFailureModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-full transition-all active:scale-95 shadow-xs"
              title="Reportar avería o caída de servicio"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Reportar Falla</span>
            </button>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Cédula Verificada
            </span>
          </div>
        </div>

        {/* Client info */}
        <div className="mb-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-slate-900 leading-snug">Estado de Cuenta</h2>
            <span className="text-xs text-slate-400 font-mono">
              CI: {formatCedula(client.cedula)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Abonado: <strong className="text-slate-800 font-semibold">{client.full_name}</strong> ·{' '}
            {client.plan?.name || client.plan_name}
            {client.sector && <> · {client.sector.name}</>}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusColor(client.status)}`}
            >
              {statusLabel(client.status)}
            </span>
            {client.balance > 0 && (
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Deuda: {formatUSD(client.balance)}
              </span>
            )}
          </div>
        </div>

        {/* Amount box */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
              Monto a Pagar
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                {formatUSD(client.monthly_amount)}
              </span>
              <span className="text-xs font-semibold text-slate-500">USD</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-800">{formatBs(amountBs)}</span>
              <span className="text-[11px] text-slate-500">
                (Tasa BCV: {settings.bcv_rate.toFixed(2)} Bs./$ · bcv.org.ve)
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500">
              Vence: <span className="font-medium text-slate-700">día {client.due_day}</span>
            </p>
          </div>
        </div>

        {/* Bank info */}
        <div className="mb-5 bg-blue-50/60 rounded-xl p-3 border border-blue-100">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              Datos Pago Móvil RTST
            </div>
            <span className="text-[10px] text-blue-600 font-medium">
              {settings.bank_name} ({settings.bank_code})
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-tight mb-1">
            RIF: <span className="font-mono font-semibold text-slate-800">{settings.bank_rif}</span>{' '}
            · Tel:{' '}
            <span className="font-mono font-semibold text-slate-800">{settings.bank_phone}</span>
          </p>
          <p className="text-[11px] text-blue-900 font-medium">
            Monto a transferir:{' '}
            <span className="font-bold font-mono text-xs text-blue-950">{formatBs(amountBs)}</span>
          </p>
        </div>

        {/* File upload */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Sube el comprobante o captura del pago:
          </label>
          {!previewUrl ? (
            <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-amber-50/30 transition-all text-center group">
              <input
                ref={fileInputRef}
                accept="image/*"
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <p className="text-xs font-semibold text-slate-700 mb-0.5">
                Toca para seleccionar o tomar foto
              </p>
              <p className="text-[11px] text-slate-400">
                Captura de pantalla de Pago Móvil o transferencia (PNG, JPG)
              </p>
            </label>
          ) : (
            <div className="mt-3 space-y-2 animate-fade-in">
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img src={previewUrl} alt="Comprobante" className="w-full max-h-64 object-cover" />
                <button
                  onClick={removeFile}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {file?.type.includes('png') ? 'PNG' : 'JPG'}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">{file?.name}</p>
                  <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Archivo listo para validación
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reference */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Número de Referencia (últimos 4 u 8 dígitos):
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={reference}
            onChange={(e) => setReference(e.target.value.replace(/\D/g, ''))}
            placeholder="Ej. 849201"
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono text-slate-800"
          />
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 animate-fade-in">
            <Info className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#EAB308] hover:bg-[#CA8A04] active:bg-[#A16207] disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Reportar Pago Realizado</span>
            </>
          )}
        </button>
      </div>

      {/* Info message */}
      <div className="text-center px-4 mb-6">
        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          El comprobante será validado por la administración de RTST.
        </p>
      </div>

      {/* Payment history */}
      {history.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 animate-fade-in">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Historial de Pagos Recientes</h3>
          <div className="space-y-2">
            {history.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  {p.status === 'aprobado' && (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  {p.status === 'pendiente' && (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  {p.status === 'rechazado' && (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {formatUSD(p.amount_usd)} · {formatBs(p.amount_bs)}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatDate(p.submitted_at)}</p>
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
        </div>
      )}

      {showFailureModal && (
        <ClientReportFailureModal
          client={client}
          onClose={() => setShowFailureModal(false)}
        />
      )}
    </div>
  );
}
