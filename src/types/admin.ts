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
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'pending_deposit';
  createdAt: string;
}

export interface OrderUpdate {
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'pending_deposit';
}

export interface OrderDB {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'pending_deposit';
  user_id: string;
  total_price: number;
  configuration: any;
  created_at: string;
}

export interface MaterialResponse {
  id: string;
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
}

export interface UserUpdate {
  role?: 'admin' | 'superadmin' | 'customer';
  is_active?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}
