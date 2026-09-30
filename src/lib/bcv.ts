import { supabase } from './supabase';

export interface BcvRateResponse {
  rate: number;
  date: string;
  source: string;
}

/**
 * Consulta la tasa oficial del Banco Central de Venezuela desde múltiples fuentes confiables
 */
export async function fetchOfficialBcvRate(): Promise<BcvRateResponse | null> {
  // 1. Intento primario: DolarApi Venezuela (Oficial BCV)
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const rate = typeof data.promedio === 'number' ? data.promedio : parseFloat(data.promedio);
      if (rate && !isNaN(rate) && rate > 0) {
        return {
          rate: Number(rate.toFixed(4)),
          date: data.fechaActualizacion || new Date().toISOString(),
          source: 'Banco Central de Venezuela (vía DolarApi)',
        };
      }
    }
  } catch (e) {
    console.warn('Fallo intento 1 (DolarApi oficial):', e);
  }

  // 2. Intento secundario: Open Exchange Rates (BCV rate para VES)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const vesRate = data?.rates?.VES;
      if (vesRate && typeof vesRate === 'number' && vesRate > 0) {
        return {
          rate: Number(vesRate.toFixed(4)),
          date: data.time_last_update_utc || new Date().toISOString(),
          source: 'Tasa Oficial VES (vía Open Exchange)',
        };
      }
    }
  } catch (e) {
    console.warn('Fallo intento 2 (Open Exchange):', e);
  }

  // 3. Intento terciario: DolarApi lista completa
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const oficialItem = data.find((d: any) => d.fuente === 'oficial');
        if (oficialItem && oficialItem.promedio > 0) {
          return {
            rate: Number(oficialItem.promedio.toFixed(4)),
            date: oficialItem.fechaActualizacion || new Date().toISOString(),
            source: 'Banco Central de Venezuela (vía DolarApi Feed)',
          };
        }
      }
    }
  } catch (e) {
    console.warn('Fallo intento 3 (DolarApi Feed):', e);
  }

  return null;
}

/**
 * Comprueba si la tasa de la BD ya fue actualizada hoy después de las 12:00 del mediodía
 * y la actualiza automáticamente si es necesario.
 */
export async function checkAndAutoSyncBcv(currentRate?: number, lastUpdatedAt?: string): Promise<{
  updated: boolean;
  rate?: number;
  message?: string;
}> {
  try {
    const now = new Date();
    // Hora en Venezuela (UTC-4)
    const venezuelaTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Caracas' });
    const vzNow = new Date(venezuelaTimeStr);
    const vzHour = vzNow.getHours(); // 0 a 23

    // Si aún no son las 12:00 del mediodía en Venezuela, no forzamos la sincronización de las 12:00 PM
    if (vzHour < 12) {
      return { updated: false, message: 'Aún no son las 12:00 PM (hora de Venezuela)' };
    }

    // Verificar cuándo se actualizó por última vez
    if (lastUpdatedAt) {
      const lastUpdateVz = new Date(
        new Date(lastUpdatedAt).toLocaleString('en-US', { timeZone: 'America/Caracas' })
      );

      const isSameDay =
        lastUpdateVz.getFullYear() === vzNow.getFullYear() &&
        lastUpdateVz.getMonth() === vzNow.getMonth() &&
        lastUpdateVz.getDate() === vzNow.getDate();

      // Si ya se actualizó hoy a las 12:00 PM o después, no hace falta volver a llamar
      if (isSameDay && lastUpdateVz.getHours() >= 12) {
        return { updated: false, message: 'La tasa ya fue actualizada hoy después de las 12:00 PM' };
      }
    }

    // Si son las 12:00 PM o más y no está actualizada hoy a las 12:00 PM, consultamos la API oficial
    const official = await fetchOfficialBcvRate();
    if (!official) {
      return { updated: false, message: 'No se pudo obtener la tasa del BCV en este momento' };
    }

    // Actualizar en base de datos
    const { error } = await supabase
      .from('settings')
      .update({
        bcv_rate: official.rate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) throw error;

    return {
      updated: true,
      rate: official.rate,
      message: `Tasa BCV actualizada automáticamente a Bs. ${official.rate.toFixed(2)}`,
    };
  } catch (err: any) {
    return { updated: false, message: err?.message || 'Error al auto-sincronizar' };
  }
}
