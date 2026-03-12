'use client';

import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MaterialFiltersProps {
  filters: {
    category: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    availability: string | null;
  };
  onFilterChange: (filters: Partial<typeof filters>) => void;
  onClear: () => void;
}

export function MaterialFilters({
  filters,
  onFilterChange,
  onClear,
}: MaterialFiltersProps) {
  const [category, setCategory] = useState(filters.category ?? '');
  const [minPrice, setMinPrice] = useState(filters.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice ?? '');
  const [availability, setAvailability] = useState(filters.availability ?? '');

  const handleApply = () => {
    onFilterChange({
      category: category || null,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      availability: availability || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>

      <div className="space-y-3">
        {/* Category Filter */}
        <div className="space-y-1">
          <span className="text-xs font-medium">Category</span>
          <Select
            value={category}
            onValueChange={setCategory}
            placeholder="All categories"
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              <SelectItem value="marble">Marble</SelectItem>
              <SelectItem value="granite">Granite</SelectItem>
              <SelectItem value="quartz">Quartz</SelectItem>
              <SelectItem value="limestone">Limestone</SelectItem>
              <SelectItem value="slate">Slate</SelectItem>
              <SelectItem value="soapstone">Soapstone</SelectItem>
              <SelectItem value="onyx">Onyx</SelectItem>
              <SelectItem value="porcelain">Porcelain</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div className="space-y-1">
          <span className="text-xs font-medium">Price Range (€/m²)</span>
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-24"
            />
            <span>–</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-24"
            />
          </div>
        </div>

        {/* Availability */}
        <div className="space-y-1">
          <span className="text-xs font-medium">Availability</span>
          <Select
            value={availability}
            onValueChange={setAvailability}
            placeholder="Any"
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="limited">Limited</SelectItem>
              <SelectItem value="special_order">Special Order</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="default" size="sm" onClick={handleApply}>
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
