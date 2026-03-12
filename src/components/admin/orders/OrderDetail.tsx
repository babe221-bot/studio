'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderResponse, OrderUpdate, OrderDB } from '@/types/admin';

interface OrderDetailProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, data: OrderUpdate) => void;
  order: (OrderDB & { items: string }) | null; // Use OrderDB with items as string
}

export const OrderDetail: React.FC<OrderDetailProps> = ({
  isOpen,
  onClose,
  onSave,
  order,
}) => {
  const [status, setStatus] = useState(order?.status || '');
  const [fulfillmentStatus, setFulfillmentStatus] = useState(
    order?.fulfillment_status || 'pending'
  );
  const [assignedStaffId, setAssignedStaffId] = useState(
    order?.assigned_staff_id || ''
  );
  const [trackingNumber, setTrackingNumber] = useState(
    order?.tracking_number || ''
  );

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setFulfillmentStatus(order.fulfillment_status || 'pending');
      setAssignedStaffId(order.assigned_staff_id || '');
      setTrackingNumber(order.tracking_number || '');
    } else {
      setStatus('');
      setFulfillmentStatus('pending');
      setAssignedStaffId('');
      setTrackingNumber('');
    }
  }, [order]);

  const handleSave = () => {
    if (order) {
      onSave(order.id, { status, fulfillment_status: fulfillmentStatus });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] lg:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Order Details: {order?.id.slice(0, 8)}...</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="order-id" className="text-right">
                Order ID
              </Label>
              <Input
                id="order-id"
                value={order?.id}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-id" className="text-right">
                User ID
              </Label>
              <Input
                id="user-id"
                value={order?.user_id || 'Guest'}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_deposit">
                    Pending Deposit
                  </SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fulfillment-status" className="text-right">
                Fulfillment
              </Label>
              <Select
                value={fulfillmentStatus}
                onValueChange={setFulfillmentStatus}
              >
                <SelectTrigger id="fulfillment-status" className="col-span-3">
                  <SelectValue placeholder="Select fulfillment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assigned-staff" className="text-right">
                Assigned Staff
              </Label>
              <Input
                id="assigned-staff"
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tracking-number" className="text-right">
                Tracking Number
              </Label>
              <Input
                id="tracking-number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="col-span-3"
              />
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Order Items</h3>
              {order?.items && JSON.parse(order.items).length > 0 ? (
                <div className="border rounded-md">
                  {JSON.parse(order.items).map((item: any, index: number) => (
                    <div key={index} className="p-3 border-b last:border-b-0">
                      <p className="font-medium">{item.id}</p>
                      <p className="text-sm text-muted-foreground">
                        Material: {item.material?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dimensions: {item.dims?.length}x{item.dims?.width}x
                        {item.dims?.height} cm
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </p>
                      <p className="text-sm font-semibold">
                        Total: €{item.totalCost?.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No items in this order.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
