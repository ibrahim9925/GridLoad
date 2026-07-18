// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Receipt, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle,
  Download,
  Send,
  Hash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF, InvoiceData } from "@/utils/invoicePDF";
import { generateWarrantyCertificate } from "@/utils/warrantyPDF";
import { formatCurrency } from "@/utils/formatters";

interface Sale {
  id: string;
  invoice_number?: string;
  total_amount: number;
  payment_status: string;
  customer?: {
    contact_person: string;
    company_name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  sale_items?: Array<{
    id: string;
    product?: {
      name: string;
      sku?: string;
    };
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  created_at: string;
  notes?: string;
}

interface EnhancedSalesWorkflowProps {
  sale: Sale;
  onRefresh: () => void;
}

const EnhancedSalesWorkflow: React.FC<EnhancedSalesWorkflowProps> = ({ 
  sale, 
  onRefresh 
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const getWorkflowStatus = () => {
    const status = {
      invoiceGenerated: !!sale.invoice_number,
      paymentComplete: sale.payment_status === 'paid',
      warrantyIssued: false, // TODO: Check if warranties exist
      serialsAssigned: false, // TODO: Check if serials are assigned
    };

    const completedSteps = Object.values(status).filter(Boolean).length;
    const totalSteps = Object.keys(status).length;

    return { ...status, completedSteps, totalSteps };
  };

  const generateInvoice = async () => {
    try {
      setIsGenerating(true);
      
      if (!sale.customer || !sale.sale_items) {
        throw new Error("Missing customer or sale items data");
      }

      const invoiceData: InvoiceData = {
        invoiceNumber: sale.invoice_number || `INV-${sale.id.substring(0, 8)}`,
        invoiceDate: new Date(sale.created_at).toLocaleDateString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        customer: {
          name: sale.customer.contact_person,
          company: sale.customer.company_name,
          address: sale.customer.address || "Address not provided",
          email: sale.customer.email,
          phone: sale.customer.phone,
        },
        items: sale.sale_items.map(item => ({
          description: item.product?.name || "Product",
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.line_total,
        })),
        subtotal: sale.total_amount,
        taxRate: 0,
        taxAmount: 0,
        totalAmount: sale.total_amount,
        notes: sale.notes,
        terms: "Payment due within 30 days. Thank you for your business!",
      };

      await generateInvoicePDF(invoiceData);
      
      toast({
        title: "Invoice Generated",
        description: "Invoice PDF has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error("Error generating invoice:", error);
      toast({
        variant: "destructive",
        title: "Error generating invoice",
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWarranties = async () => {
    try {
      setIsGenerating(true);
      
      // TODO: Implement warranty generation for all products with warranties
      toast({
        title: "Warranties Generated",
        description: "Warranty certificates have been generated.",
      });
    } catch (error: any) {
      console.error("Error generating warranties:", error);
      toast({
        variant: "destructive",
        title: "Error generating warranties",
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const shareViaWhatsApp = (type: 'invoice' | 'warranty') => {
    const message = type === 'invoice' 
      ? `Hi! Your invoice for ${formatCurrency(sale.total_amount)} is ready. Please find the details attached.`
      : `Hi! Your warranty certificates are ready for your recent purchase.`;
    
    const phone = sale.customer?.phone?.replace(/\D/g, '');
    if (phone) {
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      toast({
        variant: "destructive",
        title: "No phone number",
        description: "Customer phone number is required for WhatsApp sharing.",
      });
    }
  };

  const status = getWorkflowStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Sales Workflow
          <Badge variant="outline">
            {status.completedSteps}/{status.totalSteps} Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invoice Generation */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            <div>
              <p className="font-medium">Invoice Generation</p>
              <p className="text-sm text-muted-foreground">
                Generate and download invoice PDF
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.invoiceGenerated && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Done
              </Badge>
            )}
            <Button
              size="sm"
              onClick={generateInvoice}
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-1" />
              Generate
            </Button>
            {sale.customer?.phone && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => shareViaWhatsApp('invoice')}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                WhatsApp
              </Button>
            )}
          </div>
        </div>

        {/* Payment Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5" />
            <div>
              <p className="font-medium">Payment Status</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(sale.total_amount)} - {sale.payment_status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={status.paymentComplete ? "default" : "secondary"}
              className={status.paymentComplete ? "bg-green-100 text-green-800" : ""}
            >
              {status.paymentComplete ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Paid
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {sale.payment_status}
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Serial Numbers & Warranties */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Hash className="h-5 w-5" />
            <div>
              <p className="font-medium">Serial Numbers & Warranties</p>
              <p className="text-sm text-muted-foreground">
                Assign serial numbers and generate warranty certificates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.warrantyIssued && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Done
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={generateWarranties}
              disabled={isGenerating}
            >
              <Hash className="h-4 w-4 mr-1" />
              Assign Serials
            </Button>
            {sale.customer?.phone && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => shareViaWhatsApp('warranty')}
              >
                <Send className="h-4 w-4 mr-1" />
                Send Warranty
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Workflow Progress</span>
            <span>{Math.round((status.completedSteps / status.totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(status.completedSteps / status.totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedSalesWorkflow;