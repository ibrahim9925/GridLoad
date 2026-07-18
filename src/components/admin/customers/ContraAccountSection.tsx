// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNIS } from "@/utils/formatters";

interface Props {
  customerId: string;
  onPosted?: () => void;
}

const ContraAccountSection: React.FC<Props> = ({ customerId, onPosted }) => {
  const { toast } = useToast();
  const [link, setLink] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: matchData } = await (supabase as any).rpc("find_supplier_for_customer", { p_customer_id: customerId });
      const match = Array.isArray(matchData) && matchData.length ? matchData[0] : null;
      setLink(match);
      if (match?.supplier_id) {
        const { data } = await (supabase as any).rpc("get_contra_balance", {
          p_customer_id: customerId,
          p_supplier_id: match.supplier_id,
        });
        setBalance(data);
        setAmount(String(data?.max_contra_offset_nis ?? ""));
      } else {
        setBalance(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (customerId) load(); }, [customerId]);

  const post = async () => {
    if (!link?.supplier_id) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ variant: "destructive", title: "Enter a valid amount" });
      return;
    }
    setPosting(true);
    try {
      const { error } = await (supabase as any).rpc("create_contra_entry", {
        p_customer_id: customerId,
        p_supplier_id: link.supplier_id,
        p_amount_nis: amt,
        p_notes: `Contra offset ${formatNIS(amt)}`,
      });
      if (error) throw error;
      toast({ title: "Contra entry posted", description: `${formatNIS(amt)} offset both balances.` });
      await load();
      onPosted?.();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setPosting(false);
    }
  };

  if (loading) return null;
  if (!link) return null;

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowLeftRight className="h-4 w-4" />
          Contra Account
          <Badge variant="outline" className="ml-2 text-[10px]">
            <Link2 className="h-3 w-3 mr-1" />
            Linked to supplier: {link.supplier_name} ({link.match_field})
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {balance && (
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-muted rounded p-2">
              <div className="text-[10px] text-muted-foreground uppercase">Customer Owes Us</div>
              <div className="font-bold">{formatNIS(balance.customer_outstanding_nis)}</div>
            </div>
            <div className="bg-muted rounded p-2">
              <div className="text-[10px] text-muted-foreground uppercase">We Owe Supplier</div>
              <div className="font-bold">{formatNIS(balance.supplier_outstanding_nis)}</div>
            </div>
            <div className="bg-primary/10 rounded p-2">
              <div className="text-[10px] text-muted-foreground uppercase">Net Balance</div>
              <div className={`font-bold ${balance.net_balance_nis >= 0 ? "text-destructive" : "text-green-600"}`}>
                {formatNIS(balance.net_balance_nis)}
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Offset amount (NIS)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              max={balance?.max_contra_offset_nis ?? undefined}
            />
            {balance && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Max: {formatNIS(balance.max_contra_offset_nis)}
              </p>
            )}
          </div>
          <Button onClick={post} disabled={posting || !Number(amount)}>
            <ArrowLeftRight className="h-4 w-4 mr-1" />
            {posting ? "Posting…" : "Post Contra Entry"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContraAccountSection;
