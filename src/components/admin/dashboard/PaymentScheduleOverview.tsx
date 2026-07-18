// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentScheduleItem {
  id: string;
  sale_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: string;
  customer_name: string;
  invoice_number: string;
}

const PaymentScheduleOverview = () => {
  const [upcomingPayments, setUpcomingPayments] = useState<PaymentScheduleItem[]>([]);
  const [overduePayments, setOverduePayments] = useState<PaymentScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentSchedules();
  }, []);

  const fetchPaymentSchedules = async () => {
    try {
      setIsLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Fetch upcoming payments (next 7 days)
      const { data: upcomingData, error: upcomingError } = await supabase
        .from("payment_schedules")
        .select(`
          *,
          sale:sales(
            invoice_number,
            customer:customers(contact_person, company_name)
          )
        `)
        .eq("status", "pending")
        .gte("due_date", today)
        .lte("due_date", nextWeek)
        .order("due_date")
        .limit(5);

      if (upcomingError) throw upcomingError;

      // Fetch overdue payments
      const { data: overdueData, error: overdueError } = await supabase
        .from("payment_schedules")
        .select(`
          *,
          sale:sales(
            invoice_number,
            customer:customers(contact_person, company_name)
          )
        `)
        .eq("status", "overdue")
        .order("due_date")
        .limit(5);

      if (overdueError) throw overdueError;

      // Transform data
      const transformData = (data: any[]) => 
        data.map((item: any) => ({
          id: item.id,
          sale_id: item.sale_id,
          installment_number: item.installment_number,
          due_date: item.due_date,
          amount: item.amount,
          status: item.status,
          customer_name: item.sale?.customer?.contact_person || "Unknown",
          invoice_number: item.sale?.invoice_number || `SALE-${item.sale_id?.slice(0, 8)}`,
        }));

      setUpcomingPayments(transformData(upcomingData || []));
      setOverduePayments(transformData(overdueData || []));

    } catch (error) {
      console.error("Error fetching payment schedules:", error);
      toast({
        variant: "destructive",
        title: "Error loading payment schedules",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "paid":
        return <Badge variant="default">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-3 bg-muted rounded" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-3 bg-muted rounded" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Upcoming Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Upcoming Payments (Next 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming payments</p>
          ) : (
            upcomingPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-2 border rounded">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{payment.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.invoice_number} • Installment #{payment.installment_number}
                  </p>
                  <p className="text-xs text-muted-foreground">Due: {payment.due_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${payment.amount.toFixed(2)}</p>
                  {getStatusBadge(payment.status)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Overdue Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Overdue Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {overduePayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overdue payments</p>
          ) : (
            overduePayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-2 border rounded border-red-200">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{payment.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.invoice_number} • Installment #{payment.installment_number}
                  </p>
                  <p className="text-xs text-red-600">Overdue: {payment.due_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">${payment.amount.toFixed(2)}</p>
                  {getStatusBadge(payment.status)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentScheduleOverview;