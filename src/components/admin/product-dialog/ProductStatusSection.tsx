// @ts-nocheck

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

const ProductStatusSection: React.FC<Props> = ({ formData, handleInputChange }) => (
  <div className="grid grid-cols-3 gap-4">
    <div className="space-y-2">
      <Label htmlFor="current_stock">Current Stock</Label>
      <Input
        id="current_stock"
        type="number"
        min="0"
        value={formData.current_stock || ""}
        onChange={(e) => handleInputChange("current_stock", parseInt(e.target.value) || 0)}
        placeholder="0"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="max_stock_level">Maximum Stock Level</Label>
      <Input
        id="max_stock_level"
        type="number"
        min="1"
        value={formData.max_stock_level || ""}
        onChange={(e) => handleInputChange("max_stock_level", parseInt(e.target.value) || 100)}
        placeholder="100"
      />
      <p className="text-xs text-muted-foreground">
        Low stock alerts at 20% of this value
      </p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="status">Status</Label>
      <Select 
        value={formData.status || "Active"} 
        onValueChange={(value) => handleInputChange("status", value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Inactive">Inactive</SelectItem>
          <SelectItem value="Discontinued">Discontinued</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

export default ProductStatusSection;
