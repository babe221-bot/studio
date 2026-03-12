'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface MaterialSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MaterialSearch({
  value,
  onChange,
  placeholder = 'Search materials...',
}: MaterialSearchProps) {
  return (
    <div className="flex items-center space-x-2">
      <Search className="h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
    </div>
  );
}
