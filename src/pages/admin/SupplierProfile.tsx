// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Wallet, FileText, CreditCard, Edit } from "lucide-react";
import { formatNIS } from "@/utils/formatters";
import MobileDetailHeader from "@/components/admin/mobile/MobileDetailHeader";
import MobileSection from "@/components/admin/mobile/MobileSection";

export default function SupplierProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [pos, setPos] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [balance, setBalance] = useState({ total_ordered_nis: 0, total_paid_nis: 0, outstanding_nis: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [sRes, pRes, bRes] = await Promise.all([
        supabase.from("suppliers").select("*").eq("id", id).maybeSingle(),
        supabase.from("purchase_orders").select("*").eq("supplier_id", id).order("order_date", { ascending: false }),
        (supabase as any).rpc("get_supplier_balance", { p_supplier_id: id }),
      ]);
      if (sRes.error) toast({ variant: "destructive", title: "Load failed", description: sRes.error.message });
      setSupplier(sRes.data);
      const poList = pRes.data ?? [];
      setPos(poList);
      if (!bRes.error && bRes.data) setBalance(bRes.data);
      if (poList.length > 0) {
        const { data: payData } = await supabase
          .from("po_payments_out")
          .select("*")
          .in("purchase_order_id", poList.map((p: any) => p.id))
          .order("payment_date", { ascending: false });
        setPayments(payData ?? []);
      }
      setLoading(false);
    })();
  }, [id, toast]);

  const totalOrdered = Number(balance.total_ordered_nis || 0);
  const totalPaid = Number(balance.total_paid_nis || 0);
  const outstanding = Number(balance.outstanding_nis || 0);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!supplier) return <div className="p-6">Supplier not found.</div>;

  return (
    <div className="pb-24">
      <MobileDetailHeader
        title={supplier.name ?? "Supplier"}
        subtitle={supplier.country ?? "—"}
        backTo="/admin/suppliers"
        action={
          <Button
            size="sm"
            onClick={() => navigate(`/admin/suppliers?edit=${supplier.id}`)}
            className="h-10 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Edit className="h-4 w-4 mr-1" />Edit
          </Button>
        }
      />

      <div className="p-3 space-y-3">
        <MobileSection icon={Building2} title="Profile" subtitle={`${supplier.contact_person || "—"} · ${supplier.is_active ? "Active" : "Inactive"}`} defaultOpen>
          <div className="pt-2 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="truncate ml-2">{supplier.email ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{supplier.phone ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span>{supplier.country ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Terms</span><span>{supplier.payment_terms ?? "—"}</span></div>
            <Badge className="mt-1" variant={supplier.is_active ? "default" : "secondary"}>
              {supplier.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </MobileSection>

        <MobileSection icon={Wallet} title="Balance Summary" subtitle={`${formatNIS(outstanding)} outstanding`} defaultOpen>
          <div className="pt-2 grid grid-cols-3 gap-2">
            <div className="bg-muted rounded p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Ordered</p>
              <p className="text-base font-bold mt-1">{formatNIS(totalOrdered)}</p>
            </div>
            <div className="bg-muted rounded p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Paid</p>
              <p className="text-base font-bold mt-1 text-green-600">{formatNIS(totalPaid)}</p>
            </div>
            <div className="bg-muted rounded p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Owed</p>
              <p className={`text-base font-bold mt-1 ${outstanding > 0 ? "text-destructive" : "text-green-600"}`}>{formatNIS(outstanding)}</p>
            </div>
          </div>
        </MobileSection>

        <MobileSection icon={FileText} title="Purchase Orders" subtitle={`${pos.length} PO${pos.length === 1 ? "" : "s"}`}>
          <div className="pt-2 space-y-2">
            {pos.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No purchase orders.</p>
            ) : pos.map((p) => (
              <div key={p.id} className="border rounded-lg p-3 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{p.order_number ?? p.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{p.order_date ? new Date(p.order_date).toLocaleDateString() : "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{Number(p.total_amount ?? 0).toLocaleString()} {p.currency}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">{p.status ?? "—"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </MobileSection>

        <MobileSection icon={CreditCard} title="Payments Made" subtitle={`${payments.length} payment${payments.length === 1 ? "" : "s"}`}>
          <div className="pt-2 space-y-2">
            {payments.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No payments recorded.</p>
            ) : payments.map((p) => {
              const po = pos.find((x) => x.id === p.purchase_order_id);
              return (
                <div key={p.id} className="border rounded-lg p-3 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{po?.order_number ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"} · {p.payment_method ?? "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{Number(p.amount ?? 0).toLocaleString()} {p.original_currency}</p>
                    <p className="text-[10px] text-muted-foreground">≈ {formatNIS(Number(p.nis_equivalent ?? 0))}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </MobileSection>
      </div>
    </div>
  );
}
