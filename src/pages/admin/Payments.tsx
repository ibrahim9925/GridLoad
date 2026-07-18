// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PaymentDialog from "@/components/admin/sales/PaymentDialog";
import { generateInvoicePDF, generatePaymentReceiptPDF } from "@/utils/invoicePDF";

interface PaymentSchedule {
  id: string;
  sale_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: string;
  notes: string;
  created_at: string;
  sale: {
    invoice_number: string;
    customer: {
      contact_person: string;
      company_name: string;
    };
  };
}

const Payments = () => {
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null);
  const { toast } = useToast();

  const fetchPaymentSchedules = async () => {
    try {
      console.log("💰 Payments: Fetching payment schedules...");
      const { data, error } = await supabase
        .from("payment_schedules")
        .select(`
          *,
          sales!payment_schedules_sale_id_fkey (
            invoice_number,
            customers!sales_customer_id_fkey (
              contact_person,
              company_name
            )
          )
        `)
        .order("due_date", { ascending: true });

      if (error) {
        throw error;
      }

      console.log("✅ Payments: Successfully fetched payment schedules");
      
      // Transform data to handle potential null relationships
      const transformedSchedules = (data || []).map(schedule => ({
        ...schedule,
        sale: {
          invoice_number: (schedule.sales as any)?.invoice_number || "",
          customer: (schedule.sales as any)?.customers ? {
            contact_person: (schedule.sales as any).customers.contact_person || "",
            company_name: (schedule.sales as any).customers.company_name || ""
          } : {
            contact_person: "",
            company_name: ""
          }
        }
      })) as unknown as PaymentSchedule[];
      
      setPaymentSchedules(transformedSchedules);
    } catch (error) {
      console.error("❌ Payments: Error fetching payment schedules:", error);
      toast({
        variant: "destructive",
        title: "Error fetching payment schedules",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentCreated = () => {
    fetchPaymentSchedules();
    setShowPaymentDialog(false);
    setSelectedSchedule(null);
  };

  useEffect(() => {
    fetchPaymentSchedules();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Payments</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payments</h1>
        <Button onClick={() => setShowPaymentDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentSchedules.map((schedule) => (
              <div key={schedule.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">
                      {schedule.sale.customer.contact_person}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Invoice: {schedule.sale.invoice_number}
                    </p>
                    <p className="text-sm text-gray-600">
                      Due: {new Date(schedule.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${schedule.amount}</p>
                    <p className="text-sm text-gray-600">{schedule.status}</p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setShowPaymentDialog(true);
                        }}
                      >
                        Pay
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={async () => {
                          const paymentReceiptData = {
                            receiptNumber: `RCP-${schedule.id.slice(0, 8)}`,
                            paymentDate: schedule.due_date,
                            customer: {
                              name: schedule.sale.customer.contact_person,
                              company: schedule.sale.customer.company_name
                            },
                            amount: schedule.amount,
                            paymentMethod: 'cash',
                            forInvoice: schedule.sale.invoice_number
                          };
                          await generatePaymentReceiptPDF(paymentReceiptData);
                        }}
                      >
                        Receipt
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <PaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onPaymentCreated={handlePaymentCreated}
        selectedSchedule={selectedSchedule}
      />
    </div>
  );
};

export default Payments;
