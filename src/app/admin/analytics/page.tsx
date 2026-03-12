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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { ExportModal } from '@/components/modals/ExportModal';
import { ExportFormat } from '@/lib/export/exportService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#AF19FF',
  '#FF19B7',
];

interface OrdersByStatusChartProps {
  orders: OrderResponse[];
}

const OrdersByStatusChart: React.FC<OrdersByStatusChartProps> = ({
  orders,
}) => {
  const statusCounts = orders.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                }
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

interface TopMaterialsChartProps {
  materials: MaterialResponse[];
}

const TopMaterialsChart: React.FC<TopMaterialsChartProps> = ({ materials }) => {
  // For a real app, this data would come from analytics backend, not just material list
  const sortedMaterials = [...materials]
    .sort((a, b) => b.inventory_count - a.inventory_count)
    .slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Materials (by Inventory)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Inventory</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMaterials.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  No materials data.
                </TableCell>
              </TableRow>
            ) : (
              sortedMaterials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell className="text-right">
                    {material.inventory_count}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default function AdminAnalyticsPage() {
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueStat[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [materials, setMaterials] = useState<MaterialResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      setError(null);
      const PYTHON_API_URL =
        process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
      try {
        const [summaryRes, revenueRes, ordersRes, materialsRes] =
          await Promise.all([
            fetch(`${PYTHON_API_URL}/api/admin/analytics/summary`),
            fetch(`${PYTHON_API_URL}/api/admin/analytics/revenue?days=30`),
            fetch(`${PYTHON_API_URL}/api/admin/orders?limit=1000`), // Fetch more for status breakdown
            fetch(`${PYTHON_API_URL}/api/admin/materials?limit=100`),
          ]);

        if (summaryRes.ok) setSummaryStats(await summaryRes.json());
        else
          console.error(
            'Failed to fetch summary stats',
            await summaryRes.text()
          );

        if (revenueRes.ok) setRevenueData(await revenueRes.json());
        else
          console.error(
            'Failed to fetch revenue data',
            await revenueRes.text()
          );

        if (ordersRes.ok) setOrders(await ordersRes.json());
        else console.error('Failed to fetch orders', await ordersRes.text());

        if (materialsRes.ok) setMaterials(await materialsRes.json());
        else
          console.error('Failed to fetch materials', await materialsRes.text());
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('An unexpected error occurred while fetching analytics data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalyticsData();
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <p>Loading analytics dashboard...</p>
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
      <h2 className="text-3xl font-bold tracking-tight">Analytics Overview</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={summaryStats?.total_users ?? '-'}
          description="All registered users"
        />
        <MetricCard
          title="Total Orders"
          value={summaryStats?.total_orders ?? '-'}
          description="Total orders placed"
        />
        <MetricCard
          title="Total Revenue"
          value={`€${(summaryStats?.total_revenue ?? 0).toFixed(2)}`}
          description="Revenue from paid orders"
        />
        <MetricCard
          title="Active Materials"
          value={materials.filter((m) => m.is_active).length}
          description="Currently active materials"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-1 lg:col-span-2">
          <RevenueChart data={revenueData} />
        </div>
        <div className="md:col-span-1 lg:col-span-1 flex flex-col gap-4">
          <OrdersByStatusChart orders={orders} />
          <TopMaterialsChart materials={materials} />
        </div>
      </div>
    </div>
  );
}
