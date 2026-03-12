'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AnalyticsExportBtnProps {
  days?: number;
}

export const AnalyticsExportBtn: React.FC<AnalyticsExportBtnProps> = ({
  days = 30,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setIsExporting(true);
      const PYTHON_API_URL =
        process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${PYTHON_API_URL}/api/admin/analytics/export?format=${format}&days=${days}`,
        {
          method: 'GET',
          // In a real app, include auth headers here
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export analytics data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <FileDown className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
