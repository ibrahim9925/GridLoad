// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Send, Clock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OverduePayment {
  id: string;
  sale_id: string;
  customer_name: string;
  customer_email: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  days_overdue: number;
  last_reminder_sent: string | null;
}

const PaymentReminderSystem = () => {
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [reminderTemplate, setReminderTemplate] = useState("");
  const [autoReminders, setAutoReminders] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState("7");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOverduePayments();
    loadReminderSettings();
  }, []);

  const fetchOverduePayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_schedules")
        .select(`
          *,
          sale:sales(
            invoice_number,
            customer:customers(contact_person, email)
          )
        `)
        .eq("status", "overdue");

      if (error) throw error;

      const formattedData: OverduePayment[] = (data || []).map((item: any) => {
        // Extract last reminder from notes field if it exists
        const lastReminderMatch = item.notes?.match(/Last reminder: (\d{4}-\d{2}-\d{2})/);
        const lastReminderSent = lastReminderMatch ? lastReminderMatch[1] : null;
        
        return {
          id: item.id,
          sale_id: item.sale_id,
          customer_name: item.sale?.customer?.contact_person || "Unknown",
          customer_email: item.sale?.customer?.email || "",
          invoice_number: item.sale?.invoice_number || `SALE-${item.sale_id?.slice(0, 8)}`,
          amount: item.amount,
          due_date: item.due_date,
          days_overdue: Math.ceil((new Date().getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24)),
          last_reminder_sent: lastReminderSent,
        };
      });

      setOverduePayments(formattedData);
    } catch (error) {
      console.error("Error fetching overdue payments:", error);
      toast({
        variant: "destructive",
        title: "Error loading overdue payments",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadReminderSettings = () => {
    const savedTemplate = localStorage.getItem("payment_reminder_template");
    const savedAutoReminders = localStorage.getItem("auto_reminders_enabled");
    const savedFrequency = localStorage.getItem("reminder_frequency");

    if (savedTemplate) setReminderTemplate(savedTemplate);
    else setReminderTemplate(`Dear {customer_name},

This is a friendly reminder that your payment for invoice {invoice_number} in the amount of ${'{amount}'} was due on {due_date}.

Please arrange payment at your earliest convenience to avoid any late fees.

If you have already made this payment, please disregard this notice.

Thank you for your business.

Best regards,
Your Sales Team`);

    setAutoReminders(savedAutoReminders === "true");
    setReminderFrequency(savedFrequency || "7");
  };

  const saveReminderSettings = () => {
    localStorage.setItem("payment_reminder_template", reminderTemplate);
    localStorage.setItem("auto_reminders_enabled", autoReminders.toString());
    localStorage.setItem("reminder_frequency", reminderFrequency);
    
    toast({
      title: "Settings Saved",
      description: "Reminder settings have been saved successfully.",
    });
  };

  const sendReminders = async () => {
    if (selectedPayments.length === 0) {
      toast({
        variant: "destructive",
        title: "No payments selected",
        description: "Please select payments to send reminders for.",
      });
      return;
    }

    setIsSending(true);
    
    try {
      const selectedData = overduePayments.filter(p => selectedPayments.includes(p.id));
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Here you would typically integrate with an email service
      // For now, we'll simulate the reminder sending and log the reminder
      for (const payment of selectedData) {
        const personalizedMessage = reminderTemplate
          .replace('{customer_name}', payment.customer_name)
          .replace('{invoice_number}', payment.invoice_number)
          .replace('{amount}', `$${payment.amount.toFixed(2)}`)
          .replace('{due_date}', new Date(payment.due_date).toLocaleDateString());

        console.log(`Sending reminder to ${payment.customer_email}:`, personalizedMessage);
        
        // Update the notes field with last reminder date
        const currentNotes = overduePayments.find(p => p.id === payment.id)?.last_reminder_sent || '';
        const updatedNotes = `${currentNotes}\nLast reminder: ${currentDate}`.trim();
        
        await supabase
          .from("payment_schedules")
          .update({ notes: updatedNotes })
          .eq("id", payment.id);
      }

      toast({
        title: "Reminders Sent",
        description: `Successfully sent ${selectedPayments.length} payment reminder(s).`,
      });

      setSelectedPayments([]);
      fetchOverduePayments();
    } catch (error) {
      console.error("Error sending reminders:", error);
      toast({
        variant: "destructive",
        title: "Error sending reminders",
        description: "Please try again later.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectPayment = (paymentId: string, checked: boolean) => {
    if (checked) {
      setSelectedPayments(prev => [...prev, paymentId]);
    } else {
      setSelectedPayments(prev => prev.filter(id => id !== paymentId));
    }
  };

  const getDaysOverdueBadge = (days: number) => {
    if (days <= 7) return "secondary";
    if (days <= 30) return "outline";
    return "destructive";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Payment Reminder Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-reminders">Auto Reminders</Label>
              <Switch
                id="auto-reminders"
                checked={autoReminders}
                onCheckedChange={setAutoReminders}
              />
            </div>
            <div className="space-y-2">
              <Label>Reminder Frequency (days)</Label>
              <Select value={reminderFrequency} onValueChange={setReminderFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Every 3 days</SelectItem>
                  <SelectItem value="7">Every 7 days</SelectItem>
                  <SelectItem value="14">Every 14 days</SelectItem>
                  <SelectItem value="30">Every 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Reminder Template</Label>
            <Textarea
              value={reminderTemplate}
              onChange={(e) => setReminderTemplate(e.target.value)}
              rows={8}
              placeholder="Enter your reminder message template..."
            />
            <p className="text-sm text-muted-foreground">
              Use placeholders: {'{customer_name}'}, {'{invoice_number}'}, {'{amount}'}, {'{due_date}'}
            </p>
          </div>
          
          <Button onClick={saveReminderSettings}>
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Overdue Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Overdue Payments ({overduePayments.length})</CardTitle>
          <Button
            onClick={sendReminders}
            disabled={selectedPayments.length === 0 || isSending}
          >
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />
            Send Reminders ({selectedPayments.length})
          </Button>
        </CardHeader>
        <CardContent>
          {overduePayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              No overdue payments found. Great job!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedPayments.length === overduePayments.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPayments(overduePayments.map(p => p.id));
                        } else {
                          setSelectedPayments([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Last Reminder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overduePayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(payment.id)}
                        onChange={(e) => handleSelectPayment(payment.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{payment.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{payment.invoice_number}</TableCell>
                    <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(payment.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={getDaysOverdueBadge(payment.days_overdue)}>
                        {payment.days_overdue} days
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.last_reminder_sent ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(payment.last_reminder_sent).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentReminderSystem;
