export function formatCedula(cedula: string): string {
  const digits = cedula.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseCedula(input: string): string {
  return input.replace(/\D/g, '');
}

export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatBs(amount: number): string {
  return `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function statusColor(status: string): string {
  switch (status) {
    case 'pendiente':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'aprobado':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rechazado':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'activo':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'suspendido':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'cortado':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    activo: 'Activo',
    suspendido: 'Suspendido',
    cortado: 'Cortado',
  };
  return labels[status] || status;
}
