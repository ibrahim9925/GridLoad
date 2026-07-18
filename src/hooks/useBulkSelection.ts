// @ts-nocheck
import { useState, useCallback } from "react";

export function useBulkSelection<T>(items: T[], getItemId: (item: T) => string) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectItem = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(items.map(getItemId));
  }, [items, getItemId]);

  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  const selectedItems = items.filter(item => selectedIds.includes(getItemId(item)));

  return {
    selectedIds,
    selectedItems,
    selectItem,
    selectAll,
    deselectAll,
    isSelected,
    selectedCount: selectedIds.length,
  };
}