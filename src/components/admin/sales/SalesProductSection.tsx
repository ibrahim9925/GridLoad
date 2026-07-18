// @ts-nocheck

import React from "react";
import ProductSelector from "./ProductSelector";

interface SalesProductSectionProps {
  saleItems: any[];
  onAddItem: (item: any) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: any) => void;
  editingSaleId?: string;
}
const SalesProductSection = ({
  saleItems,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  editingSaleId,
}: SalesProductSectionProps) => (
  <ProductSelector
    saleItems={saleItems}
    onAddItem={onAddItem}
    onRemoveItem={onRemoveItem}
    onUpdateItem={onUpdateItem}
    editingSaleId={editingSaleId}
  />
);
export default SalesProductSection;
