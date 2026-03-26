'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function AdminPricingPage() {
  const [finishes, setFinishes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinishes = async () => {
    setIsLoading(true);
    setError(null);
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${PYTHON_API_URL}/api/admin/pricing/finishes`
      );
      if (response.ok) {
        setFinishes(await response.json());
      } else {
        console.error('Failed to fetch finishes', await response.text());
        setError('Failed to load finishes.');
      }
    } catch (err) {
      console.error('Error fetching finishes:', err);
      setError('An unexpected error occurred while fetching finishes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinishes();
  }, []);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          Pricing Management
        </h2>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Finish
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Finishes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading finishes...</p>
          ) : error ? (
            <p className="text-destructive">Error: {error}</p>
          ) : (
            <pre>{JSON.stringify(finishes, null, 2)}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
