// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, AlertTriangle, RefreshCw, PackageOpen, CheckCircle2, Building2, Wrench, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNIS } from "@/utils/formatters";

export interface FaultLogDeviceContext {
  serialId: string;
  serialNumber: string;
  saleId: string | null;
  customerId: string | null;
  productId: string;
  productName: string;
  productSku: string;
  customerName: string;
  warrantyId: string | null;
  hasWarranty: boolean;
  warrantyStatus?: "active" | "expired" | null;
  warrantyEndDate?: string | null;
}

interface FaultLogSectionProps {
  device: FaultLogDeviceContext;
}

const FaultLogSection = ({ device }: FaultLogSectionProps) => {
  const { toast } = useToast();
  const [faults, setFaults] = useState<any[]>([]);
  const [warranty, setWarranty] = useState<any>(null);
  const [newFault, setNewFault] = useState("");
  const [faultDate, setFaultDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const [dialogFault, setDialogFault] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<"replacement" | "loan" | null>(null);
  const [availableSerials, setAvailableSerials] = useState<any[]>([]);
  const [selectedSerial, setSelectedSerial] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");

  // Supplier claim dialog
  const [claimFault, setClaimFault] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [claimForm, setClaimForm] = useState<any>({ supplier_id: "", po_reference: "", purchase_date: "" });
  const [claims, setClaims] = useState<Record<string, any[]>>({});

  // Repair cost dialog
  const [repairFault, setRepairFault] = useState<any>(null);
  const [repairForm, setRepairForm] = useState<any>({ amount: "", workshop: "", paid_date: new Date().toISOString().slice(0, 10), notes: "" });

  useEffect(() => {
    fetchFaults();
    fetchWarranty();
  }, [device.serialId, device.warrantyId]);

  const fetchWarranty = async () => {
    if (!device.warrantyId) {
      setWarranty(null);
      return;
    }
    const { data } = await supabase.from("warranties").select("*").eq("id", device.warrantyId).single();
    setWarranty(data);
  };

  const fetchFaults = async () => {
    let query = supabase.from("warranty_fault_log").select("*").order("logged_at", { ascending: false });
    if (device.warrantyId) {
      query = query.or(
        `warranty_id.eq.${device.warrantyId},product_serial_number_id.eq.${device.serialId}`
      );
    } else {
      query = query.eq("product_serial_number_id", device.serialId);
    }
    const { data } = await query;
    setFaults(data || []);
    // Load supplier claims for these faults
    const ids = (data || []).map((f: any) => f.id);
    if (ids.length) {
      const { data: cd } = await supabase.from("supplier_warranty_claims" as any)
        .select("*, suppliers(name)").in("fault_id", ids);
      const map: Record<string, any[]> = {};
      (cd || []).forEach((c: any) => { (map[c.fault_id] = map[c.fault_id] || []).push(c); });
      setClaims(map);
    }
  };

  const addFault = async () => {
    if (!newFault.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("warranty_fault_log").insert({
        warranty_id: device.warrantyId,
        product_serial_number_id: device.serialId,
        sale_id: device.saleId,
        customer_id: device.customerId,
        fault_description: newFault.trim(),
        fault_date: faultDate,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
      setNewFault("");
      fetchFaults();
      toast({ title: "Fault logged" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setLoading(false); }
  };

  const openDialog = async (fault: any, mode: "replacement" | "loan") => {
    if (!device.warrantyId || !warranty) {
      toast({
        variant: "destructive",
        title: "Warranty required",
        description: "Replacement and loan actions need a registered warranty for this device.",
      });
      return;
    }
    setDialogFault(fault); setDialogMode(mode); setSelectedSerial(""); setExpectedReturn("");
    const productId = warranty?.product_id || device.productId;
    if (productId) {
      const { data } = await supabase.from("product_serial_numbers")
        .select("id, serial_number, status").eq("product_id", productId)
        .eq("status", "available").limit(100);
      setAvailableSerials(data || []);
    }
  };

  const submitDialog = async () => {
    if (!dialogFault || !selectedSerial) { toast({ variant: "destructive", title: "Pick a serial" }); return; }
    setLoading(true);
    try {
      if (dialogMode === "replacement") {
        const { error } = await (supabase as any).rpc("warranty_log_replacement", {
          p_fault_id: dialogFault.id, p_new_serial_id: selectedSerial,
        });
        if (error) throw error;
        toast({ title: "Replacement recorded" });
      } else {
        if (!expectedReturn) { toast({ variant: "destructive", title: "Expected return date required" }); setLoading(false); return; }
        const { error } = await (supabase as any).rpc("warranty_log_loan", {
          p_fault_id: dialogFault.id, p_loan_serial_id: selectedSerial, p_expected_return_date: expectedReturn,
        });
        if (error) throw error;
        toast({ title: "Loan unit issued" });
      }
      setDialogFault(null); setDialogMode(null); fetchFaults();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setLoading(false); }
  };

  const confirmLoanReturn = async (faultId: string) => {
    try {
      const { error } = await (supabase as any).rpc("warranty_confirm_loan_return", { p_fault_id: faultId });
      if (error) throw error;
      toast({ title: "Loan return confirmed" });
      fetchFaults();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const openClaim = async (fault: any) => {
    setClaimFault(fault);
    setClaimForm({ supplier_id: "", po_reference: "", purchase_date: warranty?.purchase_date?.slice(0, 10) || "" });
    const { data } = await supabase.from("suppliers").select("id, name").eq("is_active", true).order("name");
    setSuppliers(data || []);
  };

  const submitClaim = async () => {
    if (!claimFault || !claimForm.supplier_id) {
      toast({ variant: "destructive", title: "Pick a supplier" }); return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("supplier_warranty_claims" as any).insert({
        fault_id: claimFault.id,
        warranty_id: device.warrantyId,
        supplier_id: claimForm.supplier_id,
        product_id: warranty?.product_id || device.productId,
        serial_number: warranty?.serial_number || device.serialNumber,
        po_reference: claimForm.po_reference || null,
        purchase_date: claimForm.purchase_date || null,
        fault_description: claimFault.fault_description,
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "Supplier claim created" });
      setClaimFault(null);
      fetchFaults();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setLoading(false); }
  };

  const updateClaimStatus = async (claimId: string, patch: any) => {
    const { error } = await supabase.from("supplier_warranty_claims" as any).update({
      ...patch, resolved_date: patch.status && patch.status !== "pending" ? new Date().toISOString().slice(0, 10) : null,
    }).eq("id", claimId);
    if (error) { toast({ variant: "destructive", title: "Error", description: error.message }); return; }
    toast({ title: "Claim updated" });
    fetchFaults();
  };

  const openRepair = (fault: any) => {
    setRepairFault(fault);
    setRepairForm({
      amount: fault.repair_cost_nis ?? "",
      workshop: fault.repair_workshop ?? "",
      paid_date: fault.repair_paid_date ?? new Date().toISOString().slice(0, 10),
      notes: fault.repair_notes ?? "",
    });
  };

  const submitRepair = async () => {
    if (!repairFault) return;
    const amt = Number(repairForm.amount);
    if (!amt || amt <= 0) { toast({ variant: "destructive", title: "Enter a valid amount" }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("warranty_fault_log").update({
        repair_cost_nis: amt,
        repair_currency: "NIS",
        repair_workshop: repairForm.workshop || null,
        repair_paid_date: repairForm.paid_date || null,
        repair_notes: repairForm.notes || null,
      }).eq("id", repairFault.id);
      if (error) throw error;
      toast({ title: "Repair cost saved" });
      setRepairFault(null);
      fetchFaults();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setLoading(false); }
  };

  const totalRepair = faults.reduce((s, f) => s + Number(f.repair_cost_nis || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <span className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Fault Log</span>
          {totalRepair > 0 && (
            <Badge variant="outline" className="text-xs">Total repair: {formatNIS(totalRepair)}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fault date</Label>
            <Input
              type="date"
              value={faultDate}
              onChange={(e) => setFaultDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea placeholder="Describe the fault or issue..." value={newFault}
              onChange={(e) => setNewFault(e.target.value)} rows={2} className="min-h-[40px]" />
          </div>
          <Button onClick={addFault} disabled={loading || !newFault.trim()} className="self-end">
            <Plus className="mr-1 h-4 w-4" />Log
          </Button>
        </div>

        {faults.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No faults logged yet.</p>
        ) : (
          <div className="space-y-3 max-h-[28rem] overflow-y-auto">
            {faults.map((fault) => {
              const faultClaims = claims[fault.id] || [];
              return (
                <div key={fault.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm flex-1">{fault.fault_description}</p>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {(fault.fault_date || fault.logged_at)
                        ? new Date(fault.fault_date || fault.logged_at).toLocaleDateString()
                        : "—"}
                    </Badge>
                  </div>

                  {fault.resolution_type === "replacement" && (
                    <Badge className="bg-green-600"><RefreshCw className="h-3 w-3 mr-1" />Replaced</Badge>
                  )}
                  {fault.resolution_type === "loan" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={fault.loan_status === "returned" ? "bg-green-600" : "bg-amber-600"}>
                        <PackageOpen className="h-3 w-3 mr-1" />
                        Loan {fault.loan_status === "returned" ? "Returned" : "Out"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        Given {fault.loan_given_date} · Expected {fault.loan_expected_return_date}
                        {fault.loan_returned_date && ` · Returned ${fault.loan_returned_date}`}
                      </span>
                      {fault.loan_status !== "returned" && (
                        <Button size="sm" variant="outline" onClick={() => confirmLoanReturn(fault.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Confirm Return
                        </Button>
                      )}
                    </div>
                  )}

                  {fault.repair_cost_nis ? (
                    <div className="bg-muted rounded p-2 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-3 w-3" />
                        <span>Repair: <b>{formatNIS(fault.repair_cost_nis)}</b></span>
                        {fault.repair_workshop && <span className="text-muted-foreground">· {fault.repair_workshop}</span>}
                        {fault.repair_paid_date && <span className="text-muted-foreground">· {fault.repair_paid_date}</span>}
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => openRepair(fault)}>Edit</Button>
                    </div>
                  ) : null}

                  {faultClaims.map((c) => (
                    <div key={c.id} className="bg-blue-50 border border-blue-200 rounded p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <b>{c.suppliers?.name || "Supplier"}</b>
                          {c.po_reference && <span className="text-muted-foreground">· PO {c.po_reference}</span>}
                        </span>
                        <Select value={c.status} onValueChange={(v) => updateClaimStatus(c.id, { status: v })}>
                          <SelectTrigger className="h-6 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="credited">Credit Received</SelectItem>
                            <SelectItem value="replaced">Replacement Sent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea
                        rows={1}
                        placeholder="Supplier response..."
                        defaultValue={c.supplier_response || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (c.supplier_response || "")) {
                            updateClaimStatus(c.id, { supplier_response: e.target.value });
                          }
                        }}
                        className="text-xs"
                      />
                    </div>
                  ))}

                  <div className="flex gap-2 flex-wrap">
                    {(!fault.resolution_type || fault.resolution_type === "pending") && device.hasWarranty && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openDialog(fault, "replacement")}>
                          <RefreshCw className="h-3 w-3 mr-1" />Replacement
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openDialog(fault, "loan")}>
                          <PackageOpen className="h-3 w-3 mr-1" />Loan Unit
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openClaim(fault)}>
                      <Building2 className="h-3 w-3 mr-1" />Claim Against Supplier
                    </Button>
                    {!fault.repair_cost_nis && (
                      <Button size="sm" variant="outline" onClick={() => openRepair(fault)}>
                        <Wrench className="h-3 w-3 mr-1" />Add Repair Cost
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Replacement/Loan dialog */}
        <Dialog open={!!dialogFault} onOpenChange={(o) => !o && setDialogFault(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialogMode === "replacement" ? "Issue Replacement" : "Issue Loan Unit"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Available Serial (same product)</label>
                <Select value={selectedSerial} onValueChange={setSelectedSerial}>
                  <SelectTrigger><SelectValue placeholder="Select serial number" /></SelectTrigger>
                  <SelectContent>
                    {availableSerials.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No available serials in stock.</div>
                    ) : availableSerials.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.serial_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dialogMode === "loan" && (
                <div>
                  <label className="text-xs text-muted-foreground">Expected return date</label>
                  <Input type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogFault(null)}>Cancel</Button>
              <Button onClick={submitDialog} disabled={loading || !selectedSerial}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Supplier claim dialog */}
        <Dialog open={!!claimFault} onOpenChange={(o) => !o && setClaimFault(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Claim Against Supplier</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-muted rounded p-2 text-xs space-y-0.5">
                <div>SN: <b>{warranty?.serial_number || device.serialNumber}</b></div>
                <div>Fault: {claimFault?.fault_description}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Supplier</label>
                <Select value={claimForm.supplier_id} onValueChange={(v) => setClaimForm({ ...claimForm, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">PO Reference</label>
                  <Input value={claimForm.po_reference} onChange={(e) => setClaimForm({ ...claimForm, po_reference: e.target.value })} placeholder="PO-2026-001" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Purchase Date</label>
                  <Input type="date" value={claimForm.purchase_date} onChange={(e) => setClaimForm({ ...claimForm, purchase_date: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setClaimFault(null)}>Cancel</Button>
              <Button onClick={submitClaim} disabled={loading || !claimForm.supplier_id}>Create Claim</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Repair cost dialog */}
        <Dialog open={!!repairFault} onOpenChange={(o) => !o && setRepairFault(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Repair Cost</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Amount (NIS)</label>
                <Input type="number" value={repairForm.amount} onChange={(e) => setRepairForm({ ...repairForm, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Workshop</label>
                  <Input value={repairForm.workshop} onChange={(e) => setRepairForm({ ...repairForm, workshop: e.target.value })} placeholder="Workshop name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Paid Date</label>
                  <Input type="date" value={repairForm.paid_date} onChange={(e) => setRepairForm({ ...repairForm, paid_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea rows={2} value={repairForm.notes} onChange={(e) => setRepairForm({ ...repairForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRepairFault(null)}>Cancel</Button>
              <Button onClick={submitRepair} disabled={loading}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default FaultLogSection;
