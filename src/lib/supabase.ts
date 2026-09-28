import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  detectSessionInUrl: true,
  storage: window.localStorage,
  storageKey: 'rtst-auth',
  flowType: 'implicit',
  },
});

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
