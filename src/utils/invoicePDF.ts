// @ts-nocheck
import jsPDF from 'jspdf';
import { fetchCompanyInfo, downloadPdfIOSSafe } from './companySettings';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customer: {
    name: string;
    company?: string;
    address: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    sku?: string;
    brand?: string;
    productType?: string;
    quantity: number;
    unitPrice: number;
    total: number;
    serials?: Array<{ serial: string; warrantyEnd?: string | null }>;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  paymentHistory?: Array<{
    date: string;
    amount: number;
    method: string;
  }>;
  notes?: string;
  terms?: string;
  paymentStatus?: string;
  amountPaid?: number;
}

// Simple Arabic text reversal for jsPDF (no native RTL support)
const reverseArabic = (text: string): string => {
  return text.split('').reverse().join('');
};

const downloadPDF = (doc: jsPDF, filename: string) => downloadPdfIOSSafe(doc, filename);

interface SerialProductGroup {
  label: string;
  quantity: number;
  serials: Array<{ serial: string; warrantyEnd?: string | null }>;
}

const buildSerialProductGroups = (items: InvoiceData["items"]): SerialProductGroup[] => {
  const groups = new Map<string, SerialProductGroup>();
  for (const item of items) {
    const label = item.sku?.trim() || item.description?.trim() || "Product";
    const existing = groups.get(label) || { label, quantity: 0, serials: [] };
    existing.quantity += Number(item.quantity) || 0;
    if (item.serials?.length) {
      existing.serials.push(...item.serials.filter((s) => s.serial?.trim()));
    }
    groups.set(label, existing);
  }
  return Array.from(groups.values());
};

const countRegisteredSerials = (groups: SerialProductGroup[]) =>
  groups.reduce((sum, g) => sum + g.serials.length, 0);

const renderSerialWarrantySection = (
  doc: jsPDF,
  startY: number,
  groups: SerialProductGroup[]
): number => {
  let y = startY;
  const pageHeight = 280;
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight) {
      doc.addPage();
      y = 20;
    }
  };

  ensureSpace(14);
  doc.setTextColor(25, 42, 65);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Serial Numbers & Warranty Registration", 15, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  for (const group of groups) {
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${group.label} (${group.quantity} unit${group.quantity !== 1 ? "s" : ""})`, 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");

    for (const entry of group.serials) {
      ensureSpace(6);
      const warrantyText = entry.warrantyEnd
        ? `Warranty until: ${entry.warrantyEnd}`
        : "No warranty on file";
      doc.text(`  \u2022 ${entry.serial}    ${warrantyText}`, 15, y);
      y += 5;
    }

    const unregisteredCount = Math.max(0, group.quantity - group.serials.length);
    for (let i = 0; i < unregisteredCount; i++) {
      ensureSpace(6);
      doc.text("  \u2022 [unregistered]    No warranty on file", 15, y);
      y += 5;
    }

    y += 4;
  }

  return y + 4;
};

export const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<void> => {
  const doc = new jsPDF();
  const company = await fetchCompanyInfo();
  const safeNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // ── Header Bar ──
  doc.setFillColor(25, 42, 65);
  doc.rect(0, 0, 210, 45, 'F');

  // Company info (English left)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(company.name, 15, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(company.tagline, 15, 25);
  doc.text(`${company.email} | ${company.phone}`, 15, 31);
  doc.text(`Tax ID: ${company.taxId}`, 15, 37);


  // ── Invoice Title ──
  doc.setTextColor(25, 42, 65);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 15, 62);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Fatura / Invoice", 60, 62);

  // ── Invoice details box (right) ──
  doc.setFillColor(245, 247, 250);
  doc.rect(130, 50, 65, 28, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(130, 50, 65, 28);

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, 135, 58);
  doc.text(`Date: ${invoiceData.invoiceDate}`, 135, 65);
  doc.text(`Due Date: ${invoiceData.dueDate}`, 135, 72);

  // ── Bill To ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 42, 65);
  doc.text("BILL TO:", 15, 90);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  let yPos = 98;
  doc.text(invoiceData.customer.name, 15, yPos);
  if (invoiceData.customer.company) {
    yPos += 6;
    doc.text(invoiceData.customer.company, 15, yPos);
  }
  yPos += 6;
  doc.text(invoiceData.customer.address || '', 15, yPos);
  if (invoiceData.customer.phone) {
    yPos += 6;
    doc.text(`Phone: ${invoiceData.customer.phone}`, 15, yPos);
  }
  if (invoiceData.customer.email) {
    yPos += 6;
    doc.text(`Email: ${invoiceData.customer.email}`, 15, yPos);
  }

  // Payment status badge (right side)
  const status = invoiceData.paymentStatus || 'pending';
  const paid = invoiceData.amountPaid || 0;
  if (status === 'paid' || paid >= invoiceData.totalAmount) {
    doc.setFillColor(34, 197, 94);
  } else if (paid > 0) {
    doc.setFillColor(234, 179, 8);
  } else {
    doc.setFillColor(239, 68, 68);
  }
  doc.roundedRect(140, 88, 50, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const statusText = status === 'paid' ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';
  doc.text(statusText, 165, 97, { align: "center" });

  // ── Items Table ──
  const tableY = yPos + 15;

  // Header row
  doc.setFillColor(25, 42, 65);
  doc.rect(15, tableY, 180, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Description", 18, tableY + 7);
  doc.text("Qty", 130, tableY + 7, { align: "right" });
  doc.text("Unit Price", 166, tableY + 7, { align: "right" });
  doc.text("Total", 193, tableY + 7, { align: "right" });

  // Rows
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  let rowY = tableY + 18;

  invoiceData.items.forEach((item, idx) => {
    const quantity = safeNumber(item.quantity);
    const unitPrice = safeNumber(item.unitPrice);
    const total = safeNumber(item.total ?? quantity * unitPrice);
    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(15, rowY - 5, 180, 10, 'F');
    }
    const meta = [item.brand, item.productType, item.sku].filter(Boolean).join(" • ");
    const main = meta ? `${item.description} (${meta})` : item.description;
    // Description column is 96mm wide (18 → 114). jsPDF wraps via maxWidth.
    const lines = doc.splitTextToSize(main, 94);
    const firstLine = Array.isArray(lines) ? lines[0] : main;
    doc.text(firstLine, 18, rowY);
    doc.text(quantity.toString(), 130, rowY, { align: "right" });
    doc.text(`${unitPrice.toLocaleString()} NIS`, 166, rowY, { align: "right" });
    doc.text(`${total.toLocaleString()} NIS`, 193, rowY, { align: "right" });
    rowY += 10;
  });

  // Table border
  doc.setDrawColor(200, 200, 200);
  doc.rect(15, tableY, 180, rowY - tableY);

  // ── Totals ──
  const totY = rowY + 10;
  doc.setFontSize(10);
  doc.text("Subtotal:", 135, totY);
  doc.text(`${invoiceData.subtotal.toLocaleString()} NIS`, 192, totY, { align: "right" });

  if (invoiceData.discountAmount && invoiceData.discountAmount > 0) {
    doc.text("Discount:", 135, totY + 7);
    doc.setTextColor(239, 68, 68);
    doc.text(`-${invoiceData.discountAmount.toLocaleString()} NIS`, 192, totY + 7, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  const taxLineY = totY + (invoiceData.discountAmount ? 14 : 7);
  if (invoiceData.taxAmount > 0) {
    doc.text(`Tax (${invoiceData.taxRate}%):`, 135, taxLineY);
    doc.text(`${invoiceData.taxAmount.toLocaleString()} NIS`, 192, taxLineY, { align: "right" });
  }

  // Grand total
  const grandY = taxLineY + 12;
  doc.setFillColor(25, 42, 65);
  doc.rect(125, grandY - 7, 70, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 130, grandY + 2);
  doc.text(`${invoiceData.totalAmount.toLocaleString()} NIS`, 192, grandY + 2, { align: "right" });

  // Amount paid line
  let contentEndY = grandY + 2;
  if (paid > 0) {
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(10);
    doc.text(`Amount Paid: ${paid.toLocaleString()} NIS`, 130, grandY + 14);
    const balance = invoiceData.totalAmount - paid;
    if (balance > 0) {
      doc.setTextColor(239, 68, 68);
      doc.text(`Balance Due: ${balance.toLocaleString()} NIS`, 130, grandY + 21);
      contentEndY = grandY + 21;
    } else {
      contentEndY = grandY + 14;
    }
  }

  const serialGroups = buildSerialProductGroups(invoiceData.items);
  if (countRegisteredSerials(serialGroups) > 0) {
    contentEndY = renderSerialWarrantySection(doc, contentEndY + 12, serialGroups);
  }

  // ── Payment History ──
  if (invoiceData.paymentHistory && invoiceData.paymentHistory.length > 0) {
    const phY = Math.max(contentEndY + 8, 200);
    doc.setTextColor(25, 42, 65);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Payment History", 15, phY);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    let py = phY + 8;
    invoiceData.paymentHistory.forEach(p => {
      doc.text(`${p.date} — ${p.method}: ${p.amount.toLocaleString()} NIS`, 15, py);
      py += 6;
    });
  }

  // ── Notes ──
  if (invoiceData.notes) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    const notesY = invoiceData.paymentHistory?.length
      ? undefined
      : Math.min(contentEndY + 8, 245);
    doc.text(`Notes: ${invoiceData.notes}`, 15, notesY ?? 245, { maxWidth: 180 });
  }

  // ── Footer (bank details) ──
  doc.setFillColor(25, 42, 65);
  doc.rect(0, 268, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Bank Details: ${company.bankDetails} | IBAN: ${company.iban}`, 15, 276);
  doc.text(`Thank you for choosing ${company.name}`, 15, 283);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 290);
  doc.text(company.website, 195, 290, { align: "right" });

  downloadPDF(doc, `${company.name.replace(/\s+/g, "-")}-Invoice-${invoiceData.invoiceNumber}.pdf`);
};

export const generatePaymentReceiptPDF = async (paymentData: {
  receiptNumber: string;
  paymentDate: string;
  customer: {
    name: string;
    company?: string;
  };
  amount: number;
  paymentMethod: string;
  forInvoice?: string;
  notes?: string;
}): Promise<void> => {
  const doc = new jsPDF();
  const company = await fetchCompanyInfo();

  doc.setFillColor(25, 42, 65);
  doc.rect(0, 0, 210, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(company.name, 15, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(company.tagline, 15, 28);
  doc.text(`${company.email} | ${company.phone}`, 15, 35);

  // Receipt title
  doc.setTextColor(34, 197, 94);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", 105, 65, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Receipt #: ${paymentData.receiptNumber}`, 15, 85);
  doc.text(`Date: ${paymentData.paymentDate}`, 15, 93);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Received From:", 15, 110);
  doc.setFont("helvetica", "normal");
  doc.text(paymentData.customer.name, 15, 118);
  if (paymentData.customer.company) {
    doc.text(paymentData.customer.company, 15, 126);
  }

  // Amount box
  doc.setFillColor(34, 197, 94);
  doc.rect(15, 140, 180, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Payment Amount: ${paymentData.amount.toLocaleString()} NIS`, 105, 156, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Payment Method: ${paymentData.paymentMethod}`, 15, 180);

  if (paymentData.forInvoice) {
    doc.text(`Applied to Invoice: ${paymentData.forInvoice}`, 15, 190);
  }
  if (paymentData.notes) {
    doc.text(`Notes: ${paymentData.notes}`, 15, 200);
  }

  doc.setTextColor(25, 42, 65);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Thank you for your payment!", 105, 230, { align: "center" });

  // Footer
  doc.setFillColor(25, 42, 65);
  doc.rect(0, 275, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 285);
  doc.text(`${company.name}`, 195, 285, { align: "right" });

  downloadPDF(doc, `${company.name.replace(/\s+/g, "-")}-Receipt-${paymentData.receiptNumber}.pdf`);
};

