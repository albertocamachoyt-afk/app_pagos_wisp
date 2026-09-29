import { createClient } from '@supabase/supabase-js';

export type Plan = {
  id: string;
  name: string;
  speed_mbps: number;
  price_usd: number;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Sector = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  cedula: string;
  full_name: string;
  plan_name: string;
  plan_id: string | null;
  sector_id: string | null;
  monthly_amount: number;
  status: string;
  due_day: number;
  phone: string | null;
  address: string | null;
  notes: string | null;
  balance: number;
  created_at: string;
  updated_at: string;
  plan?: Plan;
  sector?: Sector;
};

export type Payment = {
  id: string;
  client_id: string;
  amount_usd: number;
  amount_bs: number;
  reference_number: string | null;
  receipt_url: string | null;
  bcv_rate: number;
  status: string;
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  payment_method: string;
  terminal_id: string | null;
  batch_number: string | null;
  card_last4: string | null;
  card_type: string | null;
  receipt_number: string | null;
  currency_received: string | null;
  operator_name: string | null;
  client?: Client;
};

export type Settings = {
  id: number;
  bcv_rate: number;
  bank_name: string;
  bank_code: string;
  bank_rif: string;
  bank_phone: string;
  company_name: string;
  company_location: string;
  due_day: number;
  updated_at: string;
};

export type PaymentAudit = {
  id: string;
  payment_id: string;
  action: string;
  notes: string | null;
  performed_by: string | null;
  performed_at: string;
};

export type FailureReport = {
  id: string;
  client_id: string;
  client_name: string;
  client_cedula: string;
  client_phone: string | null;
  sector_name: string | null;
  plan_name: string | null;
  issue_type: string;
  description: string;
  status: 'pendiente' | 'en_revision' | 'resuelto';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
};

export const PAYMENT_STATUS = {
  PENDIENTE: 'pendiente',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
} as const;

export const CLIENT_STATUS = {
  ACTIVO: 'activo',
  SUSPENDIDO: 'suspendido',
  CORTADO: 'cortado',
} as const;

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isRealConfigured = Boolean(
  rawSupabaseUrl &&
  rawSupabaseAnonKey &&
  !rawSupabaseUrl.includes('placeholder') &&
  rawSupabaseUrl.startsWith('http')
);

// -------------------------------------------------------------
// In-Memory / LocalStorage Mock Client when Supabase is unconfigured
// -------------------------------------------------------------
const STORAGE_PREFIX = 'rtst_mock_';

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch {
    // ignore
  }
}

// Seed default plans
const initialPlans: Plan[] = [
  { id: 'plan-1', name: 'Plan Básico 20M', speed_mbps: 20, price_usd: 15.00, description: 'Velocidad básica para navegación y redes sociales', active: true, created_at: '2026-09-07T00:00:00Z', updated_at: '2026-09-07T00:00:00Z' },
  { id: 'plan-2', name: 'Plan Fibra 50M', speed_mbps: 50, price_usd: 20.00, description: 'Velocidad intermedia para streaming HD', active: true, created_at: '2026-09-07T00:00:00Z', updated_at: '2026-09-07T00:00:00Z' },
  { id: 'plan-3', name: 'Plan Fibra 100M', speed_mbps: 100, price_usd: 25.00, description: 'Velocidad alta para streaming y trabajo remoto', active: true, created_at: '2026-09-07T00:00:00Z', updated_at: '2026-09-07T00:00:00Z' },
  { id: 'plan-4', name: 'Plan Fibra 200M', speed_mbps: 200, price_usd: 35.00, description: 'Velocidad premium para gaming y descargas pesadas', active: true, created_at: '2026-09-07T00:00:00Z', updated_at: '2026-09-07T00:00:00Z' },
];

// Seed default sectors
const initialSectors: Sector[] = [
  { id: 'sector-1', name: 'Carora Centro', description: 'Zona centro de Carora', active: true, created_at: '2026-09-07T00:00:00Z', updated_at: '2026-09-07T00:00:00Z' },
  { id: 'sector-2', name: 'Carora Norte', description: 'Zona norte de Carora', active: true, created_at: '2026-09-07T00:00:00Z', updated_at: '2026-09-07T00:00:00Z' },
  { id: 'sector-3', name: 'Carora Sur', description: 'Zona sur de Carora', active: true, created_at: '2026-09-07T00:00:00Z', updated_at: '2026-09-07T00:00:00Z' },
  { id: 'sector-4', name: 'Carora Este', description: 'Zona este de Carora', active: true, created_at: '2026-09-07T00:00:00Z', updated_at: '2026-09-07T00:00:00Z' },
  { id: 'sector-5', name: 'Carora Oeste', description: 'Zona oeste de Carora', active: true, created_at: '2026-09-07T00:00:00Z', updated_at: '2026-09-07T00:00:00Z' },
];

// Seed default settings
const initialSettings: Settings = {
  id: 1,
  bcv_rate: 36.42,
  bank_name: 'Banesco',
  bank_code: '0134',
  bank_rif: 'J-501234567',
  bank_phone: '0414-1234567',
  company_name: 'RTST Carora',
  company_location: 'Carora, Edo. Lara',
  due_day: 5,
  updated_at: '2026-09-28T00:00:00Z',
};

// Seed default clients (matching the demo cedulas 12345678, 23456789, 45678901)
const initialClients: Client[] = [
  {
    id: 'client-1',
    cedula: '12345678',
    full_name: 'Carlos Mendoza',
    plan_name: 'Plan Fibra 50M',
    plan_id: 'plan-2',
    sector_id: 'sector-1',
    monthly_amount: 20.00,
    status: 'activo',
    due_day: 5,
    phone: '0412-1234567',
    address: 'Av. Francisco de Miranda, Casa #42',
    notes: 'Cliente puntual',
    balance: 0.00,
    created_at: '2026-09-07T00:00:00Z',
    updated_at: '2026-09-07T00:00:00Z',
  },
  {
    id: 'client-2',
    cedula: '23456789',
    full_name: 'María Rodríguez',
    plan_name: 'Plan Fibra 100M',
    plan_id: 'plan-3',
    sector_id: 'sector-2',
    monthly_amount: 25.00,
    status: 'suspendido',
    due_day: 15,
    phone: '0414-9876543',
    address: 'Calle Comercio con Lara, Local 3',
    notes: 'Aviso de corte enviado',
    balance: 25.00,
    created_at: '2026-09-07T00:00:00Z',
    updated_at: '2026-09-07T00:00:00Z',
  },
  {
    id: 'client-3',
    cedula: '45678901',
    full_name: 'Pedro Pérez',
    plan_name: 'Plan Básico 20M',
    plan_id: 'plan-1',
    sector_id: 'sector-3',
    monthly_amount: 15.00,
    status: 'activo',
    due_day: 5,
    phone: '0424-5551234',
    address: 'Urb. Torrellas, Manzana C',
    notes: null,
    balance: 0.00,
    created_at: '2026-09-07T00:00:00Z',
    updated_at: '2026-09-07T00:00:00Z',
  },
];

const initialPayments: Payment[] = [
  {
    id: 'pay-1',
    client_id: 'client-1',
    amount_usd: 20.00,
    amount_bs: 728.40,
    reference_number: '98412431',
    receipt_url: null,
    bcv_rate: 36.42,
    status: 'aprobado',
    admin_notes: 'Pago verificado en banco',
    submitted_at: '2026-09-20T10:30:00Z',
    reviewed_at: '2026-09-20T11:00:00Z',
    reviewed_by: 'admin-super-1',
    created_at: '2026-09-20T10:30:00Z',
    payment_method: 'online',
    terminal_id: null,
    batch_number: null,
    card_last4: null,
    card_type: null,
    receipt_number: null,
    currency_received: null,
    operator_name: null,
  },
  {
    id: 'pay-2',
    client_id: 'client-2',
    amount_usd: 25.00,
    amount_bs: 910.50,
    reference_number: '74128956',
    receipt_url: null,
    bcv_rate: 36.42,
    status: 'pendiente',
    admin_notes: null,
    submitted_at: '2026-09-28T09:15:00Z',
    reviewed_at: null,
    reviewed_by: null,
    created_at: '2026-09-28T09:15:00Z',
    payment_method: 'online',
    terminal_id: null,
    batch_number: null,
    card_last4: null,
    card_type: null,
    receipt_number: null,
    currency_received: null,
    operator_name: null,
  },
];

interface AdminRecord {
  user_id: string;
  email: string;
  created_at: string;
  created_by: string | null;
  role: 'super_admin' | 'admin';
}

const initialAdmins: AdminRecord[] = [
  {
    user_id: 'admin-super-1',
    email: 'albertocamacho26@gmail.com',
    created_at: '2026-09-27T00:00:00Z',
    created_by: null,
    role: 'super_admin',
  },
  {
    user_id: 'admin-super-2',
    email: 'admin@rtst.com',
    created_at: '2026-09-27T00:00:00Z',
    created_by: null,
    role: 'super_admin',
  },
];

const initialFailureReports: FailureReport[] = [
  {
    id: 'fail-1',
    client_id: 'client-2',
    client_name: 'María Rodríguez',
    client_cedula: '23456789',
    client_phone: '0414-9876543',
    sector_name: 'Carora Norte',
    plan_name: 'Plan Fibra 100M',
    issue_type: 'Luz roja en el Router / Módem (LOS / Alarm)',
    description: 'La luz de LOS en la ONT parpadea en rojo desde esta mañana a las 8am. No hay señal de internet.',
    status: 'pendiente',
    admin_notes: null,
    created_at: '2026-09-28T14:10:00Z',
    updated_at: '2026-09-28T14:10:00Z',
  },
];

class MockDatabase {
  plans: Plan[] = getStored('plans', initialPlans);
  sectors: Sector[] = getStored('sectors', initialSectors);
  settings: Settings = getStored('settings', initialSettings);
  clients: Client[] = getStored('clients', initialClients);
  payments: Payment[] = getStored('payments', initialPayments);
  paymentAudit: PaymentAudit[] = getStored('payment_audit', []);
  admins: AdminRecord[] = getStored('admins', initialAdmins);
  failureReports: FailureReport[] = getStored('failure_reports', initialFailureReports);
  receiptUrls: Record<string, string> = getStored('receipt_urls', {});

  save(table: string) {
    switch (table) {
      case 'plans': setStored('plans', this.plans); break;
      case 'sectors': setStored('sectors', this.sectors); break;
      case 'settings': setStored('settings', this.settings); break;
      case 'clients': setStored('clients', this.clients); break;
      case 'payments': setStored('payments', this.payments); break;
      case 'payment_audit': setStored('payment_audit', this.paymentAudit); break;
      case 'admins': setStored('admins', this.admins); break;
      case 'failure_reports': setStored('failure_reports', this.failureReports); break;
      case 'receipt_urls': setStored('receipt_urls', this.receiptUrls); break;
    }
  }

  getTableData(tableName: string): any[] {
    switch (tableName) {
      case 'plans': return this.plans;
      case 'sectors': return this.sectors;
      case 'settings': return [this.settings];
      case 'clients': return this.clients;
      case 'payments': return this.payments;
      case 'payment_audit': return this.paymentAudit;
      case 'admins': return this.admins;
      case 'failure_reports': return this.failureReports;
      default: return [];
    }
  }
}

const mockDb = new MockDatabase();

// In-memory mock auth session
let mockSession: any = getStored('auth_session', null);
const authListeners: Array<(event: string, session: any) => void> = [];

function notifyAuthChange(event: string, session: any) {
  mockSession = session;
  setStored('auth_session', session);
  authListeners.forEach((fn) => {
    try { fn(event, session); } catch { /* ignore */ }
  });
}

function createQueryBuilder(tableName: string) {
  const filters: Array<(row: any) => boolean> = [];
  let sortField: string | null = null;
  let sortAscending = true;
  let limitCount: number | null = null;
  let isCountOnly = false;

  const builder: any = {
    select(columns?: string, options?: { count?: string; head?: boolean }) {
      if (options?.head && options?.count) {
        isCountOnly = true;
      }
      return builder;
    },
    eq(field: string, val: any) {
      filters.push((row) => String(row[field]) === String(val));
      return builder;
    },
    order(field: string, opts?: { ascending?: boolean }) {
      sortField = field;
      sortAscending = opts?.ascending ?? true;
      return builder;
    },
    limit(n: number) {
      limitCount = n;
      return builder;
    },
    async then(resolve: any, reject?: any) {
      try {
        const result = await builder.execute();
        return resolve(result);
      } catch (err) {
        if (reject) return reject(err);
        throw err;
      }
    },
    async execute() {
      let rows = [...mockDb.getTableData(tableName)];
      for (const fn of filters) {
        rows = rows.filter(fn);
      }

      const totalCount = rows.length;

      if (sortField) {
        const sf = sortField;
        rows.sort((a, b) => {
          const valA = a[sf];
          const valB = b[sf];
          if (valA === valB) return 0;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;
          if (sortAscending) {
            return valA > valB ? 1 : -1;
          } else {
            return valA < valB ? 1 : -1;
          }
        });
      }

      if (limitCount !== null) {
        rows = rows.slice(0, limitCount);
      }

      // Populate relations
      if (tableName === 'clients') {
        rows = rows.map((c) => ({
          ...c,
          plan: mockDb.plans.find((p) => p.id === c.plan_id) || undefined,
          sector: mockDb.sectors.find((s) => s.id === c.sector_id) || undefined,
        }));
      } else if (tableName === 'payments') {
        rows = rows.map((p) => {
          const cl = mockDb.clients.find((c) => c.id === p.client_id);
          return {
            ...p,
            client: cl ? {
              ...cl,
              plan: mockDb.plans.find((pl) => pl.id === cl.plan_id) || undefined,
              sector: mockDb.sectors.find((s) => s.id === cl.sector_id) || undefined,
            } : undefined,
          };
        });
      } else if (tableName === 'failure_reports') {
        rows = rows.map((f) => {
          const cl = mockDb.clients.find((c) => c.id === f.client_id);
          return {
            ...f,
            client: cl ? {
              ...cl,
              plan: mockDb.plans.find((pl) => pl.id === cl.plan_id) || undefined,
              sector: mockDb.sectors.find((s) => s.id === cl.sector_id) || undefined,
            } : undefined,
          };
        });
      }

      if (isCountOnly) {
        return { count: totalCount, data: null, error: null };
      }

      return { count: totalCount, data: rows, error: null };
    },
    async single() {
      const { data } = await builder.execute();
      const item = data && data.length > 0 ? data[0] : null;
      return { data: item, error: item ? null : new Error('No rows found') };
    },
    async maybeSingle() {
      const { data } = await builder.execute();
      const item = data && data.length > 0 ? data[0] : null;
      return { data: item, error: null };
    },
    insert(itemOrItems: any) {
      const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
      const inserted: any[] = [];

      for (const item of items) {
        const id = item.id || `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();
        const record = {
          ...item,
          id,
          created_at: item.created_at || now,
          updated_at: item.updated_at || now,
        };

        if (tableName === 'plans') {
          mockDb.plans.push(record as Plan);
          mockDb.save('plans');
        } else if (tableName === 'sectors') {
          mockDb.sectors.push(record as Sector);
          mockDb.save('sectors');
        } else if (tableName === 'clients') {
          mockDb.clients.push(record as Client);
          mockDb.save('clients');
        } else if (tableName === 'payments') {
          mockDb.payments.unshift(record as Payment);
          mockDb.save('payments');
        } else if (tableName === 'payment_audit') {
          mockDb.paymentAudit.unshift(record as PaymentAudit);
          mockDb.save('payment_audit');
        } else if (tableName === 'admins') {
          mockDb.admins.push(record as AdminRecord);
          mockDb.save('admins');
        } else if (tableName === 'failure_reports') {
          mockDb.failureReports.unshift(record as FailureReport);
          mockDb.save('failure_reports');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('new-failure-report', { detail: record }));
          }
        }

        inserted.push(record);
      }

      const resultData = Array.isArray(itemOrItems) ? inserted : inserted[0];
      const resultPayload = {
        data: resultData,
        error: null,
      };

      const selectBuilder = {
        then(onfulfilled?: any, onrejected?: any) {
          return Promise.resolve(resultPayload).then(onfulfilled, onrejected);
        },
        single() {
          return Promise.resolve({
            data: Array.isArray(resultData) ? resultData[0] : resultData,
            error: null,
          });
        },
        maybeSingle() {
          return Promise.resolve({
            data: Array.isArray(resultData) ? resultData[0] : resultData,
            error: null,
          });
        },
      };

      return {
        ...resultPayload,
        then(onfulfilled?: any, onrejected?: any) {
          return Promise.resolve(resultPayload).then(onfulfilled, onrejected);
        },
        select(_columns?: string) {
          return selectBuilder;
        },
      };
    },
    async update(updates: any) {
      const now = new Date().toISOString();
      const dataToApply = { ...updates, updated_at: now };

      if (tableName === 'settings') {
        mockDb.settings = { ...mockDb.settings, ...dataToApply };
        mockDb.save('settings');
        return { data: mockDb.settings, error: null };
      }

      const tableData = mockDb.getTableData(tableName);
      for (let i = 0; i < tableData.length; i++) {
        let matches = true;
        for (const fn of filters) {
          if (!fn(tableData[i])) {
            matches = false;
            break;
          }
        }
        if (matches) {
          tableData[i] = { ...tableData[i], ...dataToApply };
        }
      }
      mockDb.save(tableName);

      return { data: null, error: null };
    },
    delete() {
      const deleteBuilder: any = {
        eq(field: string, val: any) {
          filters.push((row) => String(row[field]) === String(val));
          return deleteBuilder;
        },
        async execute() {
          const toRemove = (row: any) => {
            if (filters.length === 0) return true;
            return filters.every((fn) => fn(row));
          };

          if (tableName === 'plans') {
            mockDb.plans = mockDb.plans.filter((row) => !toRemove(row));
            mockDb.save('plans');
          } else if (tableName === 'sectors') {
            mockDb.sectors = mockDb.sectors.filter((row) => !toRemove(row));
            mockDb.save('sectors');
          } else if (tableName === 'clients') {
            mockDb.clients = mockDb.clients.filter((row) => !toRemove(row));
            mockDb.save('clients');
          } else if (tableName === 'payments') {
            mockDb.payments = mockDb.payments.filter((row) => !toRemove(row));
            mockDb.save('payments');
          } else if (tableName === 'admins') {
            mockDb.admins = mockDb.admins.filter((row) => !toRemove(row));
            mockDb.save('admins');
          } else if (tableName === 'failure_reports') {
            mockDb.failureReports = mockDb.failureReports.filter((row) => !toRemove(row));
            mockDb.save('failure_reports');
          }
          return { data: null, error: null };
        },
        then(resolve: any, reject?: any) {
          return deleteBuilder.execute().then(resolve, reject);
        },
      };
      return deleteBuilder;
    },
  };

  return builder;
}

const mockSupabase = {
  auth: {
    async getSession() {
      return { data: { session: mockSession }, error: null };
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.push(callback);
      // Immediately call with current session
      setTimeout(() => callback(mockSession ? 'SIGNED_IN' : 'SIGNED_OUT', mockSession), 0);
      return {
        data: {
          subscription: {
            unsubscribe() {
              const idx = authListeners.indexOf(callback);
              if (idx !== -1) authListeners.splice(idx, 1);
            },
          },
        },
      };
    },
    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      if (!email || !password || password.length < 6) {
        return { data: { user: null, session: null }, error: new Error('Correo o contraseña incorrectos') };
      }

      const admin = mockDb.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
      const user = {
        id: admin?.user_id || `usr-${Date.now()}`,
        email: email.toLowerCase(),
      };
      const session = {
        access_token: 'mock-access-token',
        user,
      };

      notifyAuthChange('SIGNED_IN', session);
      return { data: { user, session }, error: null };
    },
    async signUp({ email, password }: { email: string; password?: string }) {
      if (!email || !password || password.length < 6) {
        return { data: { user: null, session: null }, error: new Error('Datos de registro inválidos') };
      }

      const existingAdmin = mockDb.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (existingAdmin) {
        return { data: { user: null, session: null }, error: new Error('Este correo ya está registrado.') };
      }

      const user = {
        id: `usr-${Date.now()}`,
        email: email.toLowerCase(),
      };
      return { data: { user, session: null }, error: null };
    },
    async signOut() {
      notifyAuthChange('SIGNED_OUT', null);
      return { error: null };
    },
  },

  rpc(fnName: string, args?: any) {
    if (fnName === 'is_admin') {
      const email = mockSession?.user?.email?.toLowerCase();
      const isAdmin = mockDb.admins.some((a) => a.email.toLowerCase() === email);
      return Promise.resolve({ data: isAdmin, error: null });
    }
    if (fnName === 'is_super_admin') {
      const email = mockSession?.user?.email?.toLowerCase();
      const isSuper = mockDb.admins.some((a) => a.email.toLowerCase() === email && a.role === 'super_admin');
      return Promise.resolve({ data: isSuper, error: null });
    }
    if (fnName === 'add_admin') {
      const targetEmail = args?.admin_email?.toLowerCase();
      if (!targetEmail) {
        return Promise.resolve({ error: new Error('Correo requerido') });
      }
      const existing = mockDb.admins.find((a) => a.email.toLowerCase() === targetEmail);
      if (!existing) {
        mockDb.admins.push({
          user_id: `admin-${Date.now()}`,
          email: targetEmail,
          created_at: new Date().toISOString(),
          created_by: mockSession?.user?.id || null,
          role: 'admin',
        });
        mockDb.save('admins');
      }
      return Promise.resolve({ error: null });
    }
    return Promise.resolve({ data: null, error: null });
  },

  from(tableName: string) {
    return createQueryBuilder(tableName);
  },

  storage: {
    from(_bucket: string) {
      return {
        async upload(path: string, file: any) {
          try {
            let url: string;
            if (typeof window !== 'undefined' && file instanceof Blob) {
              url = URL.createObjectURL(file);
            } else {
              url = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80';
            }
            mockDb.receiptUrls[path] = url;
            mockDb.save('receipt_urls');
            return { data: { path }, error: null };
          } catch {
            return { data: null, error: new Error('Error al subir archivo') };
          }
        },
        getPublicUrl(path: string) {
          const url = mockDb.receiptUrls[path] || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80';
          return { data: { publicUrl: url } };
        },
      };
    },
  },

  channel(_channelName: string) {
    const channelObj: any = {
      on(_event: string, _schema: any, _callback: any) {
        return channelObj;
      },
      subscribe() {
        return channelObj;
      },
    };
    return channelObj;
  },

  removeChannel(_channel: any) {
    // no-op
  },
};

// Initialize real client if valid config is present; otherwise fall back to mock client
function initClient() {
  if (isRealConfigured) {
    try {
      return createClient(rawSupabaseUrl!, rawSupabaseAnonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: 'rtst-auth',
          flowType: 'implicit',
        },
      });
    } catch (e) {
      console.warn('[AI Studio] Supabase client initialization error, falling back to mock database:', e);
      return mockSupabase as any;
    }
  }

  console.info(
    '[AI Studio] Supabase credentials not found in environment. Running in local mock mode with sample seed data. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect your live Supabase project.'
  );
  return mockSupabase as any;
}

export const supabase = initClient();
