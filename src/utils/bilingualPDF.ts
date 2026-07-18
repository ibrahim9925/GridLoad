// @ts-nocheck
import jsPDF from "jspdf";
import { ensureArabicFont, ARABIC_FONT_NAME } from "./arabicFont";
import { downloadPdfIOSSafe } from "./companySettings";

const openPdf = (doc: jsPDF, filename: string) => downloadPdfIOSSafe(doc, filename);


// Render Arabic with the embedded Amiri font + RTL flag.
const ar = (doc: any, text: string, x: number, y: number, size = 9, bold = false) => {
  const prevFont = doc.getFont();
  const prevSize = doc.getFontSize();
  try {
    doc.setFont(ARABIC_FONT_NAME, bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, x, y, { align: "right", isInputRtl: true } as any);
  } catch {
    doc.text(text, x, y, { align: "right" });
  } finally {
    doc.setFont(prevFont.fontName, prevFont.fontStyle);
    doc.setFontSize(prevSize);
  }
};

const drawHeader = (doc: jsPDF, titleEn: string, titleAr: string) => {
  doc.setFillColor(25, 42, 65);
  doc.rect(0, 0, 210, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("GridLoad Energy Solutions", 15, 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Solar Equipment Import & Distribution — Palestine", 15, 22);
  doc.text("info@gridloadenergy.com  |  +970-XXX-XXXX", 15, 27);
  doc.text("Tax ID: PS-XXXXXXX", 15, 32);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("GridLoad", 195, 16, { align: "right" });
  ar(doc, "حلول الطاقة الشمسية - فلسطين", 195, 22, 9);

  doc.setTextColor(25, 42, 65);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(titleEn, 15, 52);
  ar(doc, titleAr, 195, 52, 16, true);
  doc.setTextColor(25, 42, 65);
};

const drawFooter = (doc: jsPDF) => {
  const h = doc.internal.pageSize.height;
  doc.setFillColor(25, 42, 65);
  doc.rect(0, h - 20, 210, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Bank of Palestine | IBAN PS00XXXXXXXXXXXXXXXXXXXX", 15, h - 12);
  doc.text("GridLoad Energy Solutions — Powering Palestine with Clean Energy", 15, h - 7);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 195, h - 7, { align: "right" });
};

// ──────────────────────────── STATEMENT ────────────────────────────
export interface StatementEntry {
  date: string;
  type: string;
  reference: string;
  originalAmount: number | null;
  originalCurrency: string | null;
  debitNis: number;
  creditNis: number;
  balanceNis: number;
}

export interface StatementData {
  customer: { name: string; company?: string; address?: string; phone?: string; email?: string };
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  entries: StatementEntry[];
  closingBalance: number;
  overdueAmount?: number;
  overdueDays?: number;
}

export const generateStatementPDF = async (d: StatementData): Promise<void> => {
  const doc = new jsPDF();
  await ensureArabicFont(doc);
  drawHeader(doc, "STATEMENT OF ACCOUNT", "كشف حساب");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  // Customer info
  doc.setFillColor(245, 247, 250);
  doc.rect(15, 60, 90, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 18, 67);
  doc.setFont("helvetica", "normal");
  doc.text(d.customer.name, 18, 73);
  if (d.customer.company) doc.text(d.customer.company, 18, 78);
  if (d.customer.address) doc.text(d.customer.address.substring(0, 50), 18, 83);
  if (d.customer.phone) doc.text(`Tel: ${d.customer.phone}`, 18, 88);

  // Period box
  doc.setFillColor(245, 247, 250);
  doc.rect(115, 60, 80, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Period:", 118, 67);
  doc.setFont("helvetica", "normal");
  doc.text(`From: ${d.periodStart}`, 118, 73);
  doc.text(`To:   ${d.periodEnd}`, 118, 78);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 118, 83);
  doc.text(`Opening Balance: ${d.openingBalance.toLocaleString()} NIS`, 118, 88);

  // Table header
  let y = 102;
  doc.setFillColor(25, 42, 65);
  doc.rect(15, y, 180, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Date", 17, y + 6);
  doc.text("Type", 40, y + 6);
  doc.text("Reference", 62, y + 6);
  doc.text("Original", 102, y + 6);
  doc.text("Debit", 130, y + 6);
  doc.text("Credit", 150, y + 6);
  doc.text("Balance", 175, y + 6);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += 14;

  // Opening row
  doc.setFillColor(235, 240, 245);
  doc.rect(15, y - 5, 180, 8, "F");
  doc.text("Opening Balance", 17, y);
  doc.text(`${d.openingBalance.toLocaleString()} NIS`, 195, y, { align: "right" });
  y += 9;

  d.entries.forEach((e, i) => {
    if (y > 250) {
      drawFooter(doc);
      doc.addPage();
      drawHeader(doc, "STATEMENT OF ACCOUNT", "كشف حساب");
      y = 65;
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(15, y - 5, 180, 8, "F");
    }
    doc.text(e.date, 17, y);
    doc.text(e.type, 40, y);
    doc.text(e.reference.substring(0, 18), 62, y);
    if (e.originalCurrency && e.originalCurrency !== "NIS" && e.originalAmount != null) {
      doc.text(`${e.originalAmount.toLocaleString()} ${e.originalCurrency}`, 102, y);
    } else {
      doc.text("—", 102, y);
    }
    doc.text(e.debitNis > 0 ? e.debitNis.toLocaleString() : "—", 130, y);
    doc.text(e.creditNis > 0 ? e.creditNis.toLocaleString() : "—", 150, y);
    doc.text(`${e.balanceNis.toLocaleString()}`, 195, y, { align: "right" });
    y += 8;
  });

  // Closing
  y += 4;
  doc.setFillColor(25, 42, 65);
  doc.rect(15, y - 5, 180, 11, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Closing Balance", 17, y + 2);
  doc.text(`${d.closingBalance.toLocaleString()} NIS`, 195, y + 2, { align: "right" });

  // Overdue
  if (d.overdueAmount && d.overdueAmount > 0) {
    y += 16;
    doc.setFillColor(220, 38, 38);
    doc.rect(15, y - 5, 180, 11, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(
      `OVERDUE: ${d.overdueAmount.toLocaleString()} NIS — ${d.overdueDays ?? 0} days`,
      17,
      y + 2
    );
    ar(doc, `المبلغ المتأخر: ${d.overdueAmount.toLocaleString()} شيكل`, 193, y + 2, 10, true);
  }

  drawFooter(doc);
  openPdf(doc, `GridLoad-Statement-${d.customer.name.replace(/\s+/g, "-")}.pdf`);
};

// ──────────────────────────── QUOTATION ────────────────────────────
export interface QuotationPdfData {
  quoteNumber: string;
  version?: number;
  quoteDate: string;
  validUntil?: string;
  customer: { name: string; company?: string; address?: string; phone?: string; email?: string };
  items: Array<{ description: string; quantity: number; unitPrice: number; discount?: number; total: number }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  terms?: string;
  notes?: string;
}

export const generateQuotationPDF = async (q: QuotationPdfData): Promise<void> => {
  const doc = new jsPDF();
  await ensureArabicFont(doc);
  drawHeader(doc, "PRICE OFFER", "عرض سعر");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  // Customer
  doc.setFillColor(245, 247, 250);
  doc.rect(15, 60, 90, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 18, 67);
  doc.setFont("helvetica", "normal");
  doc.text(q.customer.name, 18, 73);
  if (q.customer.company) doc.text(q.customer.company, 18, 78);
  if (q.customer.address) doc.text(q.customer.address.substring(0, 50), 18, 83);
  if (q.customer.phone) doc.text(`Tel: ${q.customer.phone}`, 18, 88);

  // Meta
  doc.setFillColor(245, 247, 250);
  doc.rect(115, 60, 80, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.text(`Quote # ${q.quoteNumber}${q.version && q.version > 1 ? ` v${q.version}` : ""}`, 118, 67);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${q.quoteDate}`, 118, 73);
  if (q.validUntil) doc.text(`Valid Until: ${q.validUntil}`, 118, 78);
  doc.text(`Currency: ${q.currency}`, 118, 83);

  // Items table
  let y = 102;
  doc.setFillColor(25, 42, 65);
  doc.rect(15, y, 180, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Description", 17, y + 6);
  doc.text("Qty", 115, y + 6);
  doc.text("Unit Price", 130, y + 6);
  doc.text("Disc%", 158, y + 6);
  doc.text("Total", 178, y + 6);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += 13;
  q.items.forEach((it, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(15, y - 5, 180, 8, "F");
    }
    doc.text((it.description || "").substring(0, 60), 17, y);
    doc.text(String(it.quantity), 115, y);
    doc.text(it.unitPrice.toLocaleString(), 130, y);
    doc.text(String(it.discount ?? 0), 158, y);
    doc.text(it.total.toLocaleString(), 195, y, { align: "right" });
    y += 8;
  });

  // Totals
  y += 6;
  doc.setFontSize(10);
  doc.text(`Subtotal: ${q.subtotal.toLocaleString()} ${q.currency}`, 130, y);
  y += 6;
  if (q.discountAmount > 0) {
    doc.setTextColor(239, 68, 68);
    doc.text(`Discount: -${q.discountAmount.toLocaleString()} ${q.currency}`, 130, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }
  if (q.taxAmount > 0) {
    doc.text(`Tax: ${q.taxAmount.toLocaleString()} ${q.currency}`, 130, y);
    y += 6;
  }
  y += 2;
  doc.setFillColor(25, 42, 65);
  doc.rect(125, y - 5, 70, 11, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`TOTAL: ${q.totalAmount.toLocaleString()} ${q.currency}`, 192, y + 2, { align: "right" });

  // Terms
  if (q.terms) {
    y += 18;
    doc.setTextColor(25, 42, 65);
    doc.setFontSize(10);
    doc.text("Terms & Conditions:", 15, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(q.terms, 180);
    doc.text(lines, 15, y + 6);
    y += 6 + lines.length * 4;
  }

  // Signature
  const h = doc.internal.pageSize.height;
  const sigY = Math.min(h - 35, y + 20);
  doc.setDrawColor(150, 150, 150);
  doc.line(20, sigY, 90, sigY);
  doc.line(120, sigY, 190, sigY);
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Customer Signature", 20, sigY + 5);
  doc.text("GridLoad Authorized Signature", 120, sigY + 5);

  drawFooter(doc);
  openPdf(doc, `GridLoad-Quotation-${q.quoteNumber}.pdf`);
};
