// @ts-nocheck
import jsPDF from 'jspdf';
import { fetchCompanyInfo, downloadPdfIOSSafe } from './companySettings';

const savePdfBlob = (pdf: jsPDF, filename: string) => downloadPdfIOSSafe(pdf, filename);



interface WarrantyData {
  id: string;
  serial_number: string;
  warranty_type: string;
  warranty_period_months: number;
  warranty_start_date: string;
  warranty_end_date: string;
  product?: {
    name: string;
    sku?: string;
  };
  customer?: {
    contact_person: string;
    company_name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  notes?: string;
  installation_date?: string;
}

export const generateWarrantyCertificate = async (warranty: WarrantyData): Promise<void> => {
  const pdf = new jsPDF();
  const company = await fetchCompanyInfo();

  // ── Decorative Border ──
  pdf.setDrawColor(25, 42, 65);
  pdf.setLineWidth(3);
  pdf.rect(8, 8, 194, 281);
  pdf.setDrawColor(212, 175, 55);
  pdf.setLineWidth(1);
  pdf.rect(12, 12, 186, 273);

  // ── Header Bar ──
  pdf.setFillColor(25, 42, 65);
  pdf.rect(15, 15, 180, 35, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(company.name, 25, 30);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(company.tagline, 25, 38);
  pdf.text(`${company.website} | ${company.email}`, 25, 44);

  // ── Certificate Title ──
  pdf.setTextColor(25, 42, 65);
  pdf.setFontSize(28);
  pdf.setFont("helvetica", "bold");
  pdf.text("WARRANTY CERTIFICATE", 105, 70, { align: "center" });

  // Bilingual subtitle
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text("Warranty Certificate", 105, 79, { align: "center" });

  // Gold line
  pdf.setDrawColor(212, 175, 55);
  pdf.setLineWidth(2);
  pdf.line(40, 85, 170, 85);

  // ── Certificate Number ──
  pdf.setFillColor(245, 247, 250);
  pdf.rect(30, 92, 150, 12, 'F');
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(30, 92, 150, 12);
  pdf.setTextColor(25, 42, 65);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Certificate #: WC-${warranty.id.substring(0, 8).toUpperCase()}`, 105, 100, { align: "center" });

  // ── Two Column Layout ──
  const leftX = 25;
  const rightX = 115;
  let y = 118;

  // Customer Info
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(25, 42, 65);
  pdf.text("CUSTOMER", leftX, y);
  pdf.setDrawColor(25, 42, 65);
  pdf.line(leftX, y + 2, leftX + 60, y + 2);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  y += 10;
  pdf.text(`Name: ${warranty.customer?.contact_person || 'N/A'}`, leftX, y);
  y += 7;
  if (warranty.customer?.company_name) {
    pdf.text(`Company: ${warranty.customer.company_name}`, leftX, y);
    y += 7;
  }
  if (warranty.customer?.phone) {
    pdf.text(`Phone: ${warranty.customer.phone}`, leftX, y);
    y += 7;
  }
  if (warranty.customer?.address) {
    pdf.text(`Address: ${warranty.customer.address}`, leftX, y, { maxWidth: 75 });
    y += 7;
  }

  // Product Info
  let ry = 118;
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(25, 42, 65);
  pdf.text("PRODUCT", rightX, ry);
  pdf.line(rightX, ry + 2, rightX + 60, ry + 2);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  ry += 10;
  pdf.text(`Product: ${warranty.product?.name || 'N/A'}`, rightX, ry);
  ry += 7;
  if (warranty.product?.sku) {
    pdf.text(`Model/SKU: ${warranty.product.sku}`, rightX, ry);
    ry += 7;
  }
  pdf.text(`Serial #: ${warranty.serial_number}`, rightX, ry);

  // ── Warranty Details Section ──
  const detY = Math.max(y, ry) + 15;
  pdf.setFillColor(245, 247, 250);
  pdf.rect(20, detY, 170, 40, 'F');
  pdf.setDrawColor(212, 175, 55);
  pdf.rect(20, detY, 170, 40);

  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(25, 42, 65);
  pdf.text("WARRANTY DETAILS", 105, detY + 10, { align: "center" });

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);

  const installDate = warranty.installation_date
    ? new Date(warranty.installation_date).toLocaleDateString()
    : new Date(warranty.warranty_start_date).toLocaleDateString();
  const expiryDate = new Date(warranty.warranty_end_date).toLocaleDateString();

  pdf.text(`Purchase / Installation Date: ${installDate}`, 30, detY + 20);
  pdf.text(`Warranty Period: ${warranty.warranty_period_months} months`, 30, detY + 28);
  pdf.text(`Expiry Date: ${expiryDate}`, 130, detY + 20);

  // Status badge
  pdf.setFillColor(34, 197, 94);
  pdf.roundedRect(140, detY + 25, 40, 10, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("ACTIVE", 160, detY + 32, { align: "center" });

  // ── Terms & Coverage ──
  const termsY = detY + 52;
  pdf.setTextColor(25, 42, 65);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Terms & Coverage", 25, termsY);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);

  const coveredItems = [
    "COVERED: Manufacturing defects, material failures under normal use, component malfunction.",
    "COVERED: Free repair or replacement of defective parts within warranty period.",
    "NOT COVERED: Damage from misuse, improper installation, natural disasters, normal wear.",
    "NOT COVERED: Unauthorized modifications, third-party repairs, cosmetic damage.",
    "Customer must present this certificate and proof of purchase for any warranty claim.",
  ];

  let ty = termsY + 8;
  coveredItems.forEach(item => {
    pdf.text(item, 25, ty, { maxWidth: 160 });
    ty += 6;
  });

  // ── Claims Contact ──
  ty += 5;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(25, 42, 65);
  pdf.text("For Warranty Claims Contact:", 25, ty);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  ty += 7;
  pdf.text(`${company.name} | Phone: ${company.phone} | Email: ${company.warrantyContact}`, 25, ty);

  // ── Signature & Seal ──
  pdf.setDrawColor(212, 175, 55);
  pdf.setFillColor(212, 175, 55);
  pdf.circle(170, ty + 18, 10, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "bold");
  pdf.text("OFFICIAL", 164, ty + 16);
  pdf.text("SEAL", 166, ty + 20);

  pdf.setDrawColor(100, 100, 100);
  pdf.line(25, ty + 22, 85, ty + 22);
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Authorized Signature", 35, ty + 27);

  pdf.line(95, ty + 22, 150, ty + 22);
  pdf.text("Company Stamp", 110, ty + 27);

  // ── Footer ──
  pdf.setFillColor(25, 42, 65);
  pdf.rect(12, 275, 186, 10, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.text(company.name, 20, 281);
  pdf.text(`Certificate generated: ${new Date().toLocaleDateString()}`, 150, 281);

  savePdfBlob(pdf, `${company.name.replace(/\s+/g, "-")}-Warranty-${warranty.serial_number}.pdf`);
};

export const generateBulkWarrantyCertificates = async (warranties: WarrantyData[]): Promise<void> => {
  const pdf = new jsPDF();
  const company = await fetchCompanyInfo();
  let isFirstPage = true;

  for (const warranty of warranties) {
    if (!isFirstPage) pdf.addPage();

    pdf.setFillColor(25, 42, 65);
    pdf.rect(0, 0, 210, 28, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${company.name} — Warranty Certificate`, 15, 18);

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Certificate: WC-${warranty.id.substring(0, 8).toUpperCase()}`, 15, 42);
    pdf.text(`Serial Number: ${warranty.serial_number}`, 15, 50);
    pdf.text(`Product: ${warranty.product?.name || 'N/A'}`, 15, 58);
    pdf.text(`Customer: ${warranty.customer?.contact_person || 'N/A'}`, 15, 66);
    pdf.text(`Warranty Period: ${warranty.warranty_period_months} months`, 15, 74);
    pdf.text(`Valid Until: ${new Date(warranty.warranty_end_date).toLocaleDateString()}`, 15, 82);

    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text("This certificate is valid for warranty claims. Keep in a safe place.", 15, 270);
    pdf.text(`${company.name} — ${company.website}`, 15, 278);

    isFirstPage = false;
  }

  savePdfBlob(pdf, `${company.name.replace(/\s+/g, "-")}-Bulk-Warranties-${new Date().toISOString().split('T')[0]}.pdf`);
};
