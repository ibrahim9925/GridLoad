// @ts-nocheck

import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Percent, DollarSign } from "lucide-react";

interface DiscountSelectorProps {
  discountType: string;
  discountPercentage: number;
  discountAmount: number;
  subtotalBeforeDiscount: number;
  customerDefaultDiscount?: number;
  onDiscountTypeChange: (type: string) => void;
  onDiscountPercentageChange: (percentage: number) => void;
  onDiscountAmountChange: (amount: number) => void;
  onApplyCustomerDiscount: () => void;
}

const DiscountSelector = ({
  discountType,
  discountPercentage,
  discountAmount,
  subtotalBeforeDiscount,
  customerDefaultDiscount = 0,
  onDiscountTypeChange,
  onDiscountPercentageChange,
  onDiscountAmountChange,
  onApplyCustomerDiscount,
}: DiscountSelectorProps) => {
  const calculateDiscountAmount = () => {
    if (discountType === "percentage") {
      return (subtotalBeforeDiscount * discountPercentage) / 100;
    }
    return discountAmount;
  };

  const finalDiscountAmount = calculateDiscountAmount();
  const subtotalAfterDiscount = subtotalBeforeDiscount - finalDiscountAmount;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Discount Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {customerDefaultDiscount > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Customer Default Discount
                </p>
                <p className="text-xs text-blue-600">
                  This customer has a {customerDefaultDiscount}% default discount
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{customerDefaultDiscount}%</Badge>
                <button
                  type="button"
                  onClick={onApplyCustomerDiscount}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Discount Type</Label>
            <Select value={discountType} onValueChange={onDiscountTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Percentage
                  </div>
                </SelectItem>
                <SelectItem value="fixed">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fixed Amount
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {discountType === "percentage" ? (
            <div className="space-y-2">
              <Label>Discount Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={discountPercentage}
                onChange={(e) => onDiscountPercentageChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Discount Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => onDiscountAmountChange(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          )}
        </div>

        {finalDiscountAmount > 0 && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal before discount:</span>
              <span>${(Number(subtotalBeforeDiscount) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount applied:</span>
              <span>-${(Number(finalDiscountAmount) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Subtotal after discount:</span>
              <span>${(Number(subtotalAfterDiscount) || 0).toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscountSelector;
