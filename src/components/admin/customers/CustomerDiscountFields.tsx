// @ts-nocheck

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Percent } from "lucide-react";

interface CustomerDiscountFieldsProps {
  defaultDiscountPercentage: number;
  onDiscountChange: (discount: number) => void;
}

const CustomerDiscountFields = ({
  defaultDiscountPercentage,
  onDiscountChange,
}: CustomerDiscountFieldsProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Percent className="h-4 w-4" />
          Default Discount Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="default_discount">Default Discount Percentage (%)</Label>
          <Input
            id="default_discount"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={defaultDiscountPercentage}
            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            This discount will be suggested automatically for new sales with this customer
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerDiscountFields;
