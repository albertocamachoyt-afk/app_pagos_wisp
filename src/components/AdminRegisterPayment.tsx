import { useState } from 'react';
import {
  X,
  Search,
  CreditCard,
  Banknote,
  Loader2,
  CheckCircle,
  Zap,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { supabase, type Client, type Settings } from '@/lib/supabase';
import { formatCedula, parseCedula, formatUSD, formatBs } from '@/lib/format';

type Props = {
  settings: Settings;
  onClose: () => void;
  onRegistered: () => void;
};

type Method = 'pos' | 'cash';

export default function AdminRegisterPayment({ settings, onClose, onRegistered }: Props) {
  const [method, setMethod] = useState<Method>('pos');
  const [search, setSearch] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // POS fields
  const [terminalId, setTerminalId] = useState('Terminal #1 - Banesco POS');
  const [cardType, setCardType] = useState('Tarjeta Débito Maestro / Visa Débito');
  const [posRef, setPosRef] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [cardLast4, setCardLast4] = useState('');

  // Cash fields
  const [currency, setCurrency] = useState<'USD' | 'BS'>('USD');
  const [cashReceived, setCashReceived] = useState('');

  // Shared
  const [receiptNumber, setReceiptNumber] = useState('');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [reactivateService, setReactivateService] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountUsd = client ? Number(client.monthly_amount) : 0;
  const amountBs = Number((amountUsd * settings.bcv_rate).toFixed(2));

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setSearchError(null);
    setClient(null);

    const digits = parseCedula(search);
    const { data, error } = await supabase
      .from('clients')
      .select('*, plan:plans(*), sector:sectors(*)')
      .or(`cedula.eq.${digits},full_name.ilike.%${search}%`)
      .limit(1)
      .maybeSingle();

    setSearching(false);
    if (error) { setSearchError('Error en la busqueda'); return; }
    if (!data) { setSearchError('Abonado no encontrado'); return; }
    setClient(data as Client);
  };

  const handleConfirm = async () => {
    if (!client) { setError('Selecciona un abonado primero'); return; }
    setSaving(true);
    setError(null);

    const receiptN = receiptNumber || `#MAN-${Date.now().toString().slice(-6)}`;

    const paymentData: any = {
      client_id: client.id,
      amount_usd: amountUsd,
      amount_bs: amountBs,
      bcv_rate: settings.bcv_rate,
      status: 'aprobado',
      payment_method: method,
      receipt_number: receiptN,
      operator_name: operatorNotes || null,
      submitted_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    };

    if (method === 'pos') {
      paymentData.terminal_id = terminalId || null;
      paymentData.card_type = cardType || null;
      paymentData.reference_number = posRef || null;
      paymentData.batch_number = batchNumber || null;
      paymentData.card_last4 = cardLast4 || null;
    } else {
      paymentData.currency_received = currency;
      paymentData.reference_number = receiptN;
    }

    try {
      const { error: insertError } = await supabase.from('payments').insert(paymentData);
      if (insertError) throw insertError;

      if (reactivateService) {
        await supabase
          .from('clients')
          .update({ balance: 0, status: 'activo' })
          .eq('id', client.id);
      }

      await supabase.from('payment_audit').insert({
        payment_id: (await supabase.from('payments').select('id').eq('client_id', client.id).order('created_at', { ascending: false }).limit(1).single()).data?.id || '',
        action: 'registro_manual',
        notes: `Cobro ${method === 'pos' ? 'POS' : 'efectivo'} en taquilla. Recibo: ${receiptN}`,
      });

      onRegistered();
    } catch {
      setError('No se pudo registrar el cobro. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in max-h-[92vh]">
        {/* Header */}
        <header className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-200 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold tracking-tight">Registrar Cobro en Taquilla / Presencial</h2>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  method === 'pos'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${method === 'pos' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {method === 'pos' ? 'Taquilla POS · Debito / Biopago' : 'Taquilla Caja · Efectivo'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">Recepcion de pagos presenciales en oficina RTST Carora</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
          {/* Method tabs */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 border border-slate-300/80">
            <button
              onClick={() => setMethod('pos')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                method === 'pos'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Punto de Venta (POS / Biopago)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded font-bold">
                Bs. {amountBs.toFixed(2)}
              </span>
            </button>
            <button
              onClick={() => setMethod('cash')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                method === 'cash'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-4 h-4 text-amber-600" />
              <span>Efectivo (USD / Bs.)</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded font-bold">
                {formatUSD(amountUsd)}
              </span>
            </button>
          </div>

          {/* BCV rate banner */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Tasa BCV sincronizada
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    Tasa oficial: {settings.bcv_rate.toFixed(2)} Bs./USD
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Fuente: Banco Central de Venezuela · Calculos en Bs. actualizados al cobro</p>
              </div>
            </div>
            <a
              href="https://www.bcv.org.ve"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100/70 border border-blue-200 transition-colors bg-white"
            >
              <ExternalLink className="w-3 h-3" />
              Verificar BCV
            </a>
          </div>

          {/* Section 1: Client search */}
          <section className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              1. Busqueda y Seleccion del Abonado
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !searching && handleSearch()}
                placeholder="Buscar por Cedula o Nombre..."
                className="block w-full pl-9 pr-24 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="absolute inset-y-0 right-1.5 flex items-center"
              >
                <span className="text-[10px] bg-slate-900 text-white px-2.5 py-1 rounded font-medium">
                  {searching ? 'Buscando...' : 'Buscar'}
                </span>
              </button>
            </div>
            {searchError && (
              <p className="text-[11px] text-rose-600 font-medium">{searchError}</p>
            )}
            {client && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    {client.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-extrabold text-slate-900">{client.full_name}</h4>
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
                        {formatCedula(client.cedula)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-slate-600">
                      <span className="font-medium">{client.plan?.name || client.plan_name}</span>
                      {client.sector && <><span className="text-slate-300">·</span><span>{client.sector.name}</span></>}
                    </div>
                  </div>
                </div>
                <div className="sm:text-right bg-white sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-lg border sm:border-0 border-slate-200 w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
                  <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mb-0.5">
                    Saldo Pendiente
                  </span>
                  <p className="text-xs font-black text-slate-900">
                    <span className="text-rose-600 font-mono font-black">{formatUSD(client.monthly_amount)}</span>
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Method-specific fields */}
          {client && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {method === 'pos' ? (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    2. Datos de la Transaccion POS
                  </label>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Terminal / Punto de Venta</label>
                    <select
                      value={terminalId}
                      onChange={(e) => setTerminalId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600"
                    >
                      <option>Terminal #1 - Banesco POS (Inalambrico)</option>
                      <option>Terminal #2 - BDV POS / Biopago</option>
                      <option>Terminal #3 - Mercantil POS</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Monto Facturado (Bs.)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-emerald-600 font-bold text-xs">Bs.</span>
                        <input
                          readOnly
                          value={amountBs.toFixed(2)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-slate-900 font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Monto liquidado al BCV vigente</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Equivalente USD</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">$</span>
                        <input
                          readOnly
                          value={`${amountUsd.toFixed(2)} USD`}
                          className="w-full pl-7 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Tarifa del plan contratado</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Tarjeta</label>
                      <select
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600"
                      >
                        <option>Tarjeta Debito Maestro / Visa Debito</option>
                        <option>Tarjeta de Credito Nacional</option>
                        <option>Biopago BDV (Huella)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">N° de Aprobacion POS</label>
                      <input
                        type="text"
                        value={posRef}
                        onChange={(e) => setPosRef(e.target.value)}
                        placeholder="ej. 6 digitos"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Numero de Lote (Batch)</label>
                      <input
                        type="text"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        placeholder="ej. 000142"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Ultimos 4 Digitos Tarjeta</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                        placeholder="**** 0000"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-center gap-2.5 text-xs text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p>Monto cobrado a tasa oficial ({settings.bcv_rate.toFixed(2)} Bs./USD). El voucher fisico debe archivarse.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-amber-600" />
                    2. Detalles del Cobro en Efectivo
                  </label>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Moneda Recibida en Taquilla</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setCurrency('USD')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          currency === 'USD'
                            ? 'bg-white text-emerald-900 shadow-sm border-2 border-emerald-600'
                            : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${currency === 'USD' ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'}`} />
                        Dolares en Efectivo ($ USD)
                      </button>
                      <button
                        onClick={() => setCurrency('BS')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          currency === 'BS'
                            ? 'bg-white text-emerald-900 shadow-sm border-2 border-emerald-600'
                            : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${currency === 'BS' ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'}`} />
                        Bolivares en Efectivo (Bs.)
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Monto Recibido {currency === 'USD' ? '($ USD)' : '(Bs.)'}
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-emerald-600 font-bold text-xs">
                          {currency === 'USD' ? '$' : 'Bs.'}
                        </span>
                        <input
                          type="text"
                          value={cashReceived || (currency === 'USD' ? amountUsd.toFixed(2) : amountBs.toFixed(2))}
                          onChange={(e) => setCashReceived(e.target.value)}
                          className={`w-full ${currency === 'USD' ? 'pl-7' : 'pl-10'} pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-emerald-700 font-mono focus:ring-2 focus:ring-emerald-500`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Monto de la factura</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Equivalencia Contable</label>
                      <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800">
                        {currency === 'USD' ? formatBs(amountBs) : formatUSD(amountUsd)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Tasa BCV: {settings.bcv_rate.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Vuelto / Cambio</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">$</span>
                        <input
                          readOnly
                          value="0.00"
                          className="w-full pl-7 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Pago exacto</p>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 flex items-center justify-between gap-3 text-xs text-slate-800">
                    <span><strong>Equivalencia para arqueo:</strong> {formatBs(amountBs)} (Tasa BCV {settings.bcv_rate.toFixed(2)})</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Receipt & notes */}
          {client && (
            <section className="space-y-3 pt-2 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Comprobante de Taquilla
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">N° de Recibo / Correlativo</label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="Ej: POS-00123 (auto-generado si vacio)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nota u Observacion</label>
                  <input
                    type="text"
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    placeholder="Nota interna..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section 4: Automations */}
          {client && (
            <section className="p-4 bg-slate-100/90 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  4. Acciones de Automatizacion
                </span>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reactivateService}
                  onChange={(e) => setReactivateService(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">Reactivar / Mantener servicio activo</span>
                  <p className="text-[11px] text-slate-500">Desbloquear y remover al cliente de la lista de corte.</p>
                </div>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendWhatsapp}
                  onChange={(e) => setSendWhatsapp(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    Enviar recibo digital por WhatsApp
                    {client.phone && (
                      <span className="text-[10px] text-emerald-600 font-mono font-bold bg-emerald-50 px-1.5 rounded border border-emerald-200">
                        {client.phone}
                      </span>
                    )}
                  </span>
                  <p className="text-[11px] text-slate-500">Envio del comprobante con detalle del pago de taquilla.</p>
                </div>
              </label>
            </section>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-start">
            <CheckCircle className="w-4 h-4 text-slate-400" />
            <span>Operacion auditada · Sincronizada con el sistema</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || !client}
              className="w-1/2 sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>
                {saving
                  ? 'Procesando...'
                  : `Confirmar Cobro ${method === 'pos' ? `Bs. ${amountBs.toFixed(2)}` : formatUSD(amountUsd)}`}
              </span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
