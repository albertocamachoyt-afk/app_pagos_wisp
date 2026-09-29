import { useState } from 'react';
import { Search, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, type Client, type Settings } from '@/lib/supabase';
import { formatCedula, parseCedula } from '@/lib/format';

type Props = {
  onFound: (client: Client, settings: Settings) => void;
};

export default function ClientLookup({ onFound }: Props) {
  const [cedulaInput, setCedulaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const cedula = parseCedula(cedulaInput);
    if (cedula.length < 4) {
      setError('Ingresa tu número de cédula completo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [{ data: client, error: clientError }, { data: settings, error: settingsError }] =
        await Promise.all([
          supabase.from('clients').select('*, plan:plans(*), sector:sectors(*)').eq('cedula', cedula).maybeSingle(),
          supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
        ]);

      if (clientError || settingsError) throw new Error('Error de conexión');
      if (!client) {
        setError('Cédula no encontrada. Verifica el número o contacta a administración.');
        return;
      }
      if (!settings) throw new Error('No se pudo cargar la configuración');

      onFound(client, settings);
    } catch {
      setError('No se pudo consultar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleSearch();
  };

  return (
    <div className="flex-1 max-w-md w-full mx-auto px-4 py-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-4 animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <Search className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Consulta tu Estado de Cuenta</h2>
          <p className="text-sm text-slate-500 mt-1">
            Ingresa tu número de cédula para ver tu estado de servicio y reportar pagos.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Número de Cédula
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={cedulaInput}
            onChange={(e) => {
              const digits = parseCedula(e.target.value);
              setCedulaInput(formatCedula(digits));
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ej. 12.345.678"
            className="w-full px-4 py-3 text-base bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-mono text-slate-800"
          />
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-[#EAB308] hover:bg-[#CA8A04] active:bg-[#A16207] disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Buscando...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Buscar mi Cuenta</span>
            </>
          )}
        </button>
      </div>

      <div className="text-center px-4">
        <p className="text-[11px] text-slate-500">
          Si no conoces tu número de cédula registrado, contacta a administración de RTST.
        </p>
      </div>
    </div>
  );
}
