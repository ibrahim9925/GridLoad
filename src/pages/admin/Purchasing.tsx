// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, ShoppingCart, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatNIS, formatMoney } from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";
import POMobileDetail from "@/components/admin/purchasing/POMobileDetail";
import { SupplierDialog } from "@/components/admin/purchasing/SupplierDialog";
import LocalPurchaseDialog from "@/components/admin/purchasing/LocalPurchaseDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


const STATUS_VARIANT: Record<string, any> = {
  draft: "secondary",
  ordered: "default",
  in_transit: "outline",
  at_port: "outline",
  received: "default",
  closed: "secondary",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-blue-100 text-blue-800",
  in_transit: "bg-amber-100 text-amber-800",
  at_port: "bg-purple-100 text-purple-800",
  received: "bg-green-100 text-green-800",
  closed: "bg-slate-200 text-slate-800",
};

const CURRENCY_SYMBOL: Record<string, string> = {
  NIS: "₪", USD: "$", EUR: "€", JOD: "JOD ",
};

const Purchasing = () => {
  const { toast } = useToast();
  const [pos, setPOs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [localPurchaseOpen, setLocalPurchaseOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "import" | "local">("all");


  const fetchPOs = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*, suppliers:supplier_id(name)")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Failed to load purchase orders", description: error.message });
    }
    setPOs(data || []);
    setIsLoading(false);
  }, [toast]);

  useEffect(() => { fetchPOs(); }, [fetchPOs]);

  const spendByCurrency = pos.reduce((acc: Record<string, number>, p) => {
    const cur = (p.currency || "NIS").toUpperCase();
    acc[cur] = (acc[cur] || 0) + Number(p.total_amount || 0);
    return acc;
  }, {});
  const stats = {
    total: pos.length,
    pending: pos.filter((p) => ["draft", "ordered", "in_transit", "at_port"].includes(p.status)).length,
    spendByCurrency,
  };

  const filteredPOs = pos.filter(p => typeFilter === "all" ? true : (p.purchase_type || "import") === typeFilter);

  const openNew = () => { setSelectedPO(null); setDetailOpen(true); };
  const openExisting = (po: any) => { setSelectedPO(po); setDetailOpen(true); };


  return (
    <div className="pb-24 sm:pb-6">
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Purchase Orders</h1>
            <p className="text-sm text-muted-foreground">Manage supplier orders & shipments</p>
          </div>
          <Button variant="outline" onClick={() => setSupplierDialogOpen(true)} className="h-12 hidden sm:flex">
            <Plus className="h-4 w-4 mr-2" />Add Supplier
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="p-3">
            <div className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Total</p></div>
            <p className="text-xl font-bold mt-1">{stats.total}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-amber-600" /><p className="text-xs text-muted-foreground">Active</p></div>
            <p className="text-xl font-bold mt-1">{stats.pending}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-blue-600" /><p className="text-xs text-muted-foreground">Spend</p></div>
            <div className="mt-1 space-y-0.5">
              {Object.keys(stats.spendByCurrency).length === 0 ? (
                <p className="text-base font-bold truncate">{formatNIS(0)}</p>
              ) : (
                Object.entries(stats.spendByCurrency).map(([cur, amt]) => (
                  <p key={cur} className="text-xs font-bold truncate">{formatMoney(amt as number, cur)}</p>
                ))
              )}
            </div>
          </CardContent></Card>
        </div>

        {/* Type filter */}
        <Tabs value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="import">Import Orders</TabsTrigger>
            <TabsTrigger value="local">Local Purchases</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Card list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading purchase orders...</p>
            </div>
          ) : filteredPOs.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No orders in this view</p>
            </CardContent></Card>
          ) : (
            filteredPOs.map((po) => {
              const symbol = CURRENCY_SYMBOL[po.currency] || "";
              return (
                <button
                  key={po.id}
                  onClick={() => openExisting(po)}
                  className="w-full text-left"
                >
                  <Card className="hover:bg-muted/40 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{po.suppliers?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {po.order_number || po.id.slice(0, 8)}
                            {po.purchase_type === "local" && <span className="ml-2 text-[10px] uppercase bg-secondary px-1 rounded">local</span>}
                          </p>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${STATUS_COLOR[po.status] || "bg-muted"}`}>
                          {(po.status || "draft").replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                          <p className="text-lg font-bold">{symbol}{(po.total_amount || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase">Created</p>
                          <p className="text-xs">{new Date(po.created_at).toLocaleDateString()}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground self-center" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })
          )}
        </div>

      </div>

      {/* Floating action buttons */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-30 pb-[env(safe-area-inset-bottom)] grid grid-cols-2 gap-2 sm:flex">
        <Button
          variant="outline"
          onClick={() => setLocalPurchaseOpen(true)}
          className="h-14 px-4 text-sm font-semibold shadow-lg"
        >
          <ShoppingCart className="h-5 w-5 mr-2" />Local Purchase
        </Button>
        <Button
          onClick={openNew}
          className="h-14 px-4 text-sm font-semibold shadow-lg shadow-primary/30"
        >
          <Plus className="h-5 w-5 mr-2" />New Import Order
        </Button>
      </div>


      <POMobileDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        existingPO={selectedPO}
        onChanged={fetchPOs}
      />
      <SupplierDialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen} />
      <LocalPurchaseDialog open={localPurchaseOpen} onOpenChange={setLocalPurchaseOpen} onSaved={fetchPOs} />
    </div>

  );
};

export default Purchasing;
