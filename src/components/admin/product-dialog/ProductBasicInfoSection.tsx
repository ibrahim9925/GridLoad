// @ts-nocheck

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

const categories = [
  "Solar Panels",
  "Batteries", 
  "Inverters",
  "Charge Controllers",
  "Mounting Systems",
  "Cables & Accessories",
  "Monitoring Systems",
  "Other"
];

const ProductBasicInfoSection: React.FC<Props> = ({ formData, handleInputChange }) => (
  <>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Product Name *</Label>
        <Input
          id="name"
          value={formData.name || ""}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="Enter product name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          value={formData.sku || ""}
          onChange={(e) => handleInputChange("sku", e.target.value)}
          placeholder="Product SKU/Code"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select 
          value={formData.category || ""} 
          onValueChange={(value) => handleInputChange("category", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier</Label>
        <Input
          id="supplier"
          value={formData.supplier || ""}
          onChange={(e) => handleInputChange("supplier", e.target.value)}
          placeholder="Supplier name"
        />
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="product_type">Product Type</Label>
        <Select
          value={formData.product_type || "other"}
          onValueChange={(value) => handleInputChange("product_type", value)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["inverter","panel","battery","breaker","wire","structure","accessory","other"].map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="brand">Brand</Label>
        <Input
          id="brand"
          value={formData.brand || ""}
          onChange={(e) => handleInputChange("brand", e.target.value)}
          placeholder="e.g. Deye, Jinko"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="warranty_months">Warranty (months — empty = none)</Label>
        <Input
          id="warranty_months"
          type="number"
          min={0}
          value={formData.warranty_months ?? ""}
          onChange={(e) =>
            handleInputChange(
              "warranty_months",
              e.target.value === "" ? null : parseInt(e.target.value) || 0
            )
          }
          placeholder="12"
        />
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="description">Description</Label>
      <Textarea
        id="description"
        value={formData.description || ""}
        onChange={(e) => handleInputChange("description", e.target.value)}
        placeholder="Product description..."
        rows={3}
      />
    </div>
  </>
);

export default ProductBasicInfoSection;
