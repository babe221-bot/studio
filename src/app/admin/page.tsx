'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/admin/MetricCard';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { RecentOrders } from '@/components/admin/RecentOrders';
import { LowStockAlerts } from '@/components/admin/LowStockAlerts';
import { SummaryStats, RevenueStat } from '@/types/admin';
import { OrderResponse } from '@/types/admin';
import { MaterialResponse } from '@/types/admin';

export default function AdminDashboardPage() {
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueStat[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderResponse[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<
    MaterialResponse[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      setError(null);
      const PYTHON_API_URL =
        process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
      try {
        const [summaryRes, revenueRes, ordersRes, materialsRes] =
          await Promise.all([
            fetch(`${PYTHON_API_URL}/api/admin/analytics/summary`),
            fetch(`${PYTHON_API_URL}/api/admin/analytics/revenue?days=30`),
            fetch(`${PYTHON_API_URL}/api/admin/orders?limit=5`),
            fetch(`${PYTHON_API_URL}/api/admin/materials?limit=100`),
          ]);

        if (summaryRes.ok) {
          setSummaryStats(await summaryRes.json());
        } else {
          console.error(
            'Failed to fetch summary stats',
            await summaryRes.text()
          );
          setError('Failed to load summary stats.');
        }
        if (revenueRes.ok) {
          setRevenueData(await revenueRes.json());
        } else {
          console.error(
            'Failed to fetch revenue data',
            await revenueRes.text()
          );
          setError((prev) =>
            prev
              ? prev + ' Failed to load revenue data.'
              : 'Failed to load revenue data.'
          );
        }
        if (ordersRes.ok) {
          setRecentOrders(await ordersRes.json());
        } else {
          console.error(
            'Failed to fetch recent orders',
            await ordersRes.text()
          );
          setError((prev) =>
            prev
              ? prev + ' Failed to load recent orders.'
              : 'Failed to load recent orders.'
          );
        }
        if (materialsRes.ok) {
          setLowStockMaterials(await materialsRes.json());
        } else {
          console.error('Failed to fetch materials', await materialsRes.text());
          setError((prev) =>
            prev
              ? prev + ' Failed to load materials for stock alerts.'
              : 'Failed to load materials for stock alerts.'
          );
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('An unexpected error occurred while fetching admin data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={summaryStats?.total_users ?? '-'}
          description="Number of registered users"
        />
        <MetricCard
          title="Total Orders"
          value={summaryStats?.total_orders ?? '-'}
          description="All orders placed"
        />
        <MetricCard
          title="Total Revenue"
          value={`€${(summaryStats?.total_revenue ?? 0).toFixed(2)}`}
          description="Total revenue from paid orders"
        />
        <MetricCard
          title="Pending Orders"
          value={
            recentOrders.filter((o) => o.status === 'pending_deposit').length
          }
          description="Orders awaiting deposit"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-1 lg:col-span-2">
          <RevenueChart data={revenueData} />
        </div>
        <div className="md:col-span-1 lg:col-span-1">
          <RecentOrders orders={recentOrders} />
          <div className="mt-4">
            <LowStockAlerts materials={lowStockMaterials} />
          </div>
        </div>
      </div>
    </div>
  );
}
