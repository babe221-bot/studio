'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { OrderResponse } from '@/types/admin';

interface OrderTableProps {
  orders: OrderResponse[];
  onView: (orderId: string) => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({ orders, onView }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>User ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fulfillment</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center text-muted-foreground"
            >
              No orders found.
            </TableCell>
          </TableRow>
        ) : (
          orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.id.slice(0, 8)}...
              </TableCell>
              <TableCell>
                {order.user_id ? order.user_id.slice(0, 8) + '...' : 'Guest'}
              </TableCell>
              <TableCell>
                <Badge
                  variant={order.status === 'paid' ? 'success' : 'outline'}
                >
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    order.fulfillment_status === 'delivered'
                      ? 'success'
                      : 'secondary'
                  }
                >
                  {order.fulfillment_status || 'N/A'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                €{order.total_amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView(order.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
