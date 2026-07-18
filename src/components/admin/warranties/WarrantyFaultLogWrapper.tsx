// @ts-nocheck

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FaultLogSection, {
  type FaultLogDeviceContext,
} from "@/components/admin/warranties/FaultLogSection";

interface SoldDeviceRow {
  id: string;
  serial_number: string;
  sale_id: string | null;
  product_id: string;
  product: { name: string; sku: string | null } | null;
  sale: {
    customer_id: string | null;
    customer: { contact_person: string; company_name: string | null } | null;
  } | null;
}

const getWarrantyStatus = (endDate: string | null | undefined): "active" | "expired" | null => {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  return end >= new Date() ? "active" : "expired";
};

const WarrantyFaultLogWrapper = () => {
  const [devices, setDevices] = useState<SoldDeviceRow[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<FaultLogDeviceContext | null>(null);
  const [resolving, setResolving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoadingDevices(true);
      try {
        const { data, error } = await supabase
          .from("product_serial_numbers")
          .select(`
            id,
            serial_number,
            sale_id,
            product_id,
            product:products(name, sku),
            sale:sales(
              customer_id,
              customer:customers(contact_person, company_name)
            )
          `)
          .eq("status", "sold")
          .order("serial_number");

        if (error) throw error;
        setDevices((data as SoldDeviceRow[]) || []);
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Could not load sold devices",
          description: err.message,
        });
      } finally {
        setLoadingDevices(false);
      }
    })();
  }, [toast]);

  const deviceLabel = (row: SoldDeviceRow) => {
    const sku = row.product?.sku || row.product?.name || "—";
    const customer =
      row.sale?.customer?.contact_person ||
      row.sale?.customer?.company_name ||
      "Unknown customer";
    return `${row.serial_number} — ${sku} — ${customer}`;
  };

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => deviceLabel(d).toLowerCase().includes(q));
  }, [devices, search]);

  const resolveWarranty = async (row: SoldDeviceRow) => {
    setResolving(true);
    try {
      let warranty: any = null;

      const { data: bySerialId, error: byIdErr } = await supabase
        .from("warranties")
        .select("*")
        .eq("product_serial_number_id", row.id)
        .maybeSingle();
      if (byIdErr) throw byIdErr;
      warranty = bySerialId;

      if (!warranty && row.sale_id) {
        const { data: byText, error: byTextErr } = await supabase
          .from("warranties")
          .select("*")
          .eq("serial_number", row.serial_number)
          .eq("sale_id", row.sale_id)
          .maybeSingle();
        if (byTextErr) throw byTextErr;
        warranty = byText;
      }

      const endDate =
        warranty?.warranty_end_date || warranty?.expiry_date || warranty?.end_date || null;
      const customerName =
        row.sale?.customer?.contact_person ||
        row.sale?.customer?.company_name ||
        "Unknown customer";

      const context: FaultLogDeviceContext = {
        serialId: row.id,
        serialNumber: row.serial_number,
        saleId: row.sale_id,
        customerId: row.sale?.customer_id || warranty?.customer_id || null,
        productId: row.product_id,
        productName: row.product?.name || "Unknown product",
        productSku: row.product?.sku || "—",
        customerName,
        warrantyId: warranty?.id || null,
        hasWarranty: Boolean(warranty),
        warrantyStatus: warranty ? getWarrantyStatus(endDate) : null,
        warrantyEndDate: endDate,
      };

      setSelectedDevice(context);
      setPickerOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not resolve device",
        description: err.message,
      });
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-w-xl">
        <Label>Sold device</Label>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={pickerOpen}
              className="w-full justify-between font-normal"
              disabled={loadingDevices || resolving}
            >
              {loadingDevices || resolving ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {resolving ? "Loading device…" : "Loading sold devices…"}
                </span>
              ) : selectedDevice ? (
                `${selectedDevice.serialNumber} — ${selectedDevice.productSku} — ${selectedDevice.customerName}`
              ) : (
                "Search by serial, SKU, or customer…"
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(32rem,90vw)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search serial, SKU, customer…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>No sold devices found.</CommandEmpty>
                <CommandGroup>
                  {filteredDevices.map((row) => (
                    <CommandItem
                      key={row.id}
                      value={row.id}
                      onSelect={() => resolveWarranty(row)}
                      className="cursor-pointer"
                    >
                      <span className="font-mono text-xs">{row.serial_number}</span>
                      <span className="text-muted-foreground mx-2">—</span>
                      <span>{row.product?.sku || row.product?.name || "—"}</span>
                      <span className="text-muted-foreground mx-2">—</span>
                      <span className="truncate">
                        {row.sale?.customer?.contact_person ||
                          row.sale?.customer?.company_name ||
                          "Unknown customer"}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedDevice && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Product</Label>
              <Input readOnly value={selectedDevice.productName} className="bg-muted/40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Customer</Label>
              <Input readOnly value={selectedDevice.customerName} className="bg-muted/40" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Warranty status</Label>
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/40">
                {!selectedDevice.hasWarranty ? (
                  <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50">
                    No warranty registered
                  </Badge>
                ) : selectedDevice.warrantyStatus === "active" ? (
                  <Badge className="bg-green-600">Active</Badge>
                ) : (
                  <Badge variant="destructive">Expired</Badge>
                )}
                {selectedDevice.warrantyEndDate && selectedDevice.hasWarranty && (
                  <span className="text-xs text-muted-foreground">
                    until {new Date(selectedDevice.warrantyEndDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!selectedDevice.hasWarranty && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                No warranty registered for this device. You can still log faults; replacement and
                loan actions require a warranty record.
              </AlertDescription>
            </Alert>
          )}

          <FaultLogSection device={selectedDevice} />
        </>
      )}
    </div>
  );
};

export default WarrantyFaultLogWrapper;
