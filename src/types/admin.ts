export interface SummaryStats {
  total_orders: number;
  total_revenue: number;
  total_users: number;
  pendingReviews: number;
  orderGrowth: number;
  revenueGrowth: number;
  userGrowth: number;
  reviewGrowth: number;
}

export interface RevenueStat {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrderResponse {
  id: string;
  customerName: string;
  totalAmount: number;
  total_amount?: number;
  status:
    | 'pending'
    | 'processing'
    | 'completed'
    | 'cancelled'
    | 'pending_deposit'
    | 'paid';
  fulfillment_status?: 'pending' | 'processing' | 'shipped' | 'delivered';
  user_id?: string;
  createdAt: string;
}

export interface OrderUpdate {
  status: string;
  fulfillment_status?: string;
}

export interface OrderDB {
  id: string;
  user_id: string;
  guest_session_id?: string;
  status: string;
  total_amount: number;
  deposit_amount?: number;
  currency?: string;
  items: string; // JSON string
  shipping_method?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  fulfillment_status?: string;
  assigned_staff_id?: string;
  tracking_number?: string;
}

export interface MaterialResponse {
  id: number;
  name: string;
  inventory_count: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  category: string;
  is_active: boolean;
}

export interface MaterialUpdate {
  name?: string;
  inventory_count?: number;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  category?: string;
  is_active?: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  role: 'admin' | 'superadmin' | 'customer';
  created_at: string;
  is_active: boolean;
  name?: string;
  full_name?: string;
}

export interface UserUpdate {
  role?: 'admin' | 'superadmin' | 'customer';
  is_active?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}
