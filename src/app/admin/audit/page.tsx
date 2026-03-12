'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AuditLog {
  id: number;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setIsLoading(true);
      setError(null);
      const PYTHON_API_URL =
        process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
      try {
        const response = await fetch(
          `${PYTHON_API_URL}/api/admin/audit/?limit=50`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch audit logs');
        }
        const data = await response.json();
        setLogs(data);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
        setError('An unexpected error occurred while fetching audit logs.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAuditLogs();
  }, []);

  if (isLoading) {
    return <div className="p-8">Loading audit logs...</div>;
  }

  if (error) {
    return <div className="p-8 text-destructive">Error: {error}</div>;
  }

  return (
    <div className="grid gap-6">
      <h2 className="text-3xl font-bold tracking-tight">Admin Audit Logs</h2>
      <Card>
        <CardHeader>
          <CardTitle>Recent Administrative Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No audit logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.admin_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {log.resource_type}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.resource_id}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div
                        className="text-xs truncate"
                        title={`New: ${log.new_value}`}
                      >
                        {log.new_value}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
