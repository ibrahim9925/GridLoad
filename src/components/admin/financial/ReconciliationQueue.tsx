// @ts-nocheck
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PendingReconciliationRow {
  id: string;
  purchase_order_id: string | null;
  po_number: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  amount: number | null;
  currency: string | null;
  nis_equivalent: number | null;
  payment_date: string | null;
  payment_method: string | null;
  reference_number: string | null;
}

interface Props {
  onCountChange?: (count: number) => void;
}

export const ReconciliationQueue: React.FC<Props> = ({ onCountChange }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<PendingReconciliationRow[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: pending, error: pErr }, { data: accs, error: aErr }] =
        await Promise.all([
          supabase.rpc("get_pending_reconciliation"),
          supabase
            .from("bank_accounts")
            .select("id, name, currency, bank_name")
            .eq("is_active", true)
            .order("name"),
        ]);
      if (pErr) throw pErr;
      if (aErr) throw aErr;
      const list = (pending || []) as PendingReconciliationRow[];
      setRows(list);
      setAccounts(accs || []);
      onCountChange?.(list.length);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Failed to load reconciliation queue",
        description: e.message,
      });
    } finally {
      setLoading(false);
    }
  }, [onCountChange, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assign = async (paymentId: string) => {
    const bankId = assignments[paymentId];
    if (!bankId) {
      toast({
        variant: "destructive",
        title: "Bank account required",
        description: "Select a bank account before assigning.",
      });
      return;
    }
    setSavingId(paymentId);
    try {
      const { error } = await supabase
        .from("po_payments_out")
        .update({ bank_account_id: bankId })
        .eq("id", paymentId);
      if (error) throw error;
      toast({
        title: "Payment reconciled",
        description: "Bank ledger and balance updated.",
      });
      setAssignments((prev) => {
        const n = { ...prev };
        delete n[paymentId];
        return n;
      });
      await fetchData();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Reconciliation failed",
        description: e.message,
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Reconciliation Queue
          <Badge variant={rows.length ? "destructive" : "secondary"}>
            {rows.length}
          </Badge>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <CheckCircle2 className="h-4 w-4 text-success" />
            All supplier payments are reconciled.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.supplier_name || "—"}</TableCell>
                  <TableCell>{r.po_number || "—"}</TableCell>
                  <TableCell>
                    {r.payment_date
                      ? new Date(r.payment_date).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(r.amount ?? 0).toLocaleString()}{" "}
                    {r.currency || ""}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={assignments[r.id] || ""}
                      onValueChange={(v) =>
                        setAssignments((prev) => ({ ...prev, [r.id]: v }))
                      }
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                            {a.bank_name ? ` · ${a.bank_name}` : ""} ({a.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => assign(r.id)}
                      disabled={savingId === r.id || !assignments[r.id]}
                    >
                      {savingId === r.id ? "Assigning…" : "Assign"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ReconciliationQueue;
