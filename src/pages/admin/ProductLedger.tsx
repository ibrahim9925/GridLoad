// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowDown, ArrowUp, Package, Wrench } from "lucide-react";
import { formatNIS } from "@/utils/formatters";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const ProductLedger: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [reserved, setReserved] = useState(0);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [p, mv, si, sh, resv] = await Promise.all([
        supabase.from("products").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("stock_movements")
          .select("*")
          .eq("product_id", id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("sale_items")
          .select(
            "id, quantity, unit_price, total, serial_number, created_at, sale:sale_id(id, sale_number, sale_date, payment_status, fulfillment_status, customer:customer_id(name))"
          )
          .eq("product_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("po_shipment_items")
          .select(
            "id, quantity_received, created_at, shipment:shipment_id(id, shipment_number, warehouse_arrival_date, actual_arrival_date, freight_estimate, clearance_estimate, purchase_order:purchase_order_id(order_number, currency)), purchase_order_item:purchase_order_item_id(unit_cost, unit_price)"
          )
          .eq("product_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("sale_items")
          .select("quantity, sale:sale_id!inner(fulfillment_status, status)")
          .eq("product_id", id),
      ]);

      setProduct(p.data);
      setMovements(mv.data || []);
      setSales(si.data || []);
      setShipments(sh.data || []);

      // Reserved = open sales that aren't delivered
      let reservedQty = 0;
      (resv.data || []).forEach((row: any) => {
        const fs = row.sale?.fulfillment_status;
        const st = row.sale?.status;
        const delivered = fs === "delivered" || fs === "completed" || st === "completed";
        const cancelled = st === "cancelled" || st === "void";
        if (!delivered && !cancelled) reservedQty += Number(row.quantity || 0);
      });
      setReserved(reservedQty);

      // Resolve user names
      const userIds = Array.from(
        new Set((mv.data || []).map((m: any) => m.created_by).filter(Boolean))
      );
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => {
          map[p.id] = p.full_name || p.email || "User";
        });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [id]);

  const totals = useMemo(() => {
    const totalIn = movements
      .filter((m) => m.movement_type === "in")
      .reduce((s, m) => s + Number(m.quantity || 0), 0);
    const totalOut = movements
      .filter((m) => m.movement_type === "out")
      .reduce((s, m) => s + Number(m.quantity || 0), 0);
    return { totalIn, totalOut };
  }, [movements]);

  const monthlySales = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = format(d, "yyyy-MM");
      map[k] = 0;
    }
    sales.forEach((s: any) => {
      const dateStr = s.sale?.sale_date || s.created_at;
      if (!dateStr) return;
      const k = format(new Date(dateStr), "yyyy-MM");
      if (k in map) map[k] += Number(s.quantity || 0);
    });
    return Object.entries(map).map(([k, v]) => ({
      month: format(new Date(k + "-01"), "MMM"),
      units: v,
    }));
  }, [sales]);

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading product ledger…</div>;
  }

  if (!product) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <p className="mt-4 text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  const unitCost = product.landed_cost || product.cost_price || 0;
  const stockValue = (product.current_stock || 0) * unitCost;
  const available = (product.current_stock || 0) - reserved;

  const typeBadge = (t: string) => {
    if (t === "in")
      return (
        <Badge className="bg-green-600 hover:bg-green-700">
          <ArrowUp className="h-3 w-3 mr-1" />
          IN
        </Badge>
      );
    if (t === "out")
      return (
        <Badge className="bg-red-600 hover:bg-red-700">
          <ArrowDown className="h-3 w-3 mr-1" />
          OUT
        </Badge>
      );
    return (
      <Badge variant="secondary">
        <Wrench className="h-3 w-3 mr-1" />
        ADJ
      </Badge>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Package className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-lg md:text-2xl font-bold truncate">{product.name}</h1>
            {product.product_type && (
              <Badge variant="secondary" className="capitalize">
                {product.product_type}
              </Badge>
            )}
            {product.brand && <Badge variant="outline">{product.brand}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] md:text-xs text-muted-foreground">Current Stock</p>
            <p className="text-2xl md:text-3xl font-bold">{product.current_stock || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] md:text-xs text-muted-foreground">Unit Cost (landed)</p>
            <p className="text-base md:text-xl font-bold">{formatNIS(unitCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] md:text-xs text-muted-foreground">Sell Price</p>
            <p className="text-base md:text-xl font-bold">
              {formatNIS(product.standard_selling_price || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] md:text-xs text-muted-foreground">Stock Value</p>
            <p className="text-base md:text-xl font-bold">{formatNIS(stockValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
        {[
          { label: "Total Received", value: totals.totalIn, color: "text-green-600" },
          { label: "Total Sold", value: totals.totalOut, color: "text-red-600" },
          { label: "In Stock", value: product.current_stock || 0, color: "" },
          { label: "Reserved", value: reserved, color: "text-orange-600" },
          { label: "Available", value: available, color: "text-blue-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 md:p-4">
              <p className="text-[10px] md:text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl md:text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Sales (last 12 months)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="units" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stock movements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stock Movement History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Mobile cards */}
          <div className="md:hidden divide-y">
            {movements.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No movements yet.</p>
            )}
            {movements.map((m) => (
              <div key={m.id} className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  {typeBadge(m.movement_type)}
                  <span
                    className={`font-bold ${
                      m.movement_type === "out" ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {m.movement_type === "out" ? "-" : "+"}
                    {m.quantity}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {m.reference_type ? `${m.reference_type} ${(m.reference_id || "").slice(-6)}` : "—"}
                  </span>
                  <span className="text-muted-foreground">
                    {format(new Date(m.created_at), "MMM dd, HH:mm")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Balance: <b>{m.new_stock ?? "—"}</b></span>
                  {m.unit_cost ? <span>{formatNIS(m.unit_cost)}/unit</span> : null}
                </div>
                {m.created_by && (
                  <p className="text-[10px] text-muted-foreground">
                    By {profiles[m.created_by] || "—"}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      No movements yet.
                    </TableCell>
                  </TableRow>
                )}
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">
                      {format(new Date(m.created_at), "MMM dd yyyy, HH:mm")}
                    </TableCell>
                    <TableCell>{typeBadge(m.movement_type)}</TableCell>
                    <TableCell className="text-xs">
                      {m.reference_type
                        ? `${m.reference_type} #${(m.reference_id || "").slice(-8)}`
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        m.movement_type === "out" ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {m.movement_type === "out" ? "-" : "+"}
                      {m.quantity}
                    </TableCell>
                    <TableCell className="text-right font-bold">{m.new_stock ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {m.unit_cost ? formatNIS(m.unit_cost) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {profiles[m.created_by] || (m.created_by ? "—" : "System")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sales history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sales History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="md:hidden divide-y">
            {sales.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No sales yet.</p>
            )}
            {sales.map((s: any) => (
              <div key={s.id} className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {s.sale?.sale_number || "—"}
                  </span>
                  <Badge variant={s.sale?.payment_status === "paid" ? "default" : "secondary"}>
                    {s.sale?.payment_status || "pending"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{s.sale?.customer?.name || "—"}</p>
                <div className="flex justify-between text-xs">
                  <span>
                    {s.quantity} × {formatNIS(s.unit_price)}
                  </span>
                  <span className="font-semibold">{formatNIS(s.total)}</span>
                </div>
                {s.serial_number && (
                  <p className="text-[10px] text-muted-foreground">SN: {s.serial_number}</p>
                )}
              </div>
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Serial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      No sales yet.
                    </TableCell>
                  </TableRow>
                )}
                {sales.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.sale?.sale_number || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {s.sale?.sale_date
                        ? format(new Date(s.sale.sale_date), "MMM dd, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>{s.sale?.customer?.name || "—"}</TableCell>
                    <TableCell className="text-right">{s.quantity}</TableCell>
                    <TableCell className="text-right">{formatNIS(s.unit_price)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatNIS(s.total)}</TableCell>
                    <TableCell>
                      <Badge variant={s.sale?.payment_status === "paid" ? "default" : "secondary"}>
                        {s.sale?.payment_status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.serial_number || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Shipment history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Shipment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="md:hidden divide-y">
            {shipments.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No shipments yet.</p>
            )}
            {shipments.map((sh: any) => {
              const unit = Number(sh.purchase_order_item?.unit_cost || sh.purchase_order_item?.unit_price || 0);
              const freight =
                Number(sh.shipment?.freight_estimate || 0) +
                Number(sh.shipment?.clearance_estimate || 0);
              const landedPerUnit =
                sh.quantity_received > 0 ? unit + freight / sh.quantity_received : unit;
              return (
                <div key={sh.id} className="p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {sh.shipment?.shipment_number || sh.shipment?.purchase_order?.order_number || "—"}
                    </span>
                    <span className="font-bold">+{sh.quantity_received}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sh.shipment?.warehouse_arrival_date || sh.shipment?.actual_arrival_date || "—"}
                  </p>
                  <div className="flex justify-between text-xs">
                    <span>Unit: {formatNIS(unit)}</span>
                    <span>Landed: {formatNIS(landedPerUnit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment / PO #</TableHead>
                  <TableHead>Date Received</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Landed / Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      No shipments yet.
                    </TableCell>
                  </TableRow>
                )}
                {shipments.map((sh: any) => {
                  const unit = Number(sh.purchase_order_item?.unit_cost || sh.purchase_order_item?.unit_price || 0);
                  const freight =
                    Number(sh.shipment?.freight_estimate || 0) +
                    Number(sh.shipment?.clearance_estimate || 0);
                  const landedPerUnit =
                    sh.quantity_received > 0 ? unit + freight / sh.quantity_received : unit;
                  return (
                    <TableRow key={sh.id}>
                      <TableCell className="font-medium">
                        {sh.shipment?.shipment_number ||
                          sh.shipment?.purchase_order?.order_number ||
                          "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {sh.shipment?.warehouse_arrival_date ||
                          sh.shipment?.actual_arrival_date ||
                          "—"}
                      </TableCell>
                      <TableCell className="text-right">{sh.quantity_received}</TableCell>
                      <TableCell className="text-right">{formatNIS(unit)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatNIS(landedPerUnit)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductLedger;
