// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "lucide-react";
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";

interface Warranty {
  id: string;
  serial_number: string;
  warranty_start_date: string;
  warranty_end_date: string;
  warranty_period_months: number;
  warranty_type: string;
  status: string;
  notes: string;
  customer_id: string;
  product_id: string;
  sale_id: string;
  registered_by: string;
  registration_date: string;
  created_at: string;
  updated_at: string;
  customers?: {
    contact_person: string;
    company_name: string;
  } | null;
  products?: {
    name: string;
    sku: string;
  } | null;
  sales?: {
    invoice_number: string;
    sale_date: string;
  } | null;
}

const WarrantyLookup = () => {
  const [serialNumber, setSerialNumber] = useState("");
  const [warranty, setWarranty] = useState<Warranty | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLookup = async () => {
    if (!serialNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: "Please enter a serial number.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("warranties")
        .select(`
          *,
          customers!warranties_customer_id_fkey(contact_person, company_name),
          products!warranties_product_id_fkey(name, sku),
          sales!warranties_sale_id_fkey(invoice_number, sale_date)
        `)
        .eq("serial_number", serialNumber.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            variant: "destructive",
            title: "Warranty not found",
            description: "No warranty found for this serial number.",
          });
          setWarranty(null);
          return;
        }
        throw error;
      }

      // Transform data to handle potential null relationships
      const transformedWarranty = {
        ...data,
        customers: data.customers ? {
          contact_person: (data.customers as any).contact_person || "Unknown",
          company_name: (data.customers as any).company_name || null
        } : null,
        products: data.products ? {
          name: (data.products as any).name || "Unknown Product",
          sku: (data.products as any).sku || "N/A"
        } : null,
        sales: data.sales ? {
          invoice_number: (data.sales as any).invoice_number || "N/A",
          sale_date: (data.sales as any).sale_date || ""
        } : null
      };

      setWarranty(transformedWarranty);
      toast({
        title: "Warranty found",
        description: "Warranty information retrieved successfully.",
      });
    } catch (error) {
      console.error("Error looking up warranty:", error);
      toast({
        variant: "destructive",
        title: "Error looking up warranty",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Warranty Lookup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Serial Number</Label>
          <Input
            id="serialNumber"
            placeholder="Enter serial number"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </div>
        <Button onClick={handleLookup} disabled={isLoading}>
          {isLoading ? "Looking up..." : "Lookup Warranty"}
        </Button>

        {warranty && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Warranty Details</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Serial Number</TableCell>
                  <TableCell>{warranty.serial_number}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>
                    {warranty.customers?.contact_person} ({warranty.customers?.company_name || 'Individual'})
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>{warranty.products?.name} ({warranty.products?.sku})</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Sale Invoice</TableCell>
                  <TableCell>{warranty.sales?.invoice_number}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Warranty Start Date</TableCell>
                  <TableCell>
                    {warranty.warranty_start_date ? format(new Date(warranty.warranty_start_date), 'PPP') : 'N/A'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Warranty End Date</TableCell>
                  <TableCell>
                    {warranty.warranty_end_date ? format(new Date(warranty.warranty_end_date), 'PPP') : 'N/A'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Warranty Period (Months)</TableCell>
                  <TableCell>{warranty.warranty_period_months}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Warranty Type</TableCell>
                  <TableCell>{warranty.warranty_type}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>{warranty.status}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Notes</TableCell>
                  <TableCell>{warranty.notes}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WarrantyLookup;
