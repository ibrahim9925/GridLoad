// @ts-nocheck
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableWithSelectionProps<T> {
  data: T[];
  selectedIds: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  columns: {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
  }[];
  getItemId: (item: T) => string;
  className?: string;
}

export function DataTableWithSelection<T>({
  data,
  selectedIds,
  onSelectItem,
  onSelectAll,
  onDeselectAll,
  columns,
  getItemId,
  className,
}: DataTableWithSelectionProps<T>) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              aria-label="Select all"
              className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
            />
          </TableHead>
          {columns.map((column) => (
            <TableHead key={column.key}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => {
          const itemId = getItemId(item);
          const isSelected = selectedIds.includes(itemId);
          
          return (
            <TableRow key={itemId} className={isSelected ? "bg-muted/50" : ""}>
              <TableCell>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onSelectItem(itemId)}
                  aria-label={`Select item ${itemId}`}
                />
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render 
                    ? column.render(item) 
                    : String((item as any)[column.key] || "")
                  }
                </TableCell>
              ))}
            </TableRow>
          );
        })}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
              No data available
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}