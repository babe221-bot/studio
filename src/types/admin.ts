export interface SummaryStats {
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
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
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface MaterialResponse {
  id: string;
  name: string;
  inventory_count: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  category: string;
}
