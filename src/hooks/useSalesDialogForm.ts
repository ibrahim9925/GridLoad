// @ts-nocheck
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSalesInventoryIntegration } from "./useSalesInventoryIntegration";
import { getCache, setCache } from "@/lib/sessionCache";
import {
  type SerialEntry,
  buildDefaultSerialEntries,
  computeHasMissingSerials,
  serialEntriesToNumbers,
} from "@/lib/serialInventory";

const CUSTOMERS_CACHE_KEY = "salesDialog:customers";
const STAFF_CACHE_KEY = "salesDialog:staff";

interface Customer {
  id: string;
  contact_person: string;
  company_name: string | null;
  default_discount_percentage: number | null;
}

interface Staff {
  id: string;
  full_name: string;
}

interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  stock_available: number;
  is_serialized?: boolean;
  serial_number?: string;
  serial_numbers?: string[];
  selected_serial_ids?: string[];
  serial_entries?: SerialEntry[];
  has_missing_serials?: boolean;
  warranty_months?: number | null;
  product_type?: string | null;
  brand?: string | null;
}

interface FormData {
  customer_id: string;
  payment_status: string;
  sale_date: Date;
  sales_rep: string;
  notes: string;
  saleItems: SaleItem[];
  discount_type: string;
  discount_percentage: number;
  discount_amount: number;
  tax_rate: number;
  delivery_charges: number;
  delivery_company_name: string;
  delivery_date: string;
  expected_payment_date: string;
}

export const useSalesDialogForm = (open: boolean, sale?: any) => {
  const [formData, setFormData] = useState<FormData>({
    customer_id: "",
    payment_status: "pending",
    sale_date: new Date(),
    sales_rep: "",
    notes: "",
    saleItems: [],
    discount_type: "percentage",
    discount_percentage: 0,
    discount_amount: 0,
    tax_rate: 0,
    delivery_charges: 0,
    delivery_company_name: "",
    delivery_date: "",
    expected_payment_date: "",
  });
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentPlanType, setInstallmentPlanType] = useState("30-70");
  const { toast } = useToast();
  const { updateInventoryOnSale, createInstallationFromSale, createWarrantyFromSale } = useSalesInventoryIntegration();

  // Add cleanup to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup function to prevent state updates after unmount
      setIsLoading(false);
    };
  }, []);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchStaff();
      
      if (sale) {
        console.log("📝 SalesDialog: Loading sale data for editing:", sale);
        loadSaleData(sale);
      } else {
        resetForm();
      }
    }
  }, [open, sale]);

  const loadSaleData = async (saleData: any) => {
    try {
      const [{ data: saleItems, error }, { data: linkedSerials, error: serialsError }] = await Promise.all([
        supabase
          .from("sale_items")
          .select(`
            *,
            product:products(name, current_stock, is_serialized, warranty_months, product_type, brand)
          `)
          .eq("sale_id", saleData.id),
        supabase
          .from("product_serial_numbers")
          .select("id, serial_number, product_id")
          .eq("sale_id", saleData.id)
          .order("serial_number"),
      ]);

      if (error) throw error;
      if (serialsError) throw serialsError;

      const serialsByProduct: Record<string, { id: string; serial_number: string }[]> = {};
      (linkedSerials || []).forEach((s: any) => {
        if (!serialsByProduct[s.product_id]) serialsByProduct[s.product_id] = [];
        serialsByProduct[s.product_id].push(s);
      });
      const serialCursor: Record<string, number> = {};

      const qtyOnSaleByProduct: Record<string, number> = {};
      (saleItems || []).forEach((item: any) => {
        const pid = item.product_id;
        if (!pid) return;
        qtyOnSaleByProduct[pid] =
          (qtyOnSaleByProduct[pid] || 0) + (Number(item.quantity) || 0);
      });

      const formattedItems: SaleItem[] = (saleItems || []).map((item: any) => {
        const pool = serialsByProduct[item.product_id] || [];
        const start = serialCursor[item.product_id] || 0;
        const qty = Number(item.quantity) || 0;
        const currentStock = Number(item.product?.current_stock) || 0;
        const alreadyOnThisSale = qtyOnSaleByProduct[item.product_id] || qty;

        const slice = pool.slice(start, start + qty);
        serialCursor[item.product_id] = start + slice.length;

        const serialEntries: SerialEntry[] = slice.map((s) => ({
          mode: "pick" as const,
          serial_id: s.id,
          serial_number: s.serial_number,
        }));
        for (let i = slice.length; i < qty; i++) {
          serialEntries.push({ mode: "text", serial_number: "" });
        }

        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product?.name || "Unknown Product",
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.total ?? item.line_total ?? (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
          stock_available: currentStock + alreadyOnThisSale,
          is_serialized: !!item.product?.is_serialized,
          warranty_months: item.product?.warranty_months ?? null,
          product_type: item.product?.product_type ?? null,
          brand: item.product?.brand ?? null,
          serial_entries: serialEntries.length ? serialEntries : buildDefaultSerialEntries(qty, 0),
          selected_serial_ids: slice.map((s) => s.id),
          serial_numbers: slice.map((s) => s.serial_number),
          has_missing_serials: item.has_missing_serials ?? computeHasMissingSerials(serialEntries, qty),
        };
      });

      setFormData({
        customer_id: saleData.customer_id || "",
        payment_status: saleData.payment_status || "pending",
        sale_date: saleData.sale_date ? new Date(saleData.sale_date) : new Date(),
        sales_rep: saleData.sales_rep_id || "",
        notes: saleData.notes || "",
        saleItems: formattedItems,
        discount_type: saleData.discount_type || "percentage",
        discount_percentage: saleData.discount_percentage || 0,
        discount_amount: saleData.discount_amount || 0,
        tax_rate: saleData.tax_rate || 0,
        delivery_charges: saleData.delivery_charges || 0,
        delivery_company_name: saleData.delivery_company_name || "",
        delivery_date: saleData.delivery_date || "",
        expected_payment_date: saleData.expected_payment_date || "",
      });
    } catch (error) {
      console.error("Error loading sale data:", error);
      toast({
        variant: "destructive",
        title: "Error loading sale data",
        description: "Please try again.",
      });
    }
  };

  const fetchCustomers = async () => {
    const cached = getCache<any[]>(CUSTOMERS_CACHE_KEY);
    if (cached && cached.length) {
      setCustomers(cached);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, contact_person, company_name, default_discount_percentage")
        .order("contact_person");
      if (error) throw error;
      const list = data || [];
      setCustomers(list);
      setCache(CUSTOMERS_CACHE_KEY, list);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({ variant: "destructive", title: "Error loading customers", description: "Please try again." });
    }
  };

  const fetchStaff = async () => {
    const cached = getCache<any[]>(STAFF_CACHE_KEY);
    if (cached && cached.length) {
      setStaff(cached);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      const list = data || [];
      setStaff(list);
      setCache(STAFF_CACHE_KEY, list);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast({ variant: "destructive", title: "Error loading staff", description: "Please try again." });
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: "",
      payment_status: "pending",
      sale_date: new Date(),
      sales_rep: "",
      notes: "",
      saleItems: [],
      discount_type: "percentage",
      discount_percentage: 0,
      discount_amount: 0,
      tax_rate: 0,
      delivery_charges: 0,
      delivery_company_name: "",
      delivery_date: "",
      expected_payment_date: "",
    });
  };

  const handleInputChange = (field: keyof FormData, value: string | Date | SaleItem[] | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSaleItem = (item: SaleItem) => {
    setFormData(prev => ({
      ...prev,
      saleItems: [...prev.saleItems, item]
    }));
  };

  const handleRemoveSaleItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      saleItems: prev.saleItems.filter(item => item.id !== itemId)
    }));
  };

  const handleUpdateSaleItem = (itemId: string, updates: Partial<SaleItem>) => {
    setFormData(prev => ({
      ...prev,
      saleItems: prev.saleItems.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    }));
  };

  const getSelectedCustomer = () => {
    return customers.find(customer => customer.id === formData.customer_id);
  };

  const getSubtotalBeforeDiscount = () => {
    return formData.saleItems.reduce((sum, item) => sum + item.line_total, 0);
  };

  const getDiscountAmount = () => {
    const subtotal = getSubtotalBeforeDiscount();
    if (formData.discount_type === "percentage") {
      return (subtotal * formData.discount_percentage) / 100;
    }
    return formData.discount_amount;
  };

  const getSubtotalAfterDiscount = () => {
    const subtotalAfterDiscount =
      getSubtotalBeforeDiscount() - getDiscountAmount();
    const taxAmount = ((formData.tax_rate || 0) * subtotalAfterDiscount) / 100;
    return subtotalAfterDiscount + taxAmount + (formData.delivery_charges || 0);
  };

  const handleApplyCustomerDiscount = () => {
    const customer = getSelectedCustomer();
    if (customer?.default_discount_percentage) {
      setFormData(prev => ({
        ...prev,
        discount_type: "percentage",
        discount_percentage: customer.default_discount_percentage || 0,
      }));
    }
  };

  const validateForm = () => {
    if (!formData.customer_id) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a customer.",
      });
      return false;
    }

    if (formData.saleItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please add at least one product to the sale.",
      });
      return false;
    }

    // Validate discount doesn't exceed subtotal
    if (getDiscountAmount() > getSubtotalBeforeDiscount()) {
      toast({
        variant: "destructive",
        title: "Discount Error",
        description: "Discount amount cannot exceed the subtotal.",
      });
      return false;
    }

    return true;
  };

  const createPaymentSchedule = async (saleId: string, totalAmount: number) => {
    if (!isInstallment || installmentPlanType === "custom") return;

    let scheduleData: { installment_number: number; amount: number; due_date: string }[] = [];
    const today = new Date();

    switch (installmentPlanType) {
      case "30-70":
        scheduleData = [
          {
            installment_number: 1,
            amount: totalAmount * 0.3,
            due_date: today.toISOString().split('T')[0], // Due today
          },
          {
            installment_number: 2,
            amount: totalAmount * 0.7,
            due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days later
          },
        ];
        break;
      case "50-25-25":
        scheduleData = [
          {
            installment_number: 1,
            amount: totalAmount * 0.5,
            due_date: today.toISOString().split('T')[0],
          },
          {
            installment_number: 2,
            amount: totalAmount * 0.25,
            due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
          {
            installment_number: 3,
            amount: totalAmount * 0.25,
            due_date: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        ];
        break;
      case "25-25-25-25":
        scheduleData = [
          {
            installment_number: 1,
            amount: totalAmount * 0.25,
            due_date: today.toISOString().split('T')[0],
          },
          {
            installment_number: 2,
            amount: totalAmount * 0.25,
            due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
          {
            installment_number: 3,
            amount: totalAmount * 0.25,
            due_date: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
          {
            installment_number: 4,
            amount: totalAmount * 0.25,
            due_date: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        ];
        break;
    }

    if (scheduleData.length > 0) {
      const scheduleWithSaleId = scheduleData.map(item => ({
        ...item,
        sale_id: saleId,
      }));

      const { error } = await supabase
        .from("payment_schedules")
        .insert(scheduleWithSaleId);

      if (error) {
        console.error("Error creating payment schedule:", error);
        throw error;
      }
    }
  };

  const prepareSubmitData = () => {
    const subtotalBeforeDiscount = getSubtotalBeforeDiscount();
    const discountAmount = getDiscountAmount();
    const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount;
    const taxAmount = ((formData.tax_rate || 0) * subtotalAfterDiscount) / 100;
    const totalWithTaxAndDelivery = subtotalAfterDiscount + taxAmount + (formData.delivery_charges || 0);

    // Prepare clean sale data (only sales table columns)
    const saleData = {
      customer_id: formData.customer_id,
      sales_rep_id: formData.sales_rep || null,
      payment_status: isInstallment ? "installment_active" : formData.payment_status,
      sale_date: formData.sale_date.toISOString().split('T')[0],
      notes: formData.notes.trim() || null,
      subtotal_before_discount: subtotalBeforeDiscount,
      discount_type: formData.discount_type,
      discount_percentage: formData.discount_percentage,
      discount_amount: discountAmount,
      subtotal: subtotalAfterDiscount,
      tax_amount: taxAmount,
      tax_rate: formData.tax_rate || 0,
      delivery_charges: formData.delivery_charges || 0,
      delivery_company_name: formData.delivery_company_name || null,
      delivery_date: formData.delivery_date || null,
      expected_payment_date: formData.expected_payment_date || null,
      total_amount: totalWithTaxAndDelivery,
      is_installment: isInstallment,
      installment_plan_type: isInstallment ? installmentPlanType : null,
      balance_due: totalWithTaxAndDelivery,
      fulfillment_status: 'pending',
    };

    // Prepare sale items separately
    const saleItems = formData.saleItems.map(item => {
      const entries = item.serial_entries || [];
      const hasMissing = item.has_missing_serials ?? computeHasMissingSerials(entries, item.quantity);
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.line_total,
        serial_number: (item.serial_numbers?.[0] || item.serial_number)?.trim?.() || null,
        selected_serial_ids: item.selected_serial_ids || [],
        serial_numbers: item.serial_numbers || serialEntriesToNumbers(entries),
        serial_entries: entries,
        has_missing_serials: hasMissing,
        warranty_months: item.warranty_months,
      };
    });

    return {
      saleData,
      saleItems
    };
  };

  const handleSaleCreated = async (saleData: any, saleItems: any[]) => {
    try {
      console.log('🔧 Processing post-sale integrations for sale:', saleData.id);
      
      // Update inventory (handled by sales inventory integration)
      await updateInventoryOnSale(saleItems, saleData.id);
      
      // Create installation if needed
      await createInstallationFromSale(saleData);
      
      console.log('✅ Sale integration completed successfully');
    } catch (error) {
      console.error('❌ Error in sale integration:', error);
    }
  };

  return {
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
    resetForm,
  };
};
