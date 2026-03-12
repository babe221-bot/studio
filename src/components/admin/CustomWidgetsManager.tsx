'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MetricCard } from '@/components/admin/MetricCard';

interface Widget {
  id: number;
  title: string;
  metric_type: string;
  chart_type: string;
  config: string;
}

export const CustomWidgetsManager: React.FC = () => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // New widget form state
  const [newTitle, setNewTitle] = useState('');
  const [newMetric, setNewMetric] = useState('orders_count');
  const [newChart, setNewChart] = useState('number');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchWidgets = async () => {
    setIsLoading(true);
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${PYTHON_API_URL}/api/admin/widgets/`);
      if (res.ok) {
        setWidgets(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch widgets', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  const handleAddWidget = async () => {
    setIsAdding(true);
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${PYTHON_API_URL}/api/admin/widgets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          metric_type: newMetric,
          chart_type: newChart,
          config: '{}',
        }),
      });
      if (res.ok) {
        await fetchWidgets();
        setIsDialogOpen(false);
        setNewTitle('');
      }
    } catch (err) {
      console.error('Failed to add widget', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteWidget = async (id: number) => {
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${PYTHON_API_URL}/api/admin/widgets/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setWidgets(widgets.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete widget', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Custom Widgets</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Widget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Widget</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Total Revenue (Last Week)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="metric">Metric</Label>
                <Select value={newMetric} onValueChange={setNewMetric}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orders_count">Orders Count</SelectItem>
                    <SelectItem value="revenue">Total Revenue</SelectItem>
                    <SelectItem value="users_count">Total Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="chart">Display Type</Label>
                <Select value={newChart} onValueChange={setNewChart}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select display type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Metric Card</SelectItem>
                    {/* Placeholder for future types */}
                    <SelectItem value="line" disabled>
                      Line Chart (Coming Soon)
                    </SelectItem>
                    <SelectItem value="bar" disabled>
                      Bar Chart (Coming Soon)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddWidget}
                disabled={!newTitle || isAdding}
              >
                {isAdding ? 'Adding...' : 'Add Widget'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {widgets.length === 0 ? (
          <p className="col-span-full text-center py-8 text-muted-foreground italic">
            No custom widgets yet. Click "Add Widget" to create one.
          </p>
        ) : (
          widgets.map((widget) => (
            <div key={widget.id} className="relative group">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-8 w-8 text-destructive"
                onClick={() => handleDeleteWidget(widget.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <MetricCard
                title={widget.title}
                value="-" // Real data would be fetched based on metric_type
                description={`Type: ${widget.metric_type}`}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
