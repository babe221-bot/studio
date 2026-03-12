import { useState } from 'react';

export function useMaterialFilters() {
  const [filters, setFilters] = useState({
    category: null as string | null,
    minPrice: null as number | null,
    maxPrice: null as number | null,
    availability: null as string | null,
  });

  const setFilter = (updates: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const clearFilters = () => {
    setFilters({
      category: null,
      minPrice: null,
      maxPrice: null,
      availability: null,
    });
  };

  return {
    filters,
    setFilter,
    clearFilters,
  };
}
