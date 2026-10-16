export type CompanyType =
  | 'SNACKS'
  | 'CHIPS'
  | 'GROUNDNUT'
  | 'PICKLE'
  | 'MASALA'
  | 'FMCG_OTHER'
  | 'OTHER';

export type OrderStatus =
  | 'ORDER_RECEIVED'
  | 'DESIGN_PENDING'
  | 'DESIGN_IN_PROGRESS'
  | 'DESIGN_APPROVED'
  | 'SENT_TO_PRINT'
  | 'PRINTING'
  | 'PRINT_DISPATCHED'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_LORRY_OFFICE'
  | 'RECEIVED_IN_GODOWN'
  | 'PARTIALLY_DELIVERED'
  | 'FULLY_DELIVERED'
  | 'CLOSED';

export type DesignStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SENT_FOR_APPROVAL'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'SENT_TO_PRINT';

export type PrintJobStatus =
  | 'ORDER_PLACED'
  | 'IN_PRODUCTION'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED';

export type LorryStatus =
  | 'BOOKED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_OFFICE'
  | 'TEMPO_BOOKED'
  | 'PICKED_UP'
  | 'RECEIVED_IN_GODOWN';

export type PaymentMode =
  | 'RTGS'
  | 'NEFT'
  | 'CASH'
  | 'GPAY'
  | 'UPI_OTHER'
  | 'CHEQUE';

export type DeliveryType = 'FULL' | 'PARTIAL';

export type AgingStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type TrackingStatus = 'ON_TRACK' | 'ARRIVING_TODAY' | 'OVERDUE' | 'NEEDS_TEMPO' | 'COMPLETED';
export type PipelineStatus = 'ON_TRACK' | 'SLOW' | 'ACTION_NEEDED';
export type FollowupUrgency = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'NEVER_PAID';

export interface Customer {
  id: string;
  name: string;
  company_type: CompanyType;
  gstn: string | null;
  contact_person: string | null;
  phone: string | null;
  phone_secondary: string | null;
  email: string | null;
  whatsapp_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string | null;
  opening_balance_amount: number;
  opening_balance_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Product {
  id: string;
  customer_id: string;
  customer_name?: string;
  sku_code: string | null;
  name: string;
  description: string | null;
  material_type: string | null;
  width_mm: number | null;
  height_mm: number | null;
  thickness_micron: number | null;
  color_count: number | null;
  default_rate: number | null;
  rate_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: number;
  customer_id: string;
  customer_name?: string;
  product_id: string | null;
  product_name?: string;
  order_date: string;
  expected_delivery_date: string | null;
  quantity_ordered: number;
  quantity_unit: string;
  rate_per_unit: number;
  total_amount: number;
  status: OrderStatus;
  status_changed_at: string;
  is_historical: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  days_in_current_stage?: number;
  is_stuck?: boolean;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_at: string;
  changed_by: string | null;
}

export interface Design {
  id: string;
  order_id: string;
  order_number?: number;
  customer_id?: string;
  customer_name?: string;
  product_name?: string;
  version_number: number;
  status: DesignStatus;
  file_url: string | null;
  file_name: string | null;
  customer_feedback: string | null;
  internal_notes: string | null;
  sent_for_approval_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  days_since_created?: number;
  pipeline_status?: PipelineStatus;
}

export interface Printer {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrintJob {
  id: string;
  order_id: string;
  order_number?: number;
  customer_name?: string;
  design_id: string | null;
  printer_id: string | null;
  printer_name?: string;
  material_type: string | null;
  width_mm: number | null;
  height_mm: number | null;
  color_count: number | null;
  quantity: number;
  quantity_unit: string;
  sent_date: string | null;
  expected_dispatch_date: string | null;
  actual_dispatch_date: string | null;
  cost_per_unit: number | null;
  total_cost: number | null;
  status: PrintJobStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lorry {
  id: string;
  lr_number: string;
  booking_date: string | null;
  transporter_name: string;
  transporter_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_number: string | null;
  origin_city: string;
  destination_city: string;
  dispatch_date: string | null;
  expected_arrival_date: string | null;
  actual_arrival_date: string | null;
  lorry_office_name: string | null;
  lorry_office_address: string | null;
  lorry_office_phone: string | null;
  tempo_booked: boolean;
  tempo_booking_date: string | null;
  tempo_cost: number | null;
  tempo_vehicle_number: string | null;
  pickup_date: string | null;
  freight_cost: number | null;
  freight_paid: boolean;
  status: LorryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tracking_status?: TrackingStatus;
  days_overdue?: number;
  manifest_summary?: {
    item_count: number;
    total_weight_kg: number;
    customer_names: string;
    order_numbers: string;
  };
}

export interface LorryItem {
  id: string;
  lorry_id: string;
  print_job_id: string | null;
  order_id: string;
  customer_id: string;
  product_id: string | null;
  quantity: number;
  quantity_unit: string;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
  order_number?: number;
  customer_name?: string;
  product_name?: string;
}

export interface GodownBatch {
  id: string;
  lorry_id: string | null;
  lorry_item_id: string | null;
  order_id: string;
  customer_id: string;
  product_id: string | null;
  quantity_received: number;
  quantity_remaining: number;
  quantity_unit: string;
  received_date: string;
  is_historical: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  days_in_godown?: number;
  aging_status?: AgingStatus;
  customer_name?: string;
  product_name?: string;
  order_number?: number;
  order_status?: OrderStatus;
  order_value?: number;
}

export interface Delivery {
  id: string;
  challan_number: number;
  order_id: string;
  customer_id: string;
  delivery_date: string;
  delivery_type: DeliveryType;
  quantity_delivered: number;
  quantity_unit: string;
  delivery_mode: string | null;
  vehicle_number: string | null;
  received_by: string | null;
  is_historical: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  order_number?: number;
}

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  godown_batch_id: string;
  quantity: number;
  created_at: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  payment_date: string;
  payment_mode: PaymentMode;
  reference_number: string | null;
  bank_name: string | null;
  is_historical: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}

// Intelligence Views
export interface DashboardKPIs {
  active_orders: number;
  new_orders: number;
  pending_designs: number;
  active_print_jobs: number;
  active_lorries: number;
  overdue_lorries: number;
  godown_batch_count: number;
  total_godown_stock_kg: number;
  godown_aging_alerts: number;
  total_outstanding: number;
  payment_critical_count: number;
  orders_pending_delivery: number;
  orders_ready_to_deliver: number;
}

export interface CustomerOutstanding {
  customer_id: string;
  customer_name: string;
  company_type: CompanyType;
  phone: string | null;
  whatsapp_number: string | null;
  opening_balance: number;
  total_invoiced: number;
  total_paid: number;
  outstanding_amount: number;
  active_orders: number;
  last_payment_date: string | null;
  days_since_last_payment: number | null;
}

export interface GodownAgingBatch {
  batch_id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  product_id: string | null;
  product_name: string | null;
  quantity_received: number;
  quantity_remaining: number;
  quantity_unit: string;
  received_date: string;
  days_in_godown: number;
  aging_status: AgingStatus;
  order_number: number;
  order_status: OrderStatus;
  order_value: number;
}

export interface GodownByCustomer {
  customer_id: string;
  customer_name: string;
  batch_count: number;
  total_quantity_sitting: number;
  oldest_batch_date: string;
  max_days_sitting: number;
  critical_quantity: number;
}

export interface PendingDelivery {
  order_id: string;
  order_number: number;
  customer_id: string;
  customer_name: string;
  product_id: string | null;
  product_name: string | null;
  quantity_ordered: number;
  total_delivered: number;
  pending_quantity: number;
  quantity_unit: string;
  order_value: number;
  order_date: string;
  status: OrderStatus;
  quantity_in_godown: number;
  can_fulfil_from_godown: boolean;
}

export interface PaymentFollowup {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  whatsapp_number: string | null;
  outstanding_amount: number;
  days_since_last_payment: number | null;
  last_payment_date: string | null;
  active_orders: number;
  total_invoiced: number;
  total_paid: number;
  followup_urgency: FollowupUrgency;
}

export interface CustomerLedgerEntry {
  customer_id: string;
  txn_date: string;
  txn_type: 'INVOICE' | 'PAYMENT';
  ref_id: string;
  description: string;
  debit: number;
  credit: number;
  sort_ts: string;
  balance_running?: number;
}

