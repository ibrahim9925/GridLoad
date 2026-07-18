// @ts-nocheck

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

const units = [
  "pcs",
  "kg",
  "m",
  "m²",
  "set",
  "box",
  "roll"
];

const ProductInventorySection: React.FC<Props> = ({ formData, handleInputChange }) => (
  <div className="grid grid-cols-3 gap-4">
    <div className="space-y-2">
      <Label htmlFor="cost_price">Cost Price</Label>
      <Input
        id="cost_price"
        type="number"
        step="0.01"
        min="0"
        value={formData.cost_price || ""}
        onChange={(e) => handleInputChange("cost_price", parseFloat(e.target.value) || 0)}
        placeholder="0.00"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="unit">Unit</Label>
      <Select 
        value={formData.unit || "pcs"} 
        onValueChange={(value) => handleInputChange("unit", value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {units.map((unit) => (
            <SelectItem key={unit} value={unit}>
              {unit}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="moq">MOQ</Label>
      <Input
        id="moq"
        type="number"
        min="0"
        value={formData.moq || ""}
        onChange={(e) => handleInputChange("moq", parseInt(e.target.value) || 0)}
        placeholder="Enter MOQ"
      />
    </div>
  </div>
);

export default ProductInventorySection;
