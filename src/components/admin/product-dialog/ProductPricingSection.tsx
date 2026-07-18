// @ts-nocheck

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateMarginPercent, formatPercent, getMarginColor } from "@/utils/profitUtils";

interface Props {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

const ProductPricingSection: React.FC<Props> = ({ formData, handleInputChange }) => {
  const cost = Number(formData.cost_price) || 0;
  const minPrice = Number(formData.min_selling_price) || 0;
  const stdPrice = Number(formData.standard_selling_price) || 0;
  const maxPrice = Number(formData.max_selling_price) || 0;

  const minMargin = calculateMarginPercent(cost, minPrice);
  const stdMargin = calculateMarginPercent(cost, stdPrice);
  const maxMargin = calculateMarginPercent(cost, maxPrice);

  return (
    <div className="border rounded-lg p-3 mt-2 mb-2 bg-yellow-50">
      <div className="font-semibold text-sm mb-1">Selling Prices & Profit</div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="min_selling_price">Min Price</Label>
          <Input
            id="min_selling_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.min_selling_price ?? ""}
            onChange={e => handleInputChange("min_selling_price", parseFloat(e.target.value) || 0)}
            placeholder="Lowest value you'll accept"
          />
          {minPrice > 0 && cost > 0 && (
            <div className={`text-xs mt-1 ${getMarginColor(minMargin)}`}>
              Margin: {formatPercent(minMargin)}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="standard_selling_price">Standard Price</Label>
          <Input
            id="standard_selling_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.standard_selling_price ?? ""}
            onChange={e => handleInputChange("standard_selling_price", parseFloat(e.target.value) || 0)}
            placeholder="Your usual selling price"
          />
          {stdPrice > 0 && cost > 0 && (
            <div className={`text-xs mt-1 ${getMarginColor(stdMargin)}`}>
              Margin: {formatPercent(stdMargin)}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="max_selling_price">Max Price</Label>
          <Input
            id="max_selling_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.max_selling_price ?? ""}
            onChange={e => handleInputChange("max_selling_price", parseFloat(e.target.value) || 0)}
            placeholder="Highest price in market"
          />
          {maxPrice > 0 && cost > 0 && (
            <div className={`text-xs mt-1 ${getMarginColor(maxMargin)}`}>
              Margin: {formatPercent(maxMargin)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPricingSection;
