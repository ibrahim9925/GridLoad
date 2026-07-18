// @ts-nocheck
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Eye, Calendar, FileText, DollarSign, Edit, AlertTriangle } from 'lucide-react';
import { generateInvoicePDF } from '@/utils/invoicePDF';
import { useToast } from '@/hooks/use-toast';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SalesDialog from "@/components/admin/SalesDialog";
import PaymentScheduleManager from "@/components/admin/sales/PaymentScheduleManager";
import PaymentDialog from "@/components/admin/PaymentDialog";
import SaleDetailDialog from "@/components/admin/sales/SaleDetailDialog";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOptimizedSalesData } from "@/hooks/useOptimizedSalesData";
import { useSalesInventoryIntegration } from "@/hooks/useSalesInventoryIntegration";
import { useEnhancedSalesInventoryIntegration } from "@/hooks/useEnhancedSalesInventoryIntegration";
import { useWarrantyAutoCreation } from "@/hooks/useWarrantyAutoCreation";

import { formatCurrency, formatNumber } from "@/utils/formatters";
import { supabase } from "@/integrations/supabase/client";

const Sales = () => {
  const {
    sales,
    salesStats,
    isLoading,
    paymentStatusFilter,
    setPaymentStatusFilter,
    salesRepFilter,
    setSalesRepFilter,
    dateRange,
    setDateRange,
    refreshSales,
  } = useOptimizedSalesData();

  const { createSaleWithIntegration } = useSalesInventoryIntegration();
  const { createCompleteSale, updateCompleteSale } = useEnhancedSalesInventoryIntegration();
  const { createWarrantiesForSale } = useWarrantyAutoCreation();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDialogSale, setPaymentDialogSale] = useState<any>(null);

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [invoicingId, setInvoicingId] = useState<string | null>(null);

  const openSaleDetail = (sale: any) => {
    setSelectedSale(sale);
    setDetailOpen(true);
  };

  const handleAddSale = () => {
    setSelectedSale(null);
    setIsEditMode(false);
    setDialogOpen(true);
  };

  const handleEditSale = (sale: any) => {
    setSelectedSale(sale);
    setIsEditMode(true);
    setDialogOpen(true);
  };

  const handleDeleteSale = (sale: any) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    
    try {
      // Delete sale items first
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleToDelete.id);

      if (itemsError) throw itemsError;

      // Delete the sale
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleToDelete.id);

      if (saleError) throw saleError;

      toast({
        title: "Success",
        description: "Sale deleted successfully",
      });
      
      refreshSales();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sale",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
    }
  };

  const handleViewPayments = (sale: any) => {
    setSelectedSale(sale);
    setPaymentDetailOpen(true);
  };

  const handleSaleSaved = async (saleData: any, saleItems: any[]) => {
    if (!saleData || !saleItems || saleItems.length === 0) {
      throw new Error('Invalid sale data: Missing customer or products');
    }
    if (!saleData.customer_id) {
      throw new Error('Customer selection is required');
    }

    const editingId = saleData.id || (isEditMode ? selectedSale?.id : undefined);
    const isEditing = Boolean(editingId);
    console.log('[Sales] handleSaleSaved', { isEditing, editingId, isEditMode, saleDataId: saleData.id });

    const sale = isEditing
      ? await updateCompleteSale(editingId, saleData, saleItems)
      : await createCompleteSale(saleData, saleItems);

    if (!sale) throw new Error(isEditing ? 'Sale update returned null' : 'Sale creation returned null');

    const invoiceLabel = sale.invoice_number || sale.sale_number || `#${sale.id.slice(0, 8)}`;
    toast({
      title: isEditing ? "Sale updated successfully" : "Sale created successfully",
      description: `Invoice ${invoiceLabel}`,
    });
    refreshSales();
    return sale;
  };

  const filteredSales = sales.filter(
    (sale) =>
      sale.customers?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaymentStatusVariant = (status: string | null) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "overdue":
        return "destructive";
      case "partial_paid":
        return "outline";
      case "installment_active":
        return "secondary";
      default:
        return "outline";
    }
  };

  const generateInvoice = async (sale: any) => {
    try {
      const [{ data: saleItems, error }, { data: serialRows }, { data: warrantyRows }] = await Promise.all([
        supabase
          .from('sale_items')
          .select(`*, products(name, sku, brand, product_type)`)
          .eq('sale_id', sale.id),
        supabase
          .from('product_serial_numbers')
          .select('product_id, serial_number')
          .eq('sale_id', sale.id),
        supabase
          .from('warranties')
          .select('serial_number, warranty_end_date, end_date, expiry_date')
          .eq('sale_id', sale.id),
      ]);

      if (error) throw error;

      const warrantyBySerial: Record<string, string | null> = {};
      (warrantyRows || []).forEach((w: any) => {
        if (!w.serial_number) return;
        const end = w.warranty_end_date || w.end_date || w.expiry_date || null;
        warrantyBySerial[w.serial_number] = end
          ? new Date(end).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
          : null;
      });

      const invoiceData = {
        invoiceNumber: sale.invoice_number || `INV-${sale.id.slice(0, 8)}`,
        invoiceDate: new Date(sale.sale_date).toLocaleDateString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        customer: {
          name: sale.customers?.contact_person || 'Customer',
          company: sale.customers?.company_name,
          address: sale.customers?.address || '',
          email: sale.customers?.email,
          phone: sale.customers?.phone
        },
        items: saleItems?.map((item: any) => {
          const sn = (serialRows || [])
            .filter((s: any) => s.product_id === item.product_id)
            .map((s: any) => ({
              serial: s.serial_number,
              warrantyEnd: warrantyBySerial[s.serial_number] ?? null,
            }));
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unit_price || 0);
          const lineTotal = Number(item.total ?? item.line_total ?? quantity * unitPrice);
          return {
            description: item.products?.name || 'Product',
            sku: item.products?.sku || undefined,
            brand: item.products?.brand || undefined,
            productType: item.products?.product_type || undefined,
            quantity,
            unitPrice,
            total: lineTotal,
            serials: sn,
          };
        }) || [],
        subtotal: sale.subtotal_before_discount || sale.total_amount,
        taxRate: sale.tax_rate || 0,
        taxAmount: sale.tax_amount || 0,
        discountAmount: sale.discount_amount || 0,
        totalAmount: sale.total_amount,
        balanceDue: sale.balance_due || 0,
        totalPaid: sale.total_paid || 0,
        paymentHistory: [],
        notes: sale.notes,
        terms: 'Payment due within 30 days. Thank you for your business!'
      };

      await generateInvoicePDF(invoiceData);
      toast({
        title: "Success",
        description: "Professional invoice generated with complete itemization",
      });
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Failed to generate invoice",
        description: error?.message || String(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const generateWarrantyCertificate = async (sale: any) => {
    try {
      // Fetch warranties for this sale
      const { data: warranties, error } = await supabase
        .from('warranties')
        .select(`
          *,
          products!warranties_product_id_fkey(name, warranty_months),
          customers!warranties_customer_id_fkey(contact_person, company_name, address, phone, email)
        `)
        .eq('sale_id', sale.id);

      if (error) throw error;

      if (!warranties || warranties.length === 0) {
        toast({
          title: "No Warranties",
          description: "This sale has no warranty certificates to generate.",
          variant: "destructive",
        });
        return;
      }

      // Generate warranty PDFs
      const { generateWarrantyCertificate, generateBulkWarrantyCertificates } = await import('@/utils/warrantyPDF');
      
      if (warranties.length === 1) {
        const warranty = warranties[0];
        await generateWarrantyCertificate({
          id: warranty.id,
          serial_number: warranty.serial_number,
          warranty_type: warranty.warranty_type || 'standard',
          warranty_period_months: warranty.warranty_period_months,
          warranty_start_date: warranty.warranty_start_date,
          warranty_end_date: warranty.warranty_end_date,
          product: {
            name: warranty.products?.name || 'Product'
          },
          customer: {
            contact_person: warranty.customers?.contact_person || 'Customer',
            company_name: warranty.customers?.company_name || '',
            address: warranty.customers?.address || '',
            phone: warranty.customers?.phone || '',
            email: warranty.customers?.email || ''
          },
          notes: warranty.notes || `Warranty for ${warranty.products?.name || 'Product'}`
        });
      } else {
        // Bulk generate for multiple warranties  
        await generateBulkWarrantyCertificates(warranties);
      }

      toast({
        title: "Success",
        description: `Generated ${warranties.length} warranty certificate(s)`,
      });
    } catch (error) {
      console.error('Error generating warranty certificate:', error);
      toast({
        title: "Error",
        description: "Failed to generate warranty certificate",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Sales Management</h1>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleAddSale}>
            <Plus className="mr-2 h-4 w-4" />
            New Sale
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold break-words">{formatCurrency(salesStats.totalRevenue)}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">{formatNumber(salesStats.salesCount)} orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600 break-words">{formatCurrency(salesStats.totalOutstanding)}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">To be collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Paid Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">{formatNumber(salesStats.paidSales)}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">Average Sale</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold break-words">{formatCurrency(salesStats.averageSale)}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Sales Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sales..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial_paid">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={salesRepFilter} onValueChange={setSalesRepFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sales Rep" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reps</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sales found. {searchTerm ? "Try a different search term." : "Create a sale to get started."}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    role="button"
                    tabIndex={0}
                    className="border rounded-lg p-3 bg-card cursor-pointer hover:bg-muted/40 transition"
                    onClick={() => openSaleDetail(sale)}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{sale.customers?.contact_person || "—"}</div>
                        {sale.customers?.company_name && (
                          <div className="text-xs text-muted-foreground truncate">{sale.customers.company_name}</div>
                        )}
                      </div>
                      <Badge variant={getPaymentStatusVariant(sale.payment_status)} className="text-[10px] shrink-0">
                        {sale.payment_status || "pending"}
                      </Badge>
                      {sale.has_missing_serials && (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-amber-400 text-amber-800 bg-amber-50">
                          <AlertTriangle className="h-3 w-3 mr-0.5" />
                          Serials
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-end gap-2 mt-2">
                      <div className="text-[11px] text-muted-foreground">
                        <div className="font-mono">{sale.sale_number || sale.invoice_number || `#${sale.id.slice(0, 8)}`}</div>
                        <div>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "-"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {formatCurrency(sale.total_amount, sale.currency || 'NIS')}
                        </div>
                        {sale.balance_due > 0 && (
                          <div className="text-[11px] text-red-600 font-medium">
                            Due {formatCurrency(sale.balance_due, sale.currency || 'NIS')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={invoicingId === sale.id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setInvoicingId(sale.id);
                          try { await generateInvoice(sale); } catch {}
                          finally { setInvoicingId(null); }
                        }}
                      >
                        {invoicingId === sale.id
                          ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          : <FileText className="h-4 w-4 mr-1" />}
                        Invoice
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setPaymentDialogSale(sale); setPaymentDialogOpen(true); }}>
                        <DollarSign className="h-4 w-4 mr-1" />Payment
                      </Button>
                      <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale); }}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Sales Rep</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{sale.customers?.contact_person}</div>
                            {sale.customers?.company_name && (
                              <div className="text-sm text-muted-foreground">{sale.customers.company_name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{sale.staff?.full_name || "-"}</TableCell>
                        <TableCell>
                          {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sale.currency || 'NIS'}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(sale.total_amount, sale.currency || 'NIS')}</TableCell>
                        <TableCell>
                          <span className={sale.balance_due && sale.balance_due > 0 ? "text-red-600 font-medium" : ""}>
                            {formatCurrency(sale.balance_due || 0, sale.currency || 'NIS')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={getPaymentStatusVariant(sale.payment_status)}>
                              {sale.payment_status || "pending"}
                            </Badge>
                            {sale.is_installment && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                Installment
                              </Badge>
                            )}
                            {sale.has_missing_serials && (
                              <Badge variant="outline" className="text-xs border-amber-400 text-amber-800 bg-amber-50">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Missing serials
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewPayments(sale)}>
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openSaleDetail(sale)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditSale(sale)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteSale(sale)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SalesDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setIsEditMode(false);
          setSelectedSale(null);
        }}
        onSave={handleSaleSaved}
        sale={isEditMode ? selectedSale : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sale</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this sale? This action cannot be undone.</p>
            {saleToDelete && (
              <p className="mt-2 text-sm text-muted-foreground">
                Sale: {saleToDelete.customers?.contact_person} - ${saleToDelete.total_amount}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSale}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Payment Detail Dialog */}
      <Dialog open={paymentDetailOpen} onOpenChange={setPaymentDetailOpen}>
        <DialogContent className="w-[95vw] min-w-[600px] sm:max-w-[720px] lg:max-w-[750px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Payment Details - {selectedSale?.sale_number || selectedSale?.invoice_number || `Sale #${selectedSale?.id?.slice(0,8)}`}
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <PaymentScheduleManager
              saleId={selectedSale.id}
              totalAmount={selectedSale.total_amount}
              isInstallment={selectedSale.is_installment || false}
              onPaymentSuccess={refreshSales}
            />
          )}
        </DialogContent>
      </Dialog>

      {paymentDialogSale && (
        <PaymentDialog
          open={paymentDialogOpen}
          onClose={() => { setPaymentDialogOpen(false); setPaymentDialogSale(null); }}
          saleId={paymentDialogSale.id}
          customerId={paymentDialogSale.customer_id}
          saleAmount={paymentDialogSale.total_amount || 0}
          balanceDue={paymentDialogSale.balance_due ?? paymentDialogSale.total_amount ?? 0}
          onSuccess={() => { refreshSales(); setPaymentDialogOpen(false); setPaymentDialogSale(null); }}
        />
      )}

      <SaleDetailDialog
        sale={selectedSale}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRecordPayment={(s) => {
          setPaymentDialogSale(s);
          setPaymentDialogOpen(true);
          setDetailOpen(false);
        }}
        onDownloadInvoice={generateInvoice}
        onDownloadWarranties={generateWarrantyCertificate}
      />
    </div>
  );
};

export default Sales;
