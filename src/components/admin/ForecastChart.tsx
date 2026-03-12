'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';

interface ForecastData {
  date: string;
  actual: number | null;
  predicted: number;
}

export const ForecastChart: React.FC = () => {
  const [data, setData] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoading(true);
      setError(null);
      const PYTHON_API_URL =
        process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
      try {
        const response = await fetch(
          `${PYTHON_API_URL}/api/admin/forecast/?metric=orders&days_back=30&days_ahead=7`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch forecast data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching forecast:', err);
        setError('Failed to load forecasting insights.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchForecast();
  }, []);

  if (isLoading) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[400px] flex items-center justify-center p-6 text-center text-destructive">
        <p>{error}</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Trend Forecast (Next 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                }
                formatter={(value: any) => [
                  Math.round(Number(value) || 0),
                  'Value',
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                name="Actual Orders"
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Predicted Trend"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
