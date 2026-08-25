import type { SupabaseClient } from '@supabase/supabase-js';

export type Book = {
  id: string;
  sku: string;
  title: string;
  subtitle?: string | null;
  author?: string | null;
  publisher?: string | null;
  isbn13?: string | null;
  category?: string | null;
  current_price: number;
  currency: string;
  low_stock_threshold: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Supplier = {
  id: string;
  code: string;
  name_zh: string;
  name_en?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: string;
  code: string;
  name: string;
  location_type: 'store' | 'warehouse';
  address?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  status: 'draft' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
  currency: string;
  order_date: string;
  expected_date?: string | null;
  subtotal: number;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type InventoryBatch = {
  id: string;
  batch_code: string;
  book_id: string;
  location_id: string;
  unit_cost: number;
  quantity_received: number;
  quantity_remaining: number;
  received_at: string;
};

export type ValuationRow = {
  book_id: string;
  sku: string;
  title: string;
  publisher?: string;
  category?: string;
  location_id: string;
  location_code: string;
  location_name: string;
  quantity_on_hand: number;
  inventory_value: number;
  weighted_average_cost: number;
  current_price: number;
  currency: string;
  retail_value: number;
};

export type LowStockRow = {
  book_id: string;
  sku: string;
  title: string;
  publisher?: string;
  low_stock_threshold: number;
  quantity_on_hand: number;
  reorder_shortage: number;
};

// ── Supabase helpers ──

export async function getBooks(supabase: SupabaseClient, query?: string) {
  let q = supabase.from('books').select('*').eq('is_active', true).order('title');
  if (query) {
    // Chinese-aware search: title, publisher, sku
    q = q.or(`title.ilike.%${query}%,publisher.ilike.%${query}%,sku.ilike.%${query}%,author.ilike.%${query}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data as Book[];
}

export async function getSuppliers(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('suppliers').select('*').eq('is_active', true).order('name_zh');
  if (error) throw error;
  return data as Supplier[];
}

export async function getLocations(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('locations').select('*').eq('is_active', true).order('code');
  if (error) throw error;
  return data as Location[];
}

export async function getValuation(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('inventory_valuation_view').select('*');
  if (error) throw error;
  return data as ValuationRow[];
}

export async function getLowStock(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('low_stock_view').select('*');
  if (error) throw error;
  return data as LowStockRow[];
}
