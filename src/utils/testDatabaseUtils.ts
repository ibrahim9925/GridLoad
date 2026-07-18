// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { testDataFactory } from "@/services/TestDataFactory";
import { TestDataEnhancer } from "./testDataEnhancer";

/**
 * Database utilities for test setup and validation
 */
export class TestDatabaseUtils {
  
  /**
   * Valid enum values for database compliance
   */
  static readonly VALID_ENUMS = {
    // Container enums - CRITICAL: Only valid database values  
    containerStatus: ['ordered', 'confirmed', 'shipped', 'in_transit', 'port_arrival', 'customs_cleared', 'completed'],
    containerType: ['20ft', '40ft'],
    // Sales and fulfillment enums - CRITICAL: Only valid database values
    fulfillmentStatus: ['pending', 'packed', 'shipped', 'delivered', 'cancelled'],
    paymentMethod: ['cash', 'check', 'bank_transfer', 'credit_card', 'other'],
    // Bank and financial enums - CRITICAL: Exact database enum values
    transactionType: ['IN', 'OUT', 'TRANSFER'],
    claimType: ['repair', 'replacement', 'refund'],
    // User and system enums
    userRole: ['admin', 'sales_rep', 'accountant', 'warehouse', 'installer'],
    leadStatus: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
    leadType: ['solar_calculator', 'general', 'supplier'],
    installationStatus: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    // Payment status enums
    paymentStatus: ['pending', 'partial_paid', 'paid', 'overdue', 'cancelled']
  };

  /**
   * Creates comprehensive test prerequisites with full validation - PHASE 1 & 5 ENHANCED
   */
  static async createTestPrerequisites() {
    try {
      console.log('🔧 Creating comprehensive test prerequisites with enhanced setup...');
      
      // PHASE 5: Check if adequate prerequisites already exist
      const existingStaffCheck = await supabase
        .from('staff')
        .select('id, role, commission_rate, is_active')
        .eq('is_active', true);
      
      const existingSalesRepsWithCommission = existingStaffCheck.data?.filter(
        s => s.role === 'sales_rep' && s.commission_rate > 0
      ).length || 0;
      
      if (existingSalesRepsWithCommission >= 2) {
        console.log('✅ Adequate staff prerequisites already exist, using existing data');
        const customer = await this.ensureTestCustomer();
        const products = await this.ensureTestProducts();
        
        return {
          staff: existingStaffCheck.data?.find(s => s.role === 'sales_rep'),
          allStaff: existingStaffCheck.data || [],
          customer: customer,
          product: products[0],
          allProducts: products,
          salesReps: existingStaffCheck.data?.filter(s => s.role === 'sales_rep') || []
        };
      }

      // PHASE 1: Use enhanced test data creation
      console.log('🚀 Creating new comprehensive test data setup...');
      const comprehensiveData = await TestDataEnhancer.setupComprehensiveTestData();
      
      return {
        staff: comprehensiveData.staff.salesReps[0], // Primary sales rep
        allStaff: comprehensiveData.staff.allStaff,
        customer: comprehensiveData.customer,
        supplier: comprehensiveData.supplier,
        product: comprehensiveData.products[0], // Primary product
        allProducts: comprehensiveData.products,
        admin: comprehensiveData.staff.admin,
        warehouse: comprehensiveData.staff.warehouse,
        accountant: comprehensiveData.staff.accountant,
        installer: comprehensiveData.staff.installer,
        salesReps: comprehensiveData.staff.salesReps
      };
    } catch (error) {
      console.error('❌ Failed to create comprehensive test prerequisites:', error);
      throw error;
    }
  }

  /**
   * Ensure test customer exists or create one
   */
  static async ensureTestCustomer() {
    try {
      const existing = await supabase
        .from('customers')
        .select('*')
        .like('email', '%@gridload.test')
        .limit(1);

      if (existing.data && existing.data.length > 0) {
        return existing.data[0];
      }

      const customerData = testDataFactory.createCustomer();
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          company_name: customerData.company_name,
          contact_person: customerData.contact_person,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address
        })
        .select()
        .single();

      if (error) throw error;
      return customer;
    } catch (error) {
      console.error('Failed to ensure test customer:', error);
      throw error;
    }
  }

  /**
   * Ensure test supplier exists or create one
   */
  static async ensureTestSupplier() {
    try {
      const existing = await supabase
        .from('suppliers')
        .select('*')
        .like('email', '%@gridload.test')
        .eq('is_active', true)
        .limit(1);

      if (existing.data && existing.data.length > 0) {
        return existing.data[0];
      }

      const supplierData = testDataFactory.createSupplier();
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .insert({
          name: supplierData.name,
          contact_person: supplierData.contact_person,
          email: supplierData.email,
          phone: supplierData.phone,
          address: supplierData.address,
          lead_time_days: 7,
          min_order_amount: 100,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return supplier;
    } catch (error) {
      console.error('Failed to ensure test supplier:', error);
      throw error;
    }
  }

  /**
   * Ensure test products exist or create them
   */
  static async ensureTestProducts() {
    try {
      const existing = await supabase
        .from('products')
        .select('*')
        .like('sku', 'SKU-%')
        .eq('is_active', true)
        .limit(3);

      if (existing.data && existing.data.length >= 3) {
        return existing.data.slice(0, 3);
      }

      const products = [];
      for (let i = 0; i < 3; i++) {
        const uniqueSKU = this.generateUniqueSKU();
        const productData = testDataFactory.createProduct();
        const { data: product, error } = await supabase
          .from('products')
          .insert({
            name: `${productData.name} ${i + 1}`,
            sku: uniqueSKU,
            category: productData.category,
            cost_price: productData.cost_price ?? 0,
            standard_selling_price: productData.standard_selling_price ?? 0,
            current_stock: productData.current_stock ?? 0,
            reorder_point: productData.reorder_point ?? 20,
            reorder_quantity: productData.reorder_quantity ?? 50,
            warranty_months: productData.warranty_months ?? 12,
            is_active: true,
            description: `Test product ${i + 1} for automated testing`,
            requires_installation: i === 0
          })
          .select()
          .single();

        if (error) throw error;
        products.push(product);
      }

      return products;
    } catch (error) {
      console.error('Failed to ensure test products:', error);
      throw error;
    }
  }
  static async cleanupTestData() {
    try {
      console.log('🧹 Starting comprehensive test data cleanup...');
      
      // Order matters for foreign key constraints - delete children first
      const cleanupOperations = [
        // Financial records first
        supabase.from('payments').delete().like('reference_number', 'TEST%'),
        supabase.from('bank_ledger').delete().like('reference_number', 'TEST%'),
        supabase.from('commission_payments').delete().like('payment_reference', 'TEST%'),
        
        // Operational records
        supabase.from('sale_items').delete().in('sale_id', 
          (await supabase.from('sales').select('id').like('invoice_number', 'TEST%')).data?.map(s => s.id) || []
        ),
        supabase.from('quotation_items').delete().in('quotation_id',
          (await supabase.from('quotations').select('id').like('quote_number', 'TEST%')).data?.map(q => q.id) || []
        ),
        supabase.from('stock_movements').delete().eq('reference_type', 'test'),
        supabase.from('warranties').delete().like('serial_number', 'TEST%'),
        supabase.from('installations').delete().like('installation_notes', '%Test%'),
        
        // Core business records
        supabase.from('sales').delete().like('invoice_number', 'TEST%'),
        supabase.from('quotations').delete().like('quote_number', 'TEST%'),
        supabase.from('leads').delete().like('email', '%@test.com'),
        
        // Master data - be careful with staff as they might be referenced
        supabase.from('products').delete().like('sku', 'TEST%'),
        supabase.from('customers').delete().or('company_name.like.Test%,email.like.%@test.com'),
        supabase.from('suppliers').delete().like('email', '%@test.com'),
        supabase.from('staff').delete().like('email', '%@test.com')
      ];

      const results = await Promise.allSettled(cleanupOperations);
      const failedOperations = results.filter(r => r.status === 'rejected');
      
      if (failedOperations.length > 0) {
        console.warn('⚠️ Some cleanup operations failed:', failedOperations);
      } else {
        console.log('✅ Test data cleanup completed successfully');
      }
    } catch (error) {
      console.warn('⚠️ Cleanup failed, continuing with tests:', error);
    }
  }

  /**
   * Validate database prerequisites
   */
  static async validatePrerequisites() {
    try {
      const checks = await Promise.all([
        supabase.from('staff').select('id').eq('is_active', true).limit(1),
        supabase.from('customers').select('id').limit(1),
        supabase.from('products').select('id').eq('is_active', true).limit(1)
      ]);

      return {
        hasActiveStaff: checks[0].data && checks[0].data.length > 0,
        hasCustomers: checks[1].data && checks[1].data.length > 0,
        hasProducts: checks[2].data && checks[2].data.length > 0,
        allValid: checks.every(check => check.data && check.data.length > 0)
      };
    } catch (error) {
      return {
        hasActiveStaff: false,
        hasCustomers: false,
        hasProducts: false,
        allValid: false,
        error: error.message
      };
    }
  }

  /**
   * Create valid test sale with all requirements
   */
  static async createValidTestSale(customerId?: string, productId?: string, staffId?: string) {
    try {
      // Get or create prerequisites
      let customer, product, staff;
      
      if (!customerId || !productId || !staffId) {
        const prerequisites = await this.createTestPrerequisites();
        customer = prerequisites.customer;
        product = prerequisites.product;
        staff = prerequisites.staff;
      } else {
        // Use provided IDs
        const [customerResult, productResult, staffResult] = await Promise.all([
          supabase.from('customers').select('*').eq('id', customerId).single(),
          supabase.from('products').select('*').eq('id', productId).single(),
          supabase.from('staff').select('*').eq('id', staffId).single()
        ]);
        
        customer = customerResult.data;
        product = productResult.data;
        staff = staffResult.data;
      }

      // Create sale with valid data
      const saleData: any = {
        customer_id: customer.id,
        sale_date: new Date().toISOString().split('T')[0],
        subtotal: 1000,
        tax_amount: 100,
        total_amount: 1100,
        payment_status: 'pending',
        fulfillment_status: 'pending',
        invoice_number: `TEST-INV-${Date.now()}`
      };

      // Add staff ID if available
      if (staff) {
        saleData.sales_rep_id = staff.id;
        saleData.created_by = staff.id;
      }

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale item
      const { data: saleItem, error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: sale.id,
          product_id: product.id,
          quantity: 2,
          unit_price: 500,
          line_total: 1000
        })
        .select()
        .single();

      if (itemError) throw itemError;

      return { sale, saleItem, customer, product, staff };
    } catch (error) {
      console.error('Failed to create valid test sale:', error);
      throw error;
    }
  }

  /**
   * Get random valid enum value
   */
  static getRandomEnum<T extends keyof typeof TestDatabaseUtils.VALID_ENUMS>(enumType: T): string {
    const values = this.VALID_ENUMS[enumType];
    return values[Math.floor(Math.random() * values.length)];
  }

  /**
   * Enhanced unique ID generation with collision prevention and entropy
   */
  private static idCounter = 0;
  static generateUniqueId(prefix: string = 'TEST'): string {
    TestDatabaseUtils.idCounter++;
    const timestamp = Date.now();
    const counter = TestDatabaseUtils.idCounter.toString().padStart(6, '0');
    const entropy = Math.random().toString(36).substr(2, 8);
    const processId = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${counter}-${entropy}-${processId}`;
  }

  /**
   * Generate unique SKU with enhanced collision prevention
   */
  static generateUniqueSKU(prefix: string = 'SKU'): string {
    return this.generateUniqueId(prefix);
  }

  /**
   * Generate unique container number
   */
  static generateUniqueContainerNumber(): string {
    return this.generateUniqueId('CONT');
  }

  /**
   * Generate unique reference number for financial records
   */
  static generateUniqueReferenceNumber(prefix: string = 'REF'): string {
    return this.generateUniqueId(prefix);
  }
}