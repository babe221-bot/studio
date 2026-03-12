'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserTable } from '@/components/admin/users/UserTable';
import { UserDialog } from '@/components/admin/users/UserDialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { UserResponse } from '@/types/admin';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${PYTHON_API_URL}/api/admin/users`);
      if (response.ok) {
        setUsers(await response.json());
      } else {
        console.error('Failed to fetch users', await response.text());
        setError('Failed to load users.');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('An unexpected error occurred while fetching users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditUser = (user: UserResponse) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${PYTHON_API_URL}/api/admin/users/${userId}`,
        {
          method: 'DELETE',
        }
      );
      if (response.ok) {
        fetchUsers();
      } else {
        console.error('Failed to deactivate user', await response.text());
        setError('Failed to deactivate user.');
      }
    } catch (err) {
      console.error('Error deactivating user:', err);
      setError('An unexpected error occurred.');
    }
  };

  const handleSaveUser = async (
    userId: string,
    data: { full_name?: string; role?: string; is_active?: boolean }
  ) => {
    const PYTHON_API_URL =
      process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    try {
      const response = await fetch(
        `${PYTHON_API_URL}/api/admin/users/${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (response.ok) {
        fetchUsers();
      } else {
        console.error('Failed to save user', await response.text());
        setError('Failed to save user.');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <Button
          onClick={() => {
            setEditingUser(null);
            setIsDialogOpen(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading users...</p>
          ) : error ? (
            <p className="text-destructive">Error: {error}</p>
          ) : (
            <UserTable
              users={users}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />
          )}
        </CardContent>
      </Card>

      <UserDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveUser}
        user={editingUser}
      />
    </div>
  );
}
