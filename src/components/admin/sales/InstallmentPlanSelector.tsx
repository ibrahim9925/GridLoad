// @ts-nocheck

import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CreditCard } from "lucide-react";

interface InstallmentPlanSelectorProps {
  isInstallment: boolean;
  installmentPlanType: string;
  totalAmount: number;
  onInstallmentToggle: (enabled: boolean) => void;
  onPlanTypeChange: (type: string) => void;
}

const InstallmentPlanSelector = ({
  isInstallment,
  installmentPlanType,
  totalAmount,
  onInstallmentToggle,
  onPlanTypeChange,
}: InstallmentPlanSelectorProps) => {
  const getInstallmentBreakdown = (type: string, total: number) => {
    switch (type) {
      case "30-70":
        return [
          { percentage: 30, amount: total * 0.3 },
          { percentage: 70, amount: total * 0.7 }
        ];
      case "50-25-25":
        return [
          { percentage: 50, amount: total * 0.5 },
          { percentage: 25, amount: total * 0.25 },
          { percentage: 25, amount: total * 0.25 }
        ];
      case "25-25-25-25":
        return [
          { percentage: 25, amount: total * 0.25 },
          { percentage: 25, amount: total * 0.25 },
          { percentage: 25, amount: total * 0.25 },
          { percentage: 25, amount: total * 0.25 }
        ];
      default:
        return [];
    }
  };

  const breakdown = installmentPlanType && installmentPlanType !== "custom" 
    ? getInstallmentBreakdown(installmentPlanType, totalAmount) 
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Plans
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="installment-toggle">Enable Installment Payment</Label>
            <p className="text-sm text-muted-foreground">
              Split payment into multiple installments
            </p>
          </div>
          <Switch
            id="installment-toggle"
            checked={isInstallment}
            onCheckedChange={onInstallmentToggle}
          />
        </div>

        {isInstallment && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Installment Plan Type</Label>
              <Select value={installmentPlanType} onValueChange={onPlanTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select installment plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30-70">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      30% - 70% (2 installments)
                    </div>
                  </SelectItem>
                  <SelectItem value="50-25-25">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      50% - 25% - 25% (3 installments)
                    </div>
                  </SelectItem>
                  <SelectItem value="25-25-25-25">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      25% - 25% - 25% - 25% (4 installments)
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Custom Plan
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {breakdown.length > 0 && (
              <div className="border rounded-lg p-3 bg-muted/50">
                <h4 className="font-medium mb-2">Payment Breakdown</h4>
                <div className="space-y-2">
                  {breakdown.map((installment, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>Installment {index + 1} ({installment.percentage}%)</span>
                      <span className="font-medium">${(Number(installment.amount) || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${(Number(totalAmount) || 0).toFixed(2)}</span>
                </div>
              </div>
            )}

            {installmentPlanType === "custom" && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Custom installment schedules can be configured after the sale is created.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InstallmentPlanSelector;
