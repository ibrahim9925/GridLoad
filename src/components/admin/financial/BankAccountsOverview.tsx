// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Building2, Wallet, ArrowRightLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InternalTransferDialog } from "./InternalTransferDialog";

interface Account {
  id: string;
  bank_name: string;
  account_name: string;
  nickname: string;
  currency: string;
  native_balance: number;
  nis_equivalent: number;
}

export const BankAccountsOverview: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const fetchPosition = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_bank_position");
      if (error) throw error;
      const payload = (data as any) || { accounts: [], grand_total_nis: 0 };
      setAccounts(payload.accounts || []);
      setGrandTotal(Number(payload.grand_total_nis || 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosition(); }, []);

  const groups = useMemo(() => {
    const map: Record<string, Account[]> = {};
    accounts.forEach((a) => {
      const k = a.bank_name || "Other";
      (map[k] ||= []).push(a);
    });
    return map;
  }, [accounts]);

  const toggle = (k: string) => setOpenGroups((p) => ({ ...p, [k]: !(p[k] ?? true) }));

  return (
    <div className="space-y-4">
      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-background">
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Total Position (NIS Equivalent)</div>
            <div className="text-4xl font-bold">
              ₪ {grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Across {accounts.length} accounts (banks + cash drawer)
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchPosition} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" /> Internal Transfer
            </Button>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groups).map(([bank, list]) => {
        const isOpen = openGroups[bank] ?? true;
        const bankTotalNis = list.reduce((s, a) => s + Number(a.nis_equivalent || 0), 0);
        const Icon = bank === "Cash Drawer" ? Wallet : Building2;
        return (
          <Card key={bank}>
            <Collapsible open={isOpen} onOpenChange={() => toggle(bank)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5" />
                    {bank}
                    <Badge variant="secondary">{list.length}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">
                      ₪ {bankTotalNis.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((a) => (
                    <div key={a.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{a.nickname || a.account_name}</div>
                        <Badge variant="outline">{a.currency}</Badge>
                      </div>
                      <div className="mt-2 text-2xl font-semibold">
                        {Number(a.native_balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        <span className="ml-1 text-sm text-muted-foreground">{a.currency}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ≈ ₪ {Number(a.nis_equivalent).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      <InternalTransferDialog open={transferOpen} onOpenChange={setTransferOpen} onSuccess={fetchPosition} />
    </div>
  );
};

export default BankAccountsOverview;
