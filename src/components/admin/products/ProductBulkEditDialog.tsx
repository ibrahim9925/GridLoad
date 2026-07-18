// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Inverter", "Panel", "Battery", "Cable", "Accessory", "Other"];
const PRODUCT_TYPES = ["inverter", "panel", "battery", "breaker", "wire", "structure", "accessory", "other"];

type ProductRow = {
  id: string;
  sku: string | null;
  name: string;
  brand?: string | null;
  product_type?: string | null;
  category?: string | null;
  warranty_months?: number | null;
  supplier_id?: string | null;
  suppliers?: { name: string } | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: ProductRow[];
  suppliers: { id: string; name: string }[];
  onSuccess: () => void;
}

const warrantyLabel = (m: number | null | undefined) => {
  if (m == null) return "No warranty";
  if (m >= 12 && m % 12 === 0) return `${m / 12} year${m / 12 === 1 ? "" : "s"}`;
  return `${m} months`;
};

const ProductBulkEditDialog = ({
  open,
  onOpenChange,
  selectedProducts,
  suppliers,
  onSuccess,
}: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [applying, setApplying] = useState(false);

  const [applyBrand, setApplyBrand] = useState(false);
  const [applyType, setApplyType] = useState(false);
  const [applyCategory, setApplyCategory] = useState(false);
  const [applyWarranty, setApplyWarranty] = useState(false);
  const [applySupplier, setApplySupplier] = useState(false);

  const [brand, setBrand] = useState("");
  const [productType, setProductType] = useState("inverter");
  const [category, setCategory] = useState("Inverter");
  const [warrantyMonths, setWarrantyMonths] = useState("12");
  const [supplierId, setSupplierId] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("form");
      setApplyBrand(false);
      setApplyType(false);
      setApplyCategory(false);
      setApplyWarranty(false);
      setApplySupplier(false);
      setBrand("");
      setProductType("inverter");
      setCategory("Inverter");
      setWarrantyMonths("12");
      setSupplierId("");
    }
  }, [open]);

  const hasAnyField = applyBrand || applyType || applyCategory || applyWarranty || applySupplier;

  const updatesPayload = useMemo(() => {
    const patch: Record<string, string> = {};
    if (applyBrand) patch.brand = brand.trim();
    if (applyType) patch.product_type = productType;
    if (applyCategory) patch.category = category;
    if (applyWarranty) patch.warranty_months = String(parseInt(warrantyMonths, 10) || 0);
    if (applySupplier) patch.supplier_id = supplierId === "none" ? "" : supplierId;
    return patch;
  }, [applyBrand, applyType, applyCategory, applyWarranty, applySupplier, brand, productType, category, warrantyMonths, supplierId]);

  const changeSummary = useMemo(() => {
    const lines: string[] = [];
    if (applyBrand) lines.push(`Brand → ${brand.trim() || "(clear)"}`);
    if (applyType) lines.push(`Type → ${productType}`);
    if (applyCategory) lines.push(`Category → ${category}`);
    if (applyWarranty) lines.push(`Warranty → ${warrantyLabel(parseInt(warrantyMonths, 10) || 0)}`);
    if (applySupplier) {
      const name = supplierId === "none"
        ? "(none)"
        : suppliers.find((s) => s.id === supplierId)?.name || supplierId;
      lines.push(`Supplier → ${name}`);
    }
    return lines;
  }, [applyBrand, applyType, applyCategory, applyWarranty, applySupplier, brand, productType, category, warrantyMonths, supplierId, suppliers]);

  const handleContinue = () => {
    if (!hasAnyField) {
      toast({ variant: "destructive", title: "Choose at least one field", description: "Check the fields you want to bulk-update." });
      return;
    }
    if (applySupplier && !supplierId) {
      toast({ variant: "destructive", title: "Select a supplier", description: "Pick a supplier or choose “None” to clear." });
      return;
    }
    setStep("confirm");
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const ids = selectedProducts.map((p) => p.id);
      const { error } = await supabase.rpc("bulk_update_products", {
        p_product_ids: ids,
        p_updates: updatesPayload,
      });
      if (error) throw error;
      toast({ title: "Bulk update complete", description: `${ids.length} product${ids.length === 1 ? "" : "s"} updated.` });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Bulk update failed",
        description: err?.message || "No products were changed.",
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Bulk edit products" : "Confirm bulk update"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? `${selectedProducts.length} selected — only checked fields will change. Price, stock, and SKU are not bulk-editable.`
              : "Review the SKUs and new values below. All selected products update together, or none do."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4 py-2 overflow-y-auto">
            <FieldToggle
              label="Brand"
              checked={applyBrand}
              onCheckedChange={setApplyBrand}
            >
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Sungrow" />
            </FieldToggle>

            <FieldToggle label="Type" checked={applyType} onCheckedChange={setApplyType}>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldToggle>

            <FieldToggle label="Category" checked={applyCategory} onCheckedChange={setApplyCategory}>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldToggle>

            <FieldToggle label="Warranty period (months)" checked={applyWarranty} onCheckedChange={setApplyWarranty}>
              <Input
                type="number"
                min={0}
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
              />
            </FieldToggle>

            <FieldToggle label="Supplier" checked={applySupplier} onCheckedChange={setApplySupplier}>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (clear supplier)</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldToggle>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-3">
            <div className="space-y-3 py-2">
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                <p className="font-medium">Changes to apply:</p>
                {changeSummary.map((line) => (
                  <p key={line} className="text-muted-foreground">{line}</p>
                ))}
              </div>
              <p className="text-sm font-medium">{selectedProducts.length} products:</p>
              <ul className="text-sm space-y-1">
                {selectedProducts.map((p) => (
                  <li key={p.id} className="font-mono text-xs border-b pb-1">
                    {p.sku || "—"} · {p.name}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "confirm" ? (
            <>
              <Button variant="outline" onClick={() => setStep("form")} disabled={applying}>
                Back
              </Button>
              <Button onClick={handleApply} disabled={applying}>
                {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Apply to {selectedProducts.length} products
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleContinue} disabled={!hasAnyField}>Review changes</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const FieldToggle = ({
  label,
  checked,
  onCheckedChange,
  children,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children: React.ReactNode;
}) => (
  <div className="space-y-2 rounded-lg border p-3">
    <div className="flex items-center gap-2">
      <Checkbox id={`bulk-${label}`} checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} />
      <Label htmlFor={`bulk-${label}`} className="font-medium cursor-pointer">{label}</Label>
    </div>
    {checked && children}
  </div>
);

export default ProductBulkEditDialog;
