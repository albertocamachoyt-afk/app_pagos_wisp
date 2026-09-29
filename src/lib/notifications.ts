import type { FailureReport } from './supabase';

type FailureAlertListener = (report: FailureReport) => void;
const listeners: FailureAlertListener[] = [];

// Audio chime using Web Audio API (safe, no external sound file dependency)
export function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    
    // First tone (high alert)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (harmonic chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.51, now + 0.12); // E6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.3); // A6
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch {
    // Audio context might be restricted before first user interaction
  }
}

// Request permission for native browser push notification
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

// Dispatch push notification + sound + in-app alert
export function emitFailureAlert(report: FailureReport) {
  // 1. Play chime
  playAlertChime();

  // 2. Browser push notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const title = `⚠️ Reporte de Falla: ${report.client_name}`;
      const options: NotificationOptions = {
        body: `${report.issue_type}\nSector: ${report.sector_name || 'Sin sector'} · CI: ${report.client_cedula}`,
        icon: '/vite.svg',
        tag: `failure-${report.id}`,
      };
      new Notification(title, options);
    } catch {
      // ignore
    }
  }

  // 3. Broadcast to all in-app listeners
  listeners.forEach((listener) => {
    try {
      listener(report);
    } catch {
      // ignore
    }
  });

  // 4. Save to cross-tab communication
  try {
    localStorage.setItem(
      'rtst_last_failure_alert',
      JSON.stringify({ ...report, _ts: Date.now() })
    );
  } catch {
    // ignore
  }
}

// Subscribe to in-app failure alerts
export function onFailureAlert(listener: FailureAlertListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

// Setup cross-tab / cross-window listening
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'rtst_last_failure_alert' && e.newValue) {
      try {
        const report = JSON.parse(e.newValue) as FailureReport;
        playAlertChime();
        listeners.forEach((l) => l(report));
      } catch {
        // ignore
      }
    }
  });

  window.addEventListener('new-failure-report', (e: Event) => {
    const report = (e as CustomEvent).detail as FailureReport;
    if (report) {
      emitFailureAlert(report);
    }
  });
}
