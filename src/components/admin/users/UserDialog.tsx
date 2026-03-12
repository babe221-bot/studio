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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserResponse } from '@/types/admin';

interface UserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    userId: string,
    data: { full_name?: string; role?: string; is_active?: boolean }
  ) => void;
  user: UserResponse | null;
}

export const UserDialog: React.FC<UserDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
}) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [role, setRole] = useState(user?.role || 'customer');
  const [isActive, setIsActive] = useState(user?.is_active ?? true);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setRole(user.role);
      setIsActive(user.is_active);
    } else {
      setFullName('');
      setRole('customer');
      setIsActive(true);
    }
  }, [user]);

  const handleSave = () => {
    if (user) {
      onSave(user.id, { full_name: fullName, role, is_active: isActive });
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {user
              ? `Edit User: ${user.full_name || user.id.slice(0, 8) + '...'}`
              : 'New User'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value: string) =>
                setRole(
                  value as
                    | 'admin'
                    | 'superadmin'
                    | 'customer'
                    | 'staff'
                    | 'manager'
                )
              }
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="active-status"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active-status">Active</Label>
          </div>
        </div>
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
