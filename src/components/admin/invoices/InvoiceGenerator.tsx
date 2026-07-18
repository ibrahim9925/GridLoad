// @ts-nocheck
import React from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import jsPDF from 'jspdf';
import { downloadPdfIOSSafe } from "@/utils/companySettings";
import { GRIDLOAD_LOGO_SRC } from "@/lib/brand";
import { format } from "date-fns";

interface Sale {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  customers: {
    contact_person: string;
    company_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
  };
  sale_items: Array<{
    quantity: number;
    unit_price: number;
    line_total: number;
    products: {
      name: string;
      sku: string;
    };
  }>;
  // Optional logo URL
  logoUrl?: string;

  // --- Added for compatibility with new fields ---
  tax_rate?: number;
  delivery_charges?: number;
}

interface InvoiceGeneratorProps {
  sale: Sale;
  logoUrl?: string; // Optionally force a logo from props
}

const InvoiceGenerator = ({ sale, logoUrl }: InvoiceGeneratorProps) => {
  const generatePDF = async () => {
    try {
      const doc = new jsPDF();

      // Load company logo
      try {
        const imgUrl = logoUrl || sale.logoUrl || GRIDLOAD_LOGO_SRC;
        const imgData = await getDataUrl(imgUrl);
        if (imgData) {
          doc.addImage(imgData, 'PNG', 20, 10, 45, 14);
        }
      } catch (e) {
        // Logo load error: fallback to text below
      }

      doc.setFontSize(20);
      doc.text('GridLoad CRM', 70, 30);
      doc.setFontSize(12);
      doc.text('Solar Energy Solutions', 70, 40);
      doc.text('Phone: +1 (555) 123-4567', 70, 50);
      doc.text('Email: info@gridload.com', 70, 60);

      doc.setFontSize(16);
      doc.text('INVOICE', 150, 30);
      doc.setFontSize(12);
      doc.text(`Invoice #: ${sale.invoice_number}`, 150, 45);
      doc.text(`Date: ${format(new Date(sale.sale_date), 'MMM dd, yyyy')}`, 150, 55);

      doc.text('Bill To:', 20, 90);
      doc.text(sale.customers.contact_person, 20, 105);
      if (sale.customers.company_name) {
        doc.text(sale.customers.company_name, 20, 115);
      }
      if (sale.customers.address) {
        doc.text(sale.customers.address, 20, 125);
        doc.text(
          `${sale.customers.city}, ${sale.customers.state} ${sale.customers.postal_code}`,
          20,
          135
        );
      }
      if (sale.customers.phone) {
        doc.text(`Phone: ${sale.customers.phone}`, 20, 145);
      }
      if (sale.customers.email) {
        doc.text(`Email: ${sale.customers.email}`, 20, 155);
      }

      // Table headers
      const startY = 180;
      doc.setFontSize(10);
      doc.text('Item', 20, startY);
      doc.text('SKU', 80, startY);
      doc.text('Qty', 120, startY);
      doc.text('Unit Price', 140, startY);
      doc.text('Total', 170, startY);

      doc.line(20, startY + 5, 190, startY + 5);

      // Table Rows
      let currentY = startY + 15;
      sale.sale_items.forEach((item) => {
        doc.text(item.products.name, 20, currentY);
        doc.text(item.products.sku || '', 80, currentY);
        doc.text(item.quantity.toString(), 120, currentY);
        doc.text(`$${item.unit_price.toFixed(2)}`, 140, currentY);
        doc.text(`$${item.line_total.toFixed(2)}`, 170, currentY);
        currentY += 10;
      });

      // Add Totals
      const totalsY = currentY + 20;
      doc.line(120, totalsY - 10, 190, totalsY - 10);

      doc.text('Subtotal:', 120, totalsY);
      doc.text(`$${sale.subtotal.toFixed(2)}`, 170, totalsY);

      if (sale.discount_amount > 0) {
        doc.text('Discount:', 120, totalsY + 10);
        doc.text(`-$${sale.discount_amount.toFixed(2)}`, 170, totalsY + 10);
      }

      // Show Tax details if present (>0)
      if(sale.tax_amount > 0) {
        doc.text(`Tax (${sale.tax_rate ? sale.tax_rate + '%' : ''}):`, 120, totalsY + 20);
        doc.text(`$${sale.tax_amount.toFixed(2)}`, 170, totalsY + 20);
      }

      // Show delivery charges if present
      if (sale.delivery_charges && sale.delivery_charges > 0) {
        doc.text('Delivery:', 120, totalsY + 30);
        doc.text(`$${sale.delivery_charges.toFixed(2)}`, 170, totalsY + 30);
      }

      doc.setFontSize(12);
      doc.text('Total:', 120, totalsY + 45);
      doc.text(`$${sale.total_amount.toFixed(2)}`, 170, totalsY + 45);

      doc.setFontSize(10);
      doc.text('Thank you for your business!', 20, 260);
      doc.text('Payment Terms: Net 30 days', 20, 270);

      downloadPdfIOSSafe(doc, `Invoice-${sale.invoice_number}.pdf`);
    } catch (err) {
      alert("Error generating PDF invoice. Please try again.");
    }
  };

  // Helper to convert image URL to data URL
  async function getDataUrl(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  return (
    <Button onClick={generatePDF} variant="outline" size="sm">
      <FileText className="h-4 w-4 mr-2" />
      Generate PDF
    </Button>
  );
};

export default InvoiceGenerator;
