// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { TestDatabaseUtils } from './testDatabaseUtils';

/**
 * PHASE 1: Enhanced test data creation with comprehensive staff and prerequisite setup
 */
export class TestDataEnhancer {
  
  /**
   * Create comprehensive staff setup for commission and sales testing
   */
  static async createDiverseStaffSetup() {
    try {
      console.log('🏢 Creating diverse staff setup for comprehensive testing...');
      
      const staffMembers = [];
      
      // Create Admin (CRITICAL - must be first for permissions)
      const adminStaff = await supabase
        .from('staff')
        .insert({
          id: crypto.randomUUID(),
          full_name: `Test Admin ${Date.now()}`,
          email: `admin-${Date.now()}@gridload.test`,
          role: 'admin',
          is_active: true,
          commission_rate: 0.0
        })
        .select()
        .single();
      
      if (adminStaff.error) throw adminStaff.error;
      staffMembers.push(adminStaff.data);

      // Create Sales Representatives with proper commission rates (PHASE 1 CRITICAL FIX)
      const salesRepRates = [5.0, 7.5, 10.0]; // Store as percentages: 5%, 7.5%, 10%
      for (let i = 0; i < salesRepRates.length; i++) {
        const salesRep = await supabase
          .from('staff')
          .insert({
            id: crypto.randomUUID(),
            full_name: `Sales Rep ${i + 1} ${Date.now()}`,
            email: `salesrep${i + 1}-${Date.now()}@gridload.test`,
            role: 'sales_rep',
            is_active: true,
            commission_rate: salesRepRates[i]
          })
          .select()
          .single();
        
        if (salesRep.error) throw salesRep.error;
        staffMembers.push(salesRep.data);
      }

      // Create Accountant (for financial tests)
      const accountant = await supabase
        .from('staff')
        .insert({
          id: crypto.randomUUID(),
          full_name: `Test Accountant ${Date.now()}`,
          email: `accountant-${Date.now()}@gridload.test`,
          role: 'accountant',
          is_active: true,
          commission_rate: 0.0
        })
        .select()
        .single();
      
      if (accountant.error) throw accountant.error;
      staffMembers.push(accountant.data);

      // Create Warehouse Manager
      const warehouse = await supabase
        .from('staff')
        .insert({
          id: crypto.randomUUID(),
          full_name: `Warehouse Manager ${Date.now()}`,
          email: `warehouse-${Date.now()}@gridload.test`,
          role: 'warehouse',
          is_active: true,
          commission_rate: 0.0
        })
        .select()
        .single();
      
      if (warehouse.error) throw warehouse.error;
      staffMembers.push(warehouse.data);

      // Create Installer
      const installer = await supabase
        .from('staff')
        .insert({
          id: crypto.randomUUID(),
          full_name: `Test Installer ${Date.now()}`,
          email: `installer-${Date.now()}@gridload.test`,
          role: 'installer',
          is_active: true,
          commission_rate: 0.0
        })
        .select()
        .single();
      
      if (installer.error) throw installer.error;
      staffMembers.push(installer.data);

      console.log(`✅ Created ${staffMembers.length} diverse staff members`);
      return {
        admin: adminStaff.data,
        salesReps: staffMembers.filter(s => s.role === 'sales_rep'),
        accountant: accountant.data,
        warehouse: warehouse.data,
        installer: installer.data,
        allStaff: staffMembers
      };
    } catch (error) {
      console.error('❌ Failed to create diverse staff setup:', error);
      throw error;
    }
  }

  /**
   * Create comprehensive products with proper pricing margins (PHASE 2 FIX)
   */
  static async createValidTestProducts() {
    try {
      console.log('📦 Creating valid test products with proper pricing...');
      
      const products = [];
      const categories = ['Solar Panels', 'Inverters', 'Batteries', 'Installation Equipment'];
      
      for (let i = 0; i < categories.length; i++) {
        const costPrice = 100 + (i * 50);
        const sellingPrice = Math.round(costPrice * 1.4); // 40% markup minimum
        
        const product = await supabase
          .from('products')
          .insert({
            name: `${categories[i]} Test Product ${Date.now()}`,
            sku: TestDatabaseUtils.generateUniqueSKU(),
            category: categories[i],
            cost_price: costPrice,
            standard_selling_price: sellingPrice,
            min_selling_price: Math.round(costPrice * 1.2), // 20% minimum markup
            max_selling_price: Math.round(costPrice * 2.0), // 100% maximum markup
            current_stock: 100,
            reorder_point: 20,
            reorder_quantity: 50,
            warranty_months: 24,
            is_active: true,
            description: `Test product for ${categories[i]} testing`,
            requires_installation: i === 0 // First product requires installation
          })
          .select()
          .single();
        
        if (product.error) throw product.error;
        products.push(product.data);
      }

      console.log(`✅ Created ${products.length} valid test products`);
      return products;
    } catch (error) {
      console.error('❌ Failed to create test products:', error);
      throw error;
    }
  }

  /**
   * Comprehensive test data setup - combines all prerequisites
   */
  static async setupComprehensiveTestData() {
    try {
      console.log('🚀 Setting up comprehensive test data for enhanced testing...');
      
      const [staffSetup, products] = await Promise.all([
        this.createDiverseStaffSetup(),
        this.createValidTestProducts()
      ]);

      // Create test customer
      const customer = await supabase
        .from('customers')
        .insert({
          company_name: `Test Customer Corp ${Date.now()}`,
          contact_person: 'Test Contact Person',
          email: `customer-${Date.now()}@gridload.test`,
          phone: '+970591234567',
          address: 'Test Address, Test City'
        })
        .select()
        .single();
      
      if (customer.error) throw customer.error;

      // Create test supplier
      const supplier = await supabase
        .from('suppliers')
        .insert({
          name: `Test Supplier Ltd ${Date.now()}`,
          contact_person: 'Supplier Contact',
          email: `supplier-${Date.now()}@gridload.test`,
          phone: '+970591234568',
          address: 'Supplier Address',
          lead_time_days: 7,
          min_order_amount: 1000,
          is_active: true
        })
        .select()
        .single();
      
      if (supplier.error) throw supplier.error;

      console.log('✅ Comprehensive test data setup completed successfully');
      
      return {
        staff: staffSetup,
        products: products,
        customer: customer.data,
        supplier: supplier.data,
        summary: {
          totalStaff: staffSetup.allStaff.length,
          salesRepsWithCommission: staffSetup.salesReps.length,
          totalProducts: products.length,
          hasCustomer: true,
          hasSupplier: true
        }
      };
    } catch (error) {
      console.error('❌ Comprehensive test data setup failed:', error);
      throw error;
    }
  }

  // Legacy method compatibility - delegate to TestDatabaseUtils
  static generateUniqueId(prefix: string = 'TEST'): string {
    return TestDatabaseUtils.generateUniqueId(prefix);
  }

  static generateUniqueSKU(prefix: string = 'SKU'): string {
    return TestDatabaseUtils.generateUniqueSKU(prefix);
  }

  // Additional methods for compatibility with existing code
  static async createValidCustomer(config?: any) {
    const defaults = {
      company_name: `Test Customer ${Date.now()}`,
      contact_person: 'Test Contact',
      email: `test-${Date.now()}@gridload.test`,
      phone: '+970591234567',
      address: 'Test Address'
    };
    
    return await supabase
      .from('customers')
      .insert({ ...defaults, ...(config || {}) })
      .select()
      .single();
  }

  static async createValidProduct(config?: any) {
    const defaults = {
      name: `Test Product ${Date.now()}`,
      sku: this.generateUniqueSKU(),
      category: 'Test Category',
      cost_price: 100,
      standard_selling_price: 140,
      current_stock: 50,
      is_active: true
    };
    
    return await supabase
      .from('products')
      .insert({ ...defaults, ...(config || {}) })
      .select()
      .single();
  }

  static async createValidSupplier(config?: any) {
    const defaults = {
      name: `Test Supplier ${Date.now()}`,
      contact_person: 'Test Contact',
      email: `supplier-${Date.now()}@gridload.test`,
      phone: '+970591234568',
      address: 'Test Address',
      is_active: true
    };
    
    return await supabase
      .from('suppliers')
      .insert({ ...defaults, ...(config || {}) })
      .select()
      .single();
  }

  static async createValidContainer(config?: any) {
    const defaults = {
      container_number: this.generateUniqueId('CONT'),
      container_type: '20ft',
      status: 'ordered',
      order_date: new Date().toISOString().split('T')[0]
    };
    
    return await supabase
      .from('containers')
      .insert({ ...defaults, ...(config || {}) })
      .select()
      .single();
  }

  static async createValidPayment(saleId: string) {
    return await supabase
      .from('payments')
      .insert({
        sale_id: saleId,
        amount: 100,
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
  }

  static async createValidBankLedgerEntry(config?: any) {
    // First check if bank accounts exist
    const { data: bankAccounts } = await supabase
      .from('bank_accounts')
      .select('id')
      .limit(1);
    
    let bankAccountId;
    if (!bankAccounts || bankAccounts.length === 0) {
      // Create a test bank account
      const bankAccount = await supabase
        .from('bank_accounts')
        .insert({
          name: `Test Bank Account ${Date.now()}`,
          account_number: `ACC-${Date.now()}`,
          currency: 'NIS',
          current_balance: 10000
        })
        .select()
        .single();
      
      if (bankAccount.error) throw bankAccount.error;
      bankAccountId = bankAccount.data.id;
    } else {
      bankAccountId = bankAccounts[0].id;
    }

    const defaults = {
      bank_account_id: bankAccountId,
      transaction_type: 'IN',
      amount: 100,
      currency: 'NIS',
      date: new Date().toISOString().split('T')[0]
    };

    return await supabase
      .from('bank_ledger')
      .insert({ ...defaults, ...(config || {}) })
      .select()
      .single();
  }

  static async createTestScenario() {
    try {
      const [customer, product, supplier] = await Promise.all([
        this.createValidCustomer(),
        this.createValidProduct(), 
        this.createValidSupplier()
      ]);

      // Return in expected format with staff information
      return { 
        customer: customer.data, 
        product: product.data, 
        supplier: supplier.data,
        staff: null, // Add staff property for compatibility
        cleanup: () => this.batchCleanup() // Add cleanup function
      };
    } catch (error) {
      console.error('Failed to create test scenario:', error);
      throw error;
    }
  }

  static async batchCleanup(options?: any) {
    try {
      console.log('🧹 Running batch cleanup of test data...');
      
      // Use the TestDatabaseUtils cleanup method
      await TestDatabaseUtils.cleanupTestData();
      
      console.log('✅ Batch cleanup completed');
      return true; // Return success indicator
    } catch (error) {
      console.warn('⚠️ Batch cleanup failed:', error);
      return false;
    }
  }
}