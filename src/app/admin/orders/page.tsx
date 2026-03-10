'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderTable } from '@/components/admin/orders/OrderTable';
import { OrderDetail } from '@/components/admin/orders/OrderDetail';
import { OrderResponse, OrderUpdate } from '@/backend/app/api/admin/orders';
import { OrderDB } from '@/backend/app/models/domain';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<
    (OrderDB & { items: any }) | null
  >(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${PYTHON_API_URL}/api/admin/orders`);
      if (response.ok) {
        setOrders(await response.json());
      } else {
        console.error('Failed to fetch orders', await response.text());
        setError('Failed to load orders.');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('An unexpected error occurred while fetching orders.');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleViewOrder = async (orderId: string) => {
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${PYTHON_API_URL}/api/admin/orders/${orderId}`
      );
      if (response.ok) {
        const orderData = await response.json();
        setViewingOrder(orderData);
        setIsDetailOpen(true);
      } else {
        console.error('Failed to fetch order details', await response.text());
        setError('Failed to load order details.');
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('An unexpected error occurred.');
    }
  };

  const handleSaveOrder = async (orderId: string, data: OrderUpdate) => {
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${PYTHON_API_URL}/api/admin/orders/${orderId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (response.ok) {
        fetchOrders();
      } else {
        console.error('Failed to save order', await response.text());
        setError('Failed to save order.');
      }
    } catch (err) {
      console.error('Error saving order:', err);
      setError('An unexpected error occurred.');
    }
    setIsDetailOpen(false);
  };

  return (
    <div className="grid gap-6">
      <h2 className="text-3xl font-bold tracking-tight">Order Management</h2>
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading orders...</p>
          ) : error ? (
            <p className="text-destructive">Error: {error}</p>
          ) : (
            <OrderTable orders={orders} onView={handleViewOrder} />
          )}
        </CardContent>
      </Card>

      <OrderDetail
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onSave={handleSaveOrder}
        order={viewingOrder}
      />
    </div>
  );
}
