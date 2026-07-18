// @ts-nocheck
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WarrantyDialog from "../warranties/WarrantyDialog";

interface SaleFormFieldsProps {
  formData: {
    payment_status: string;
    sale_date: Date;
    notes: string;
    total_amount: string;
    tax_rate?: number;
    delivery_charges?: number;
  };
  onInputChange: (field: string, value: any) => void;
  hideProductFields?: boolean;
}
const SaleFormFields = ({ 
  formData, 
  onInputChange,
  hideProductFields = false
}: SaleFormFieldsProps) => {
  return (
    <div className="space-y-6">
      {/* Payment Status */}
      <div>
        <Label htmlFor="payment_status">Payment Status</Label>
        <Select
          value={formData.payment_status}
          onValueChange={(value) => onInputChange("payment_status", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial_paid">Partial Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="installment_active">Installment Active</SelectItem>
            <SelectItem value="delivered_pending_payment">Delivered - Payment Pending</SelectItem>
            <SelectItem value="delivery_company_owed">Delivery Company Owed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sale Date */}
      <div>
        <Label htmlFor="sale_date">Sale Date</Label>
        <Input
          type="date"
          id="sale_date"
          value={formData.sale_date ? formData.sale_date.toISOString().split('T')[0] : ''}
          onChange={(e) => onInputChange("sale_date", new Date(e.target.value))}
        />
      </div>
      {/* Tax Rate */}
      <div>
        <Label htmlFor="tax_rate">Tax Rate (%)</Label>
        <Input
          type="number"
          id="tax_rate"
          min={0}
          max={100}
          step={0.01}
          value={formData.tax_rate ?? ""}
          onChange={(e) =>
            onInputChange("tax_rate", Math.max(0, Math.min(100, Number(e.target.value))))}
          placeholder="e.g. 5 for 5%"
        />
      </div>
      {/* Delivery Charges */}
      <div>
        <Label htmlFor="delivery_charges">Delivery Charges</Label>
        <Input
          type="number"
          id="delivery_charges"
          min={0}
          step={0.01}
          value={formData.delivery_charges ?? ""}
          onChange={(e) =>
            onInputChange("delivery_charges", Math.max(0, Number(e.target.value)))}
          placeholder="Delivery fee (optional)"
        />
      </div>
      {/* Total Amount (Read-only) */}
      <div>
        <Label htmlFor="total_amount">Total Amount</Label>
        <Input
          type="text"
          id="total_amount"
          value={String(formData.total_amount ?? "")}
          readOnly
          className="bg-gray-50"
        />
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ""}
          onChange={(e) => onInputChange("notes", e.target.value)}
          placeholder="Enter sale notes..."
        />
      </div>
    </div>
  );
};

export default SaleFormFields;
