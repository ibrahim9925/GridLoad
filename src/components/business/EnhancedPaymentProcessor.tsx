// @ts-nocheck

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Calculator, CreditCard } from "lucide-react";
import { useEnhancedPaymentCalculations } from "@/hooks/useEnhancedPaymentCalculations";
import { useToast } from "@/hooks/use-toast";

interface PaymentProcessorProps {
  saleId: string;
  totalAmount: number;
  balanceDue: number;
  onPaymentProcessed: () => void;
}

const EnhancedPaymentProcessor: React.FC<PaymentProcessorProps> = ({
  saleId,
  totalAmount,
  balanceDue,
  onPaymentProcessed
}) => {
  const [paymentData, setPaymentData] = useState({
    amount: Math.min(balanceDue, 0),
    payment_method: "cash",
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: "",
    notes: ""
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const { processPayment, calculateSaleTotal } = useEnhancedPaymentCalculations();
  const { toast } = useToast();

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentData.amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Payment amount must be greater than 0",
      });
      return;
    }
    
    if (paymentData.amount > balanceDue) {
      toast({
        variant: "destructive",
        title: "Amount too large",
        description: `Payment cannot exceed balance due of $${balanceDue.toFixed(2)}`,
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await processPayment({
        sale_id: saleId,
        ...paymentData
      });
      
      // Reset form
      setPaymentData({
        amount: 0,
        payment_method: "cash",
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: "",
        notes: ""
      });
      
      onPaymentProcessed();
      
    } catch (error) {
      console.error("Error processing payment:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentStatusBadge = () => {
    const paidPercentage = ((totalAmount - balanceDue) / totalAmount) * 100;
    
    if (balanceDue === 0) {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    } else if (paidPercentage > 0) {
      return <Badge variant="secondary"><Calculator className="h-3 w-3 mr-1" />Partial</Badge>;
    } else {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Process Payment
          </span>
          {getPaymentStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">${totalAmount.toFixed(2)}</div>
            <div className="text-sm text-blue-800">Total Amount</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">${balanceDue.toFixed(2)}</div>
            <div className="text-sm text-orange-800">Balance Due</div>
          </div>
        </div>

        {balanceDue > 0 && (
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  max={balanceDue}
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    payment_date: e.target.value
                  }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select 
                value={paymentData.payment_method} 
                onValueChange={(value) => setPaymentData(prev => ({
                  ...prev,
                  payment_method: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={paymentData.reference_number}
                onChange={(e) => setPaymentData(prev => ({
                  ...prev,
                  reference_number: e.target.value
                }))}
                placeholder="Check number, transaction ID, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                placeholder="Additional payment notes"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing ? "Processing..." : `Process Payment $${paymentData.amount.toFixed(2)}`}
            </Button>
          </form>
        )}

        {balanceDue === 0 && (
          <div className="text-center py-8 text-green-600">
            <CheckCircle className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold">Payment Complete</p>
            <p className="text-sm text-muted-foreground">This sale has been fully paid.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedPaymentProcessor;
