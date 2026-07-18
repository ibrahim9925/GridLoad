// @ts-nocheck
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Truck, Calendar, DollarSign } from "lucide-react";

interface DeliveryCompanySectionProps {
  isDeliveryCompany: boolean;
  deliveryCompanyName: string;
  deliveryDate: string;
  expectedPaymentDate: string;
  onToggleDeliveryCompany: (enabled: boolean) => void;
  onDeliveryCompanyNameChange: (name: string) => void;
  onDeliveryDateChange: (date: string) => void;
  onExpectedPaymentDateChange: (date: string) => void;
}

const DeliveryCompanySection: React.FC<DeliveryCompanySectionProps> = ({
  isDeliveryCompany,
  deliveryCompanyName,
  deliveryDate,
  expectedPaymentDate,
  onToggleDeliveryCompany,
  onDeliveryCompanyNameChange,
  onDeliveryDateChange,
  onExpectedPaymentDateChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery Company Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="delivery-company"
            checked={isDeliveryCompany}
            onCheckedChange={onToggleDeliveryCompany}
          />
          <Label htmlFor="delivery-company">
            Payment will be handled by delivery company
          </Label>
        </div>

        {isDeliveryCompany && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-company-name">Delivery Company Name</Label>
                <Select value={deliveryCompanyName} onValueChange={onDeliveryCompanyNameChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="express_delivery">Express Delivery Co.</SelectItem>
                    <SelectItem value="fast_logistics">Fast Logistics Ltd.</SelectItem>
                    <SelectItem value="swift_transport">Swift Transport</SelectItem>
                    <SelectItem value="reliable_courier">Reliable Courier Service</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-date" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Delivery Date
                </Label>
                <Input
                  id="delivery-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => onDeliveryDateChange(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected-payment-date" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Expected Payment Date (2-3 working days after delivery)
              </Label>
              <Input
                id="expected-payment-date"
                type="date"
                value={expectedPaymentDate}
                onChange={(e) => onExpectedPaymentDateChange(e.target.value)}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                ℹ️ When using delivery company payment, the sale will be marked as "delivered_pending_payment" 
                and you can settle the payment when it arrives from the delivery company.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryCompanySection;