export type PurchaseOrderStatus = 'draft' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export type PurchaseOrderLine = {
  id: string;
  purchase_order_id: string;
  book_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  line_total: number;
};

export type CreatePOInput = {
  supplier_id: string;
  expected_date?: string;
  notes?: string;
  lines: Array<{ book_id: string; quantity_ordered: number; unit_cost: number }>;
};
