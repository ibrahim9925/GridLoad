// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { useSalesDialogForm } from "@/hooks/useSalesDialogForm";
import { useSalesDialogError } from "@/hooks/useSalesDialogError";
import { useEnhancedPaymentProcessing } from "@/hooks/useEnhancedPaymentProcessing";
import SalesCustomerSection from "./sales/SalesCustomerSection";
import SalesProductSection from "./sales/SalesProductSection";
import SalesDiscountSection from "./sales/SalesDiscountSection";
import SalesInstallmentSection from "./sales/SalesInstallmentSection";
import SalesSummarySection from "./sales/SalesSummarySection";
import AutoCommissionCalculation from "./sales/AutoCommissionCalculation";

import DeliveryCompanySection from "./sales/DeliveryCompanySection";
import { formatNIS } from "@/utils/formatters";
import { supabase } from "@/integrations/supabase/client";
import { linkSerialEntriesForLine, type SerialEntry } from "@/lib/serialInventory";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface SalesDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (saleData: any, saleItems: any[]) => Promise<any>;
  sale?: any;
}

const SalesDialog = ({ open, onClose, onSave, sale }: SalesDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editingSaleIdRef = useRef<string | undefined>(undefined);
  const { handlePaymentStatusChange } = useEnhancedPaymentProcessing();
  const {
    errors,
    handleError,
    validateSaleForm,
    clearErrors
  } = useSalesDialogError();

  const {
    formData,
    customers,
    staff,
    isLoading,
    isInstallment,
    installmentPlanType,
    setIsInstallment,
    setInstallmentPlanType,
    handleInputChange,
    handleAddSaleItem,
    handleRemoveSaleItem,
    handleUpdateSaleItem,
    getSelectedCustomer,
    getSubtotalBeforeDiscount,
    getDiscountAmount,
    getSubtotalAfterDiscount,
    handleApplyCustomerDiscount,
    validateForm,
    prepareSubmitData,
    createPaymentSchedule,
    handleSaleCreated,
  } = useSalesDialogForm(open, sale);

  // Clear errors when dialog opens/closes
  useEffect(() => {
    if (open) {
      clearErrors();
      editingSaleIdRef.current = sale?.id;
    }
  }, [open, clearErrors, sale?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🟢 Create Sale clicked");
    sonnerToast("Submitting sale...");

    try {
      const validation = validateSaleForm(formData, formData.saleItems);
      if (!validation.isValid) {
        sonnerToast.error(
          validation.firstError || "Please complete the required fields before saving."
        );
        return;
      }
      if (!validateForm()) {
        sonnerToast.error("Please fix validation errors before saving.");
        return;
      }

      // Prevent duplicate serial numbers (picked or typed) within the same sale
      const allSerialNumbers = formData.saleItems.flatMap((it: any) => {
        const fromEntries = (it.serial_entries || [])
          .map((e: any) =>
            e.mode === "pick"
              ? String(e.serial_number || "").trim()
              : String(e.serial_number || "").trim()
          )
          .filter(Boolean);
        return fromEntries.length
          ? fromEntries
          : (it.serial_numbers || []).map((s: string) => String(s).trim()).filter(Boolean);
      });
      const dupSn = allSerialNumbers.find(
        (sn, i) => allSerialNumbers.indexOf(sn) !== i
      );
      if (dupSn) {
        sonnerToast.error(`Serial number ${dupSn} appears more than once on this sale.`);
        return;
      }

      const allSerialIds = formData.saleItems.flatMap((it: any) =>
        (it.selected_serial_ids || []).filter(Boolean)
      );
      const dupId = allSerialIds.find((id, i) => allSerialIds.indexOf(id) !== i);
      if (dupId) {
        sonnerToast.error("The same serial number cannot be selected twice on one sale.");
        return;
      }

      for (const item of formData.saleItems as any[]) {
        const filled = (item.serial_entries || []).filter((e: any) =>
          e.mode === "pick" ? Boolean(e.serial_id) : Boolean(String(e.serial_number || "").trim())
        ).length;
        const missing = Number(item.quantity) - filled;
        if (missing > 0) {
          sonnerToast.warning(
            `${missing} serial${missing !== 1 ? "s" : ""} not assigned for ${item.product_name} — you can still save and assign later.`
          );
        }
      }

      // Pre-flight stock availability check
      try {
        const ids = Array.from(new Set(formData.saleItems.map((it: any) => it.product_id).filter(Boolean)));
        if (ids.length > 0) {
          const { data: stockRows, error: stockErr } = await supabase
            .from("products")
            .select("id, name, current_stock")
            .in("id", ids);
          if (stockErr) throw stockErr;
          const stockMap = new Map((stockRows || []).map((r: any) => [r.id, r]));
          const requested = new Map<string, number>();
          for (const it of formData.saleItems as any[]) {
            requested.set(it.product_id, (requested.get(it.product_id) || 0) + Number(it.quantity || 0));
          }
          const alreadyOnSale = new Map<string, number>();
          if (editingSaleIdRef.current) {
            const { data: existingLines, error: existingErr } = await supabase
              .from("sale_items")
              .select("product_id, quantity")
              .eq("sale_id", editingSaleIdRef.current);
            if (existingErr) throw existingErr;
            for (const line of existingLines || []) {
              alreadyOnSale.set(
                line.product_id,
                (alreadyOnSale.get(line.product_id) || 0) + Number(line.quantity || 0)
              );
            }
          }
          for (const [pid, qty] of requested.entries()) {
            const p: any = stockMap.get(pid);
            const available =
              (p?.current_stock ?? 0) + (alreadyOnSale.get(pid) || 0);
            if (available < qty) {
              sonnerToast.error(`Insufficient stock for ${p?.name || "product"}. Available: ${available}, Requested: ${qty}`);
              return;
            }
          }
        }
      } catch (err: any) {
        sonnerToast.error(`Stock check failed: ${err.message || err}`);
        return;
      }

      setIsSubmitting(true);
      const { saleData, saleItems } = prepareSubmitData();
      console.log("💾 [SalesDialog] saleData payload:", saleData);
      console.log("💾 [SalesDialog] saleItems payload:", saleItems);


      const cleanSaleData = {
        ...(editingSaleIdRef.current ? { id: editingSaleIdRef.current } : {}),
        customer_id: saleData.customer_id,
        sales_rep_id: saleData.sales_rep_id,
        sale_date: saleData.sale_date,
        subtotal: saleData.subtotal || 0,
        tax_amount: saleData.tax_amount || 0,
        total_amount: saleData.total_amount || 0,
        discount_type: saleData.discount_type || 'percentage',
        discount_percentage: saleData.discount_percentage || 0,
        discount_amount: saleData.discount_amount || 0,
        subtotal_before_discount: saleData.subtotal_before_discount || 0,
        is_installment: isInstallment,
        installment_plan_type: isInstallment ? installmentPlanType : null,
        payment_status: formData.payment_status,
        notes: saleData.notes || null,
        tax_rate: saleData.tax_rate || 0,
        delivery_charges: saleData.delivery_charges || 0,
        delivery_company_name: saleData.delivery_company_name || null,
        delivery_date: saleData.delivery_date || null,
        expected_payment_date: saleData.expected_payment_date || null,
        balance_due: saleData.balance_due,
        fulfillment_status: saleData.fulfillment_status,
        delivery_company_settled: false
      };
      console.log("💾 [SalesDialog] calling onSave with cleaned data:", cleanSaleData);
      const saleRecord = await onSave(cleanSaleData, saleItems);
      console.log("💾 [SalesDialog] onSave returned:", saleRecord);


      if (saleRecord?.id) {
        // Non-blocking: serial numbers + warranties registration
        registerTypedSerialNumbers(
          saleRecord.id,
          saleRecord.customer_id,
          saleRecord.sale_date || new Date().toISOString()
        ).catch((err) => console.error("Serial registration error:", err));

        if (isInstallment && installmentPlanType) {
          createPaymentSchedule(saleRecord.id, getSubtotalAfterDiscount())
            .catch((err) => console.error("Payment schedule error:", err));
        }

        onClose();
      } else {
        sonnerToast.error("Sale was not created. Please check the form and try again.");
      }
    } catch (error: any) {
      console.error("❌ Sale submission error:", error);
      const msg = error?.message || error?.details || error?.hint || "Unknown error";
        sonnerToast.error(`Failed to ${editingSaleIdRef.current ? "update" : "create"} sale: ${msg}`);
      handleError(error, "Sale submission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerTypedSerialNumbers = async (saleId: string, customerId: string, saleDate: string) => {
    try {
      const warrantyRows: any[] = [];
      const soldDate = new Date().toISOString().split("T")[0];

      for (const it of formData.saleItems as any[]) {
        let entries: SerialEntry[] = it.serial_entries || [];
        if (entries.length === 0 && (it.selected_serial_ids || []).length > 0) {
          entries = (it.selected_serial_ids as string[])
            .filter(Boolean)
            .map((id: string, idx: number) => ({
              mode: "pick" as const,
              serial_id: id,
              serial_number: (it.serial_numbers || [])[idx] || "",
            }));
        }
        if (entries.length === 0) continue;

        const { errors } = await linkSerialEntriesForLine({
          saleId,
          productId: it.product_id,
          entries,
          soldDate,
        });
        if (errors.length) {
          console.error("Serial link errors:", errors);
        }

        for (const entry of entries) {
          const sn =
            entry.mode === "pick"
              ? entry.serial_number
              : String(entry.serial_number || "").trim();
          if (!sn || !it.warranty_months || Number(it.warranty_months) <= 0) continue;

          const start = new Date(saleDate);
          const end = new Date(start);
          end.setMonth(end.getMonth() + Number(it.warranty_months));
          warrantyRows.push({
            sale_id: saleId,
            product_id: it.product_id,
            customer_id: customerId,
            serial_number: sn,
            warranty_type: "manufacturer",
            warranty_period_months: Number(it.warranty_months),
            warranty_start_date: start.toISOString().split("T")[0],
            warranty_end_date: end.toISOString().split("T")[0],
            start_date: start.toISOString().split("T")[0],
            end_date: end.toISOString().split("T")[0],
            expiry_date: end.toISOString().split("T")[0],
            status: "active",
            notes: `Auto-created from sale ${saleId}`,
          });
        }
      }

      if (warrantyRows.length > 0) {
        const { error } = await supabase.from("warranties").insert(warrantyRows);
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error registering serials/warranties:", error);
      sonnerToast.error("Sale saved but failed to link serial numbers/warranties");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sale ? "Edit Sale" : "Create New Sale"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <SalesCustomerSection
            customers={customers}
            staff={staff}
            selectedCustomer={formData.customer_id}
            selectedSalesRep={formData.sales_rep}
            onCustomerChange={(value) => handleInputChange("customer_id", value)}
            onSalesRepChange={(value) => handleInputChange("sales_rep", value)}
            isLoading={isLoading}
          />

          <SalesProductSection
            saleItems={formData.saleItems}
            onAddItem={handleAddSaleItem}
            onRemoveItem={handleRemoveSaleItem}
            onUpdateItem={handleUpdateSaleItem}
            editingSaleId={editingSaleIdRef.current}
          />

          {/* Payment Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Terms</Label>
              <Select
                value={formData.payment_terms || "paid_now"}
                onValueChange={(v) => handleInputChange("payment_terms", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid_now">Paid Now</SelectItem>
                  <SelectItem value="partial">Partial Payment</SelectItem>
                  <SelectItem value="deferred">Deferred Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.payment_terms === "deferred" && (
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.deferred_due_date || ""}
                  onChange={(e) => handleInputChange("deferred_due_date", e.target.value)}
                />
              </div>
            )}
          </div>

          {formData.saleItems.length > 0 && (
            <>
              <SalesDiscountSection
                discountType={formData.discount_type}
                discountPercentage={formData.discount_percentage}
                discountAmount={formData.discount_amount}
                subtotalBeforeDiscount={getSubtotalBeforeDiscount()}
                customerDefaultDiscount={getSelectedCustomer()?.default_discount_percentage || 0}
                onDiscountTypeChange={(type) => handleInputChange("discount_type", type)}
                onDiscountPercentageChange={(percentage) => handleInputChange("discount_percentage", percentage)}
                onDiscountAmountChange={(amount) => handleInputChange("discount_amount", amount)}
                onApplyCustomerDiscount={handleApplyCustomerDiscount}
              />

          <SalesInstallmentSection
            isInstallment={isInstallment}
            installmentPlanType={installmentPlanType}
            totalAmount={getSubtotalAfterDiscount()}
            onInstallmentToggle={setIsInstallment}
            onPlanTypeChange={setInstallmentPlanType}
          />

          <DeliveryCompanySection
            isDeliveryCompany={formData.payment_status === "delivered_pending_payment"}
            deliveryCompanyName={formData.delivery_company_name || ""}
            deliveryDate={formData.delivery_date || ""}
            expectedPaymentDate={formData.expected_payment_date || ""}
            onToggleDeliveryCompany={(enabled) => {
              if (enabled) {
                handleInputChange("payment_status", "delivered_pending_payment");
                handleInputChange("delivery_date", new Date().toISOString().split('T')[0]);
                // Set expected payment date to 3 days from delivery
                const threeDaysLater = new Date();
                threeDaysLater.setDate(threeDaysLater.getDate() + 3);
                handleInputChange("expected_payment_date", threeDaysLater.toISOString().split('T')[0]);
              } else {
                handleInputChange("payment_status", "pending");
                handleInputChange("delivery_company_name", "");
                handleInputChange("delivery_date", "");
                handleInputChange("expected_payment_date", "");
              }
            }}
            onDeliveryCompanyNameChange={(name) => handleInputChange("delivery_company_name", name)}
            onDeliveryDateChange={(date) => {
              handleInputChange("delivery_date", date);
              // Auto-update expected payment date to 3 days after delivery
              const deliveryDate = new Date(date);
              deliveryDate.setDate(deliveryDate.getDate() + 3);
              handleInputChange("expected_payment_date", deliveryDate.toISOString().split('T')[0]);
            }}
            onExpectedPaymentDateChange={(date) => handleInputChange("expected_payment_date", date)}
          />
            </>
          )}

          <SalesSummarySection
            payment_status={formData.payment_status}
            sale_date={formData.sale_date}
            notes={formData.notes}
            total_amount={formatNIS(getSubtotalAfterDiscount())}
            tax_rate={formData.tax_rate}
            delivery_charges={formData.delivery_charges}
            onInputChange={(field, value) => {
              if (field === "payment_status") {
                handleInputChange(field, value as string);
              } else if (field === "notes") {
                handleInputChange(field, value as string);
              } else if (field === "sale_date") {
                handleInputChange(field, value as Date);
              } else if (field === "tax_rate" || field === "delivery_charges") {
                handleInputChange(field, value as number);
              }
            }}
            hideProductFields={true}
          />

          {/* Commission Calculation - only show for existing sales */}
          {sale?.id && (
            <AutoCommissionCalculation
              saleId={sale.id}
              saleAmount={getSubtotalAfterDiscount()}
              salesRepId={formData.sales_rep}
              salesRepName={staff.find(s => s.id === formData.sales_rep)?.full_name}
            />
          )}

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || formData.saleItems.length === 0}
              onClick={(e) => {
                console.log("🟢 Create Sale button onClick fired", {
                  isSubmitting,
                  items: formData.saleItems.length,
                  customer_id: formData.customer_id,
                });
                handleSubmit(e as any);
              }}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {sale ? "Update Sale" : "Create Sale"}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
};

export default SalesDialog;
