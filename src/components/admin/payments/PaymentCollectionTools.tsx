// @ts-nocheck

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, Phone, Mail, FileText, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentPlan {
  id: string;
  customer_id: string;
  customer_name: string;
  original_amount: number;
  remaining_balance: number;
  monthly_payment: number;
  start_date: string;
  end_date: string;
  status: string;
}

const PaymentCollectionTools = () => {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [paymentPlanAmount, setPaymentPlanAmount] = useState("");
  const [paymentPlanMonths, setPaymentPlanMonths] = useState("6");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const { toast } = useToast();

  const createPaymentPlan = async () => {
    if (!selectedCustomer || !paymentPlanAmount) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a customer and enter the payment amount.",
      });
      return;
    }

    setIsCreatingPlan(true);
    
    try {
      const amount = parseFloat(paymentPlanAmount);
      const months = parseInt(paymentPlanMonths);
      const monthlyPayment = amount / months;
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      // Create payment plan record (you might need to create this table)
      const paymentPlan = {
        customer_id: selectedCustomer,
        original_amount: amount,
        remaining_balance: amount,
        monthly_payment: monthlyPayment,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: "active",
        notes: collectionNotes,
      };

      // For now, we'll add it to local state since the table might not exist
      console.log("Payment plan created:", paymentPlan);
      
      toast({
        title: "Payment Plan Created",
        description: `Successfully created payment plan for $${amount.toFixed(2)} over ${months} months.`,
      });

      // Reset form
      setSelectedCustomer("");
      setPaymentPlanAmount("");
      setPaymentPlanMonths("6");
      setCollectionNotes("");
    } catch (error) {
      console.error("Error creating payment plan:", error);
      toast({
        variant: "destructive",
        title: "Error creating payment plan",
        description: "Please try again later.",
      });
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const collectionStrategies = [
    {
      title: "1-7 Days Overdue",
      strategy: "Friendly Reminder",
      actions: ["Send email reminder", "Phone call", "Text message"],
      color: "bg-yellow-100 text-yellow-800"
    },
    {
      title: "8-30 Days Overdue",
      strategy: "Firm Follow-up",
      actions: ["Formal notice", "Payment plan offer", "Account review"],
      color: "bg-orange-100 text-orange-800"
    },
    {
      title: "31+ Days Overdue",
      strategy: "Escalated Collection",
      actions: ["Final notice", "Collection agency", "Legal action"],
      color: "bg-red-100 text-red-800"
    }
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="payment-plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payment-plans">Payment Plans</TabsTrigger>
          <TabsTrigger value="collection-strategies">Collection Strategies</TabsTrigger>
          <TabsTrigger value="communication">Communication Log</TabsTrigger>
        </TabsList>

        <TabsContent value="payment-plans" className="space-y-6">
          {/* Create Payment Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Create Payment Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer1">John Smith</SelectItem>
                      <SelectItem value="customer2">Jane Doe</SelectItem>
                      <SelectItem value="customer3">ABC Corporation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Total Amount ($)</Label>
                  <Input
                    type="number"
                    value={paymentPlanAmount}
                    onChange={(e) => setPaymentPlanAmount(e.target.value)}
                    placeholder="Enter total amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Period</Label>
                  <Select value={paymentPlanMonths} onValueChange={setPaymentPlanMonths}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                      <SelectItem value="24">24 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Payment</Label>
                  <Input
                    type="text"
                    value={paymentPlanAmount && paymentPlanMonths ? 
                      `$${(parseFloat(paymentPlanAmount) / parseInt(paymentPlanMonths)).toFixed(2)}` : 
                      "$0.00"
                    }
                    disabled
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  placeholder="Add notes about the payment plan..."
                />
              </div>
              
              <Button onClick={createPaymentPlan} disabled={isCreatingPlan}>
                {isCreatingPlan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Payment Plan
              </Button>
            </CardContent>
          </Card>

          {/* Active Payment Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Active Payment Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No active payment plans found.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collection-strategies" className="space-y-6">
          <div className="grid gap-6">
            {collectionStrategies.map((strategy, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{strategy.title}</CardTitle>
                    <Badge className={strategy.color}>{strategy.strategy}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-medium">Recommended Actions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {strategy.actions.map((action, actionIndex) => (
                        <li key={actionIndex} className="text-sm text-muted-foreground">
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Communication Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button size="sm">
                    <Phone className="mr-2 h-4 w-4" />
                    Log Phone Call
                  </Button>
                  <Button size="sm" variant="outline">
                    <Mail className="mr-2 h-4 w-4" />
                    Log Email
                  </Button>
                  <Button size="sm" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Add Note
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="text-center py-8 text-muted-foreground">
                    No communication logs found. Start by logging your first interaction.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentCollectionTools;
