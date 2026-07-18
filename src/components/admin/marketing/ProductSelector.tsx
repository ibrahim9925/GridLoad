// @ts-nocheck

import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export interface ProductSelectorProps {
  products: Product[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  productLoading: boolean;
  aiLoading: boolean;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  products,
  selectedProductId,
  setSelectedProductId,
  productLoading,
  aiLoading,
}) => (
  <div className="flex items-center gap-2 mb-1">
    <span className="text-xs font-semibold">Product:</span>
    <Select
      onValueChange={v => setSelectedProductId(v)}
      value={selectedProductId}
      disabled={productLoading}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder={productLoading ? "Loading products..." : "Select a product (optional)"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {products.map(prod => (
          <SelectItem key={prod.id} value={prod.id}>
            {prod.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {selectedProductId !== "none" && (
      <Button
        size="sm"
        variant="ghost"
        className="text-xs ml-1"
        onClick={() => setSelectedProductId("none")}
        disabled={aiLoading}
      >Clear</Button>
    )}
  </div>
);

