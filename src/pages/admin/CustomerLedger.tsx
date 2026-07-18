// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User, Wallet, Receipt, ShieldCheck, Wrench, AlertTriangle, Copy, FileDown, Edit, TrendingUp, TrendingDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNIS, formatWithOriginal } from "@/utils/formatters";
import { useOverdueByCustomer } from "@/hooks/useOverdueData";
import MobileDetailHeader from "@/components/admin/mobile/MobileDetailHeader";
import MobileSection from "@/components/admin/mobile/MobileSection";
import CustomerStatementDialog from "@/components/admin/customers/CustomerStatementDialog";
import ContraAccountSection from "@/components/admin/customers/ContraAccountSection";
import BulkPaymentDialog from "@/components/admin/customers/BulkPaymentDialog";
import { Wallet as WalletIcon } from "lucide-react";
import jsPDF from "jspdf";

type LedgerEntry = {
  entry_type: "sale" | "payment";
  entry_date: string;
  reference: string;
  debit_nis: number;
  credit_nis: number;
  running_balance_nis: number;
  original_amount: number | null;
  original_currency: string | null;
  entry_id: string;
};

const CustomerLedger = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<any>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [balance, setBalance] = useState({ total_invoiced_nis: 0, total_paid_nis: 0, outstanding_nis: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showStatement, setShowStatement] = useState(false);
  const [showBulkPay, setShowBulkPay] = useState(false);
  const { byCustomer: overdueByCustomer } = useOverdueByCustomer();
  const overdue = id ? overdueByCustomer.get(id) : undefined;

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const lastPayment = (() => {
    const payments = ledger.filter((e) => e.entry_type === "payment");
    return payments.length ? payments[payments.length - 1] : null;
  })();

  const copyWhatsAppReminder = async () => {
    if (!customer || !overdue) return;
    const message = `السلام عليكم ${customer.contact_person}، نود تذكيركم بوجود مبلغ مستحق بقيمة ${Math.round(overdue.total)} شيكل منذ ${overdue.oldestDays} يوم. نرجو التواصل معنا لترتيب السداد. شكراً - GridLoad`;
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: "Copied", description: "WhatsApp reminder copied to clipboard." });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: message });
    }
  };

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [custRes, ledgerRes, balanceRes, warrRes, instRes] = await Promise.all([
        supabase.from("customers").select("*").eq("id", id).single(),
        (supabase as any).rpc("get_customer_ledger", { p_customer_id: id }),
        (supabase as any).rpc("get_customer_balance", { p_customer_id: id }),
        supabase.from("warranties").select("id, serial_number, product_name, expires_at, status").eq("customer_id", id).limit(20),
        supabase.from("installations").select("id, installation_date, status, address").eq("customer_id", id).limit(20),
      ]);
      if (custRes.error) throw custRes.error;
      setCustomer(custRes.data);
      setLedger((ledgerRes.data || []) as LedgerEntry[]);
      setBalance(balanceRes.data || { total_invoiced_nis: 0, total_paid_nis: 0, outstanding_nis: 0 });
      setWarranties(warrRes.data || []);
      setInstallations(instRes.data || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to load customer data." });
    } finally {
      setIsLoading(false);
    }
  };

  const totalSales = Number(balance.total_invoiced_nis || 0);
  const totalPaid = Number(balance.total_paid_nis || 0);
  const totalOwed = Number(balance.outstanding_nis || 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Customer Ledger — ${customer?.contact_person}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Company: ${customer?.company_name || "—"}`, 14, 28);
    doc.text(`Total Sales: ${formatNIS(totalSales)} | Paid: ${formatNIS(totalPaid)} | Outstanding: ${formatNIS(totalOwed)}`, 14, 35);
    let y = 45;
    doc.setFontSize(9);
    doc.text("Date", 14, y); doc.text("Type", 50, y); doc.text("Ref", 75, y); doc.text("Amount", 120, y); doc.text("Balance", 155, y);
    y += 5; doc.line(14, y, 196, y); y += 5;
    ledger.forEach((e) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(e.entry_date ? new Date(e.entry_date).toLocaleDateString() : "—", 14, y);
      doc.text(e.entry_type === "sale" ? "SALE" : "PAYMENT", 50, y);
      doc.text(String(e.reference), 75, y);
      const amt = e.entry_type === "sale" ? e.debit_nis : e.credit_nis;
      doc.text((e.entry_type === "sale" ? "+" : "-") + formatNIS(amt), 120, y);
      doc.text(formatNIS(e.running_balance_nis), 155, y);
      y += 7;
    });
    doc.save(`Ledger-${customer?.contact_person || "customer"}.pdf`);
    toast({ title: "PDF exported" });
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  if (!customer) return <div className="p-6 text-destructive">Customer not found.</div>;

  return (
    <div className="pb-24">
      <MobileDetailHeader
        title={customer.contact_person || "Customer"}
        subtitle={customer.company_name || "Individual"}
        backTo="/admin/customers"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowStatement(true)} className="h-10 px-3">
              <FileDown className="h-4 w-4 mr-1" />Statement
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/admin/customers?edit=${customer.id}`)}
              className="h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Edit className="h-4 w-4 mr-1" />Edit
            </Button>
          </div>
        }
      />

      <CustomerStatementDialog
        open={showStatement}
        onClose={() => setShowStatement(false)}
        customer={customer}
        overdueAmount={overdue?.total}
        overdueDays={overdue?.oldestDays}
      />

      <div className="p-3 space-y-3">
        {overdue && (
          <Card className="border-2 border-destructive bg-destructive/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-7 w-7 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-destructive">OVERDUE — {formatNIS(overdue.total)}</div>
                  <div className="text-xs text-foreground/80 mt-1 space-y-0.5">
                    <div>{overdue.oldestDays} days overdue · {overdue.count} invoice{overdue.count === 1 ? "" : "s"}</div>
                    <div>Terms: {customer.payment_terms_days} days from invoice</div>
                    {lastPayment && (
                      <div>Last payment: {formatNIS(lastPayment.credit_nis)} on {new Date(lastPayment.entry_date).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              </div>
              <Button onClick={copyWhatsAppReminder} className="w-full h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <Copy className="h-4 w-4 mr-2" />Copy WhatsApp Reminder
              </Button>
            </CardContent>
          </Card>
        )}

        <MobileSection icon={User} title="Profile" subtitle={`${customer.email || "no email"} · ${customer.phone || "no phone"}`} defaultOpen>
          <div className="pt-2 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{customer.email || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{customer.phone || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{customer.customer_type || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Terms</span><span>{customer.payment_terms_days != null ? `${customer.payment_terms_days} days` : "Not tracked"}</span></div>
            <Button variant="outline" className="w-full h-12 mt-2" onClick={() => navigate(`/admin/customers?edit=${customer.id}`)}>
              <Edit className="h-4 w-4 mr-2" />Edit Customer
            </Button>
          </div>
        </MobileSection>

        <MobileSection icon={Wallet} title="Outstanding Balance" subtitle={`${formatNIS(totalOwed)} owed`} defaultOpen>
          <div className="pt-2 grid grid-cols-3 gap-2">
            <div className="bg-muted rounded p-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase"><Receipt className="h-3 w-3" />Sales</div>
              <div className="text-base font-bold mt-1">{formatNIS(totalSales)}</div>
            </div>
            <div className="bg-muted rounded p-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase"><TrendingUp className="h-3 w-3 text-green-600" />Paid</div>
              <div className="text-base font-bold mt-1 text-green-600">{formatNIS(totalPaid)}</div>
            </div>
            <div className="bg-muted rounded p-3">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase"><TrendingDown className="h-3 w-3 text-destructive" />Owed</div>
              <div className={`text-base font-bold mt-1 ${totalOwed > 0 ? "text-destructive" : "text-green-600"}`}>{formatNIS(totalOwed)}</div>
            </div>
          </div>
          <Button onClick={() => setShowBulkPay(true)} className="w-full h-12 mt-3">
            <WalletIcon className="h-4 w-4 mr-2" />Record Bulk Payment (auto-allocate)
          </Button>
        </MobileSection>

        <ContraAccountSection customerId={customer.id} onPosted={fetchAll} />

        <BulkPaymentDialog
          open={showBulkPay}
          onClose={() => setShowBulkPay(false)}
          customerId={customer.id}
          customerName={customer.contact_person || customer.company_name}
          onDone={fetchAll}
        />

        <MobileSection icon={Receipt} title="Transaction History" subtitle={`${ledger.length} entries`}>
          <div className="pt-2 space-y-2">
            {ledger.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No transactions yet.</p>
            ) : ledger.map((e) => (
              <div key={e.entry_id} className="border rounded-lg p-3 flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={e.entry_type === "sale" ? "destructive" : "default"} className="text-[10px]">
                      {e.entry_type === "sale" ? "Sale" : "Payment"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{e.entry_date ? new Date(e.entry_date).toLocaleDateString() : "—"}</span>
                  </div>
                  <p className="text-sm font-medium truncate mt-1">{e.reference}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-semibold ${e.entry_type === "sale" ? "text-destructive" : "text-green-600"}`}>
                    {e.entry_type === "sale" ? "+" : "−"}
                    {e.entry_type === "payment" && e.original_currency && e.original_currency !== "NIS"
                      ? formatWithOriginal(e.credit_nis, e.original_amount, e.original_currency)
                      : formatNIS(e.entry_type === "sale" ? e.debit_nis : e.credit_nis)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Bal {formatNIS(Number(e.running_balance_nis))}</div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={exportPDF} className="w-full h-12 mt-2">
              <FileDown className="h-4 w-4 mr-2" />Export PDF
            </Button>
          </div>
        </MobileSection>

        <MobileSection icon={ShieldCheck} title="Warranties" subtitle={`${warranties.length} active`}>
          <div className="pt-2 space-y-2">
            {warranties.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No warranties.</p>
            ) : warranties.map((w) => (
              <div key={w.id} className="border rounded-lg p-3 flex justify-between items-center">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{w.product_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">SN: {w.serial_number}</p>
                </div>
                <Badge variant="outline" className="capitalize">{w.status || "active"}</Badge>
              </div>
            ))}
          </div>
        </MobileSection>

        <MobileSection icon={Wrench} title="Installations" subtitle={`${installations.length} record${installations.length === 1 ? "" : "s"}`}>
          <div className="pt-2 space-y-2">
            {installations.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No installations.</p>
            ) : installations.map((i) => (
              <div key={i.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{i.address || "—"}</p>
                    <p className="text-xs text-muted-foreground">{i.installation_date ? new Date(i.installation_date).toLocaleDateString() : "—"}</p>
                  </div>
                  <Badge variant="outline" className="capitalize shrink-0">{i.status || "—"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </MobileSection>
      </div>
    </div>
  );
};

export default CustomerLedger;
