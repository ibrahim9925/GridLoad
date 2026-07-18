// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Send, Search, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateWarrantyCertificate } from "@/utils/warrantyPDF";
import { formatCurrency } from "@/utils/formatters";

interface WarrantyData {
  id: string;
  serial_number: string;
  warranty_type: string;
  warranty_period_months: number;
  warranty_start_date: string;
  warranty_end_date: string;
  status: string;
  product: {
    name: string;
    sku: string;
  } | null;
  customer: {
    contact_person: string;
    company_name?: string;
    email?: string;
    phone?: string;
    address?: string;
  } | null;
  sale: {
    invoice_number?: string;
    sale_date: string;
  } | null;
  product_serial_number: {
    serial_number: string;
  } | null;
}

const WarrantyGeneration = () => {
  const [warranties, setWarranties] = useState<WarrantyData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("warranties")
        .select(`
          *,
          serial_number,
          product:products(name, sku),
          customer:customers(contact_person, company_name, email, phone, address),
          sale:sales(invoice_number, sale_date)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWarranties((data as any) || []);
    } catch (error) {
      console.error("Error fetching warranties:", error);
      toast({
        variant: "destructive",
        title: "Error loading warranties",
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async (warranty: WarrantyData) => {
    setGeneratingPdf(warranty.id);
    try {
      await generateWarrantyCertificate({
        id: warranty.id,
        serial_number: warranty.product_serial_number?.serial_number || warranty.serial_number,
        warranty_type: warranty.warranty_type,
        warranty_period_months: warranty.warranty_period_months,
        warranty_start_date: warranty.warranty_start_date,
        warranty_end_date: warranty.warranty_end_date,
        product: warranty.product || { name: "Unknown Product", sku: "N/A" },
        customer: warranty.customer || { contact_person: "Unknown Customer" },
        notes: "",
      });

      toast({
        title: "PDF Generated",
        description: "Warranty certificate has been downloaded.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: "Please try again.",
      });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleWhatsAppShare = (warranty: WarrantyData) => {
    const serialNumber = warranty.product_serial_number?.serial_number || warranty.serial_number;
    const customerName = warranty.customer?.contact_person || "Customer";
    const productName = warranty.product?.name || "Product";
    const warrantyEnd = new Date(warranty.warranty_end_date).toLocaleDateString();
    
    const message = `Hi ${customerName}! 

Your warranty certificate for ${productName} is ready.

🏷️ Serial Number: ${serialNumber}
📅 Warranty Valid Until: ${warrantyEnd}
🛡️ Coverage: ${warranty.warranty_period_months} months

Please keep this information safe for any future warranty claims.

Best regards,
GridLoad Energy Solutions`;

    const phoneNumber = warranty.customer?.phone?.replace(/\D/g, '') || '';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      expired: "destructive",
      claimed: "secondary",
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredWarranties = warranties.filter(warranty => {
    const serialNumber = warranty.product_serial_number?.serial_number || warranty.serial_number;
    const productName = warranty.product?.name || "";
    const customerName = warranty.customer?.contact_person || "";
    
    return serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
           productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           customerName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Warranty Certificate Generation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate and share warranty certificates with customers
          </p>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by serial number, product, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Warranties Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Warranty Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading warranties...
                    </TableCell>
                  </TableRow>
                ) : filteredWarranties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No warranties found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWarranties.map((warranty) => (
                    <TableRow key={warranty.id}>
                      <TableCell className="font-mono font-medium">
                        {warranty.product_serial_number?.serial_number || warranty.serial_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{warranty.product?.name || "Unknown Product"}</div>
                          <div className="text-sm text-muted-foreground">
                            {warranty.product?.sku || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{warranty.customer?.contact_person || "Unknown Customer"}</div>
                          {warranty.customer?.company_name && (
                            <div className="text-sm text-muted-foreground">
                              {warranty.customer.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{warranty.warranty_period_months} months</div>
                          <div className="text-sm text-muted-foreground">
                            Until {new Date(warranty.warranty_end_date).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(warranty.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGeneratePDF(warranty)}
                            disabled={generatingPdf === warranty.id}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {generatingPdf === warranty.id ? "Generating..." : "PDF"}
                          </Button>
                          {warranty.customer?.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleWhatsAppShare(warranty)}
                              className="gap-2"
                            >
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WarrantyGeneration;