// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Clock, AlertTriangle, Phone, Mail } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerDebt {
  customer_id: string;
  contact_person: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  totalOwed: number;
  overdueAmount: number;
  lastPaymentDate: string | null;
  saleCount: number;
  oldestUnpaidSale: string | null;
}

interface CustomerDebtSummaryProps {
  limit?: number;
  showActions?: boolean;
}

const CustomerDebtSummary = ({ limit = 10, showActions = true }: CustomerDebtSummaryProps) => {
  const [customerDebts, setCustomerDebts] = useState<CustomerDebt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomerDebts();
  }, []);

  const fetchCustomerDebts = async () => {
    try {
      setIsLoading(true);
      
      // Fetch customers with outstanding balances
      const { data: salesData, error } = await supabase
        .from('sales')
        .select(`
          id,
          customer_id,
          balance_due,
          sale_date,
          total_amount,
          payment_status,
          customers!sales_customer_id_fkey(
            contact_person,
            company_name,
            phone,
            email
          )
        `)
        .gt('balance_due', 0);

      if (error) throw error;

      // Fetch recent payments to determine last payment dates
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('sale_id, payment_date')
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Group by customer and calculate debts
      const customerDebtMap = new Map<string, CustomerDebt>();

      salesData?.forEach((sale: any) => {
        const customerId = sale.customer_id;
        const customer = sale.customers;
        
        if (!customer) return;

        if (!customerDebtMap.has(customerId)) {
          customerDebtMap.set(customerId, {
            customer_id: customerId,
            contact_person: customer.contact_person,
            company_name: customer.company_name,
            phone: customer.phone,
            email: customer.email,
            totalOwed: 0,
            overdueAmount: 0,
            lastPaymentDate: null,
            saleCount: 0,
            oldestUnpaidSale: null
          });
        }

        const debt = customerDebtMap.get(customerId)!;
        debt.totalOwed += sale.balance_due || 0;
        debt.saleCount += 1;

        // Check if sale is overdue (30+ days old)
        const saleDate = new Date(sale.sale_date);
        const daysOld = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld > 30) {
          debt.overdueAmount += sale.balance_due || 0;
        }

        // Track oldest unpaid sale
        if (!debt.oldestUnpaidSale || saleDate < new Date(debt.oldestUnpaidSale)) {
          debt.oldestUnpaidSale = sale.sale_date;
        }

        // Find last payment date for this customer
        const customerPayments = paymentsData?.filter((p: any) => 
          salesData.some((s: any) => s.id === p.sale_id && s.customer_id === customerId)
        );
        
        if (customerPayments && customerPayments.length > 0) {
          const lastPayment = customerPayments.sort((a, b) => 
            new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
          )[0];
          debt.lastPaymentDate = lastPayment.payment_date;
        }
      });

      // Convert to array and sort by total owed (descending)
      const debtArray = Array.from(customerDebtMap.values())
        .sort((a, b) => b.totalOwed - a.totalOwed)
        .slice(0, limit);

      setCustomerDebts(debtArray);
    } catch (error) {
      console.error('Error fetching customer debts:', error);
      toast({
        title: "Error",
        description: "Failed to load customer debt information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDebtStatus = (debt: CustomerDebt) => {
    if (debt.overdueAmount > 0) {
      return { label: 'Overdue', variant: 'destructive' as const };
    }
    if (debt.totalOwed > 0) {
      return { label: 'Outstanding', variant: 'secondary' as const };
    }
    return { label: 'Paid', variant: 'default' as const };
  };

  const getDaysSinceLastPayment = (lastPaymentDate: string | null) => {
    if (!lastPaymentDate) return null;
    const days = Math.floor((Date.now() - new Date(lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const contactCustomer = (customer: CustomerDebt, method: 'phone' | 'email') => {
    if (method === 'phone' && customer.phone) {
      window.open(`tel:${customer.phone}`);
    } else if (method === 'email' && customer.email) {
      const subject = `Payment Reminder - Outstanding Balance $${customer.totalOwed.toFixed(2)}`;
      const body = `Dear ${customer.contact_person},\n\nWe hope this message finds you well. This is a friendly reminder regarding your outstanding balance of $${customer.totalOwed.toFixed(2)}.\n\nPlease contact us to arrange payment or discuss payment options.\n\nThank you for your business.\n\nBest regards`;
      window.open(`mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Outstanding Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Customer Outstanding Balances
        </CardTitle>
      </CardHeader>
      <CardContent>
        {customerDebts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            🎉 All customers have paid their balances!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount Owed</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Payment</TableHead>
                {showActions && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerDebts.map((debt) => {
                const status = getDebtStatus(debt);
                const daysSincePayment = getDaysSinceLastPayment(debt.lastPaymentDate);
                
                return (
                  <TableRow key={debt.customer_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{debt.contact_person}</div>
                        {debt.company_name && (
                          <div className="text-sm text-muted-foreground">{debt.company_name}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {debt.saleCount} sale{debt.saleCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-red-600">
                        ${debt.totalOwed.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {debt.overdueAmount > 0 ? (
                        <div className="font-medium text-red-700 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          ${debt.overdueAmount.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">$0.00</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {debt.lastPaymentDate ? (
                        <div>
                          <div className="text-sm">{new Date(debt.lastPaymentDate).toLocaleDateString()}</div>
                          {daysSincePayment && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {daysSincePayment} days ago
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No payments</span>
                      )}
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <div className="flex gap-1">
                          {debt.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => contactCustomer(debt, 'phone')}
                              title="Call customer"
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                          )}
                          {debt.email && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => contactCustomer(debt, 'email')}
                              title="Email customer"
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerDebtSummary;