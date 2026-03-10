import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialResponse } from '@/backend/app/api/admin/materials'; // Adjust path
import { AlertCircle } from 'lucide-react';

interface LowStockAlertsProps {
  materials: MaterialResponse[];
}

export const LowStockAlerts: React.FC<LowStockAlertsProps> = ({
  materials,
}) => {
  const lowStockMaterials = materials.filter(
    (m) => m.inventory_count <= 5 && m.is_active
  );

  if (lowStockMaterials.length === 0) {
    return null; // Or a card indicating no low stock
  }

  return (
    <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
          <AlertCircle className="h-4 w-4 inline-block mr-2" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-1">
          {lowStockMaterials.map((m) => (
            <li key={m.id} className="flex justify-between">
              <span>{m.name}</span>
              <span className="font-medium">{m.inventory_count} left</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
