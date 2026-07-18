// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Package, Users, DollarSign, AlertTriangle, Clock, Shield, ShoppingCart, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardCard from "./DashboardCard";
import { formatNIS, formatNumber } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DashboardStats = () => {
  const [stats, setStats] = useState<any>({});
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [maturingChecks, setMaturingChecks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        salesThisMonth,
        allSales,
        warranties,
        lowStock,
        pendingPOs,
        recentSales,
        recentPayments,
        checkPayments,
      ] = await Promise.all([
        supabase.from("sales").select("total_amount").gte("sale_date", monthStart),
        supabase.from("sales").select("total_amount, balance_due, customer_id, customers:customer_id(contact_person)"),
        supabase.from("warranties").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("products").select("id, name, current_stock, min_stock_level").eq("is_active", true),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }).in("status", ["draft", "ordered", "in_transit"]),
        supabase.from("sales").select("id, sale_number, total_amount, sale_date, customers:customer_id(contact_person)").order("sale_date", { ascending: false }).limit(10),
        supabase.from("payments").select("id, amount, payment_date, payment_method, sale_id").eq("status", "completed").order("payment_date", { ascending: false }).limit(10),
        supabase.from("payments").select("id, amount, method_details, payment_date").eq("payment_method", "check").eq("status", "completed"),
      ]);

      // Revenue this month
      const monthRevenue = (salesThisMonth.data || []).reduce((s, sale) => s + (sale.total_amount || 0), 0);

      // Outstanding
      const outstanding = (allSales.data || []).reduce((s, sale) => s + (sale.balance_due || 0), 0);

      // Low stock
      const lowStockProducts = (lowStock.data || []).filter((p) => p.current_stock <= (p.min_stock_level || 0));

      // Top 5 customers by revenue
      const customerRevenue: Record<string, { name: string; revenue: number }> = {};
      (allSales.data || []).forEach((sale) => {
        const cid = sale.customer_id;
        if (!cid) return;
        if (!customerRevenue[cid]) customerRevenue[cid] = { name: (sale.customers as any)?.contact_person || "Unknown", revenue: 0 };
        customerRevenue[cid].revenue += sale.total_amount || 0;
      });
      const top5 = Object.values(customerRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      // Recent transactions (mixed)
      const mixed = [
        ...(recentSales.data || []).map((s) => ({ type: "sale", date: s.sale_date, amount: s.total_amount, ref: s.sale_number || s.id.slice(0, 8), customer: (s.customers as any)?.contact_person })),
        ...(recentPayments.data || []).map((p) => ({ type: "payment", date: p.payment_date, amount: p.amount, ref: p.payment_method, customer: "" })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

      // Checks maturing in 30 days
      const in30Days = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];
      const maturing = (checkPayments.data || []).filter((p) => {
        const matDate = (p.method_details as any)?.maturity_date || (p.method_details as any)?.check_date;
        return matDate && matDate >= now.toISOString().split("T")[0] && matDate <= in30Days;
      });

      setStats({
        monthRevenue,
        outstanding,
        activeWarranties: warranties.count || 0,
        lowStockCount: lowStockProducts.length,
        pendingPOs: pendingPOs.count || 0,
      });
      setTopCustomers(top5);
      setRecentTx(mixed);
      setMaturingChecks(maturing);
    } catch (error) {
      console.error("Dashboard stats error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <DashboardCard title="Revenue This Month" value={formatNIS(stats.monthRevenue || 0)} icon={DollarSign} color="text-green-600" isLoading={isLoading} />
        <DashboardCard title="Outstanding Balance" value={formatNIS(stats.outstanding || 0)} icon={Clock} color="text-destructive" isLoading={isLoading} />
        <DashboardCard title="Active Warranties" value={formatNumber(stats.activeWarranties || 0)} icon={Shield} color="text-blue-500" isLoading={isLoading} />
        <DashboardCard title="Low Stock" value={formatNumber(stats.lowStockCount || 0)} icon={AlertTriangle} color="text-yellow-500" isLoading={isLoading} />
        <DashboardCard title="Pending POs" value={formatNumber(stats.pendingPOs || 0)} icon={ShoppingCart} color="text-orange-500" isLoading={isLoading} />
      </div>

      {/* Maturing Checks Alert */}
      {maturingChecks.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-yellow-600" />
              Checks Maturing in Next 30 Days ({maturingChecks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {maturingChecks.slice(0, 5).map((c) => (
                <div key={c.id} className="flex justify-between text-sm">
                  <span>Check #{(c.method_details as any)?.check_number || "—"} — {(c.method_details as any)?.maturity_date || (c.method_details as any)?.check_date}</span>
                  <span className="font-medium">{formatNIS(c.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top 5 Customers */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Top 5 Customers by Revenue</CardTitle></CardHeader>
          <CardContent>
            {topCustomers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No sales data yet.</p>
            ) : (
              <div className="space-y-2">
                {topCustomers.map((c, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm">{i + 1}. {c.name}</span>
                    <span className="font-medium text-sm">{formatNIS(c.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent 10 Transactions */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            {recentTx.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent transactions.</p>
            ) : (
              <div className="space-y-2">
                {recentTx.map((tx, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={tx.type === "sale" ? "destructive" : "default"} className="text-xs">
                        {tx.type === "sale" ? "Sale" : "Payment"}
                      </Badge>
                      <span className="text-muted-foreground">{tx.customer || tx.ref}</span>
                    </div>
                    <span className={`font-medium ${tx.type === "payment" ? "text-green-600" : ""}`}>
                      {tx.type === "sale" ? "+" : "-"}{formatNIS(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default DashboardStats;
