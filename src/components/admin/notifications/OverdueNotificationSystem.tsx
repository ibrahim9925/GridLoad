// @ts-nocheck

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Phone, Mail, MessageSquare, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OverduePayment {
  id: string;
  customer_name: string;
  amount: number;
  days_overdue: number;
  sale_date: string;
  last_contact: string | null;
}

interface OverdueNotificationSystemProps {
  overduePayments: OverduePayment[];
  isLoading: boolean;
  onRefresh: () => void;
}

const OverdueNotificationSystem = ({ overduePayments, isLoading, onRefresh }: OverdueNotificationSystemProps) => {
  const [selectedPayment, setSelectedPayment] = useState<OverduePayment | null>(null);
  const [contactNote, setContactNote] = useState("");
  const { toast } = useToast();

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  
  const getPriorityBadge = (daysOverdue: number) => {
    if (daysOverdue >= 60) return <Badge variant="destructive">Critical</Badge>;
    if (daysOverdue >= 30) return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
    if (daysOverdue >= 15) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  const handleSendReminder = async (type: 'email' | 'sms' | 'call', payment: OverduePayment) => {
    // Mock implementation - in real app, integrate with email/SMS services
    console.log(`Sending ${type} reminder for payment ${payment.id}`);
    
    toast({
      title: `${type.toUpperCase()} Reminder Sent`,
      description: `Reminder sent to ${payment.customer_name} for overdue payment of ${formatCurrency(payment.amount)}`,
    });
  };

  const handleLogContact = async () => {
    if (!selectedPayment || !contactNote.trim()) return;

    // Mock implementation - in real app, save to database
    console.log(`Logging contact for payment ${selectedPayment.id}: ${contactNote}`);
    
    toast({
      title: "Contact Logged",
      description: "Contact activity has been recorded successfully.",
    });
    
    setContactNote("");
    setSelectedPayment(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Overdue Payment Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalOverdue = overduePayments.filter(p => p.days_overdue >= 60);
  const totalOverdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdueAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {overduePayments.length} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Cases</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalOverdue.length}</div>
            <p className="text-xs text-muted-foreground">
              60+ days overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overduePayments.length > 0 
                ? Math.round(overduePayments.reduce((sum, p) => sum + p.days_overdue, 0) / overduePayments.length)
                : 0
              }
            </div>
            <p className="text-xs text-muted-foreground">
              days on average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button onClick={onRefresh} variant="outline" size="sm" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Payment Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overduePayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.customer_name}
                  </TableCell>
                  <TableCell className="text-red-600 font-semibold">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {payment.days_overdue} days
                    </Badge>
                  </TableCell>
                  <TableCell>{getPriorityBadge(payment.days_overdue)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.last_contact || 'No contact recorded'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendReminder('email', payment)}
                      >
                        <Mail className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendReminder('sms', payment)}
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendReminder('call', payment)}
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPayment(payment)}
                          >
                            Log
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Log Contact Activity</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Customer: {payment.customer_name}</p>
                              <p className="text-sm text-muted-foreground">Amount: {formatCurrency(payment.amount)}</p>
                            </div>
                            <Textarea
                              placeholder="Enter contact notes..."
                              value={contactNote}
                              onChange={(e) => setContactNote(e.target.value)}
                            />
                            <Button onClick={handleLogContact} className="w-full">
                              Save Contact Log
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverdueNotificationSystem;
