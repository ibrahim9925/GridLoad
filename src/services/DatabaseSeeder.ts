// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { testDataFactory, TestCustomer, TestProduct, TestStaff, TestSupplier, TestLead } from "./TestDataFactory";

export interface SeederResult {
  success: boolean;
  message: string;
  insertedData?: {
    customers: any[];
    products: any[];
    staff: any[];
    suppliers: any[];
    leads: any[];
  };
  error?: string;
}

export interface SeederOptions {
  customerCount?: number;
  productCount?: number;
  staffCount?: number;
  supplierCount?: number;
  leadCount?: number;
  cleanup?: boolean; // Whether to cleanup existing test data first
}

/**
 * DatabaseSeeder - Manages test data population and cleanup
 * Provides different seeding scenarios for various testing needs
 */
export class DatabaseSeeder {
  private testPrefix = 'TEST_';

  /**
   * Clean up all existing test data
   */
  async cleanupTestData(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      console.log("🧹 DatabaseSeeder: Starting test data cleanup...");

      // Delete in dependency order (reverse of creation)
      const cleanupOperations = [
        { table: 'warranty_claims', filter: 'warranty_id' },
        { table: 'warranties', filter: 'serial_number' },
        { table: 'payments', filter: 'reference_number' },
        { table: 'sale_items', filter: 'id' }, // Will be cleaned via sale deletion
        { table: 'sales', filter: 'invoice_number' },
        { table: 'installations', filter: 'installation_notes' },
        { table: 'leads', filter: 'full_name' },
        { table: 'stock_movements', filter: 'notes' },
        { table: 'customers', filter: 'contact_person' },
        { table: 'products', filter: 'name' },
        { table: 'suppliers', filter: 'name' },
        { table: 'staff', filter: 'full_name' }
      ];

      let totalDeleted = 0;

      for (const operation of cleanupOperations) {
        try {
          const { data, error } = await supabase
            .from(operation.table as any)
            .delete()
            .like(operation.filter, `${this.testPrefix}%`)
            .select('id');

          if (error) {
            console.warn(`⚠️ DatabaseSeeder: Cleanup warning for ${operation.table}:`, error.message);
          } else {
            const deletedCount = data?.length || 0;
            totalDeleted += deletedCount;
            if (deletedCount > 0) {
              console.log(`✅ DatabaseSeeder: Cleaned ${deletedCount} records from ${operation.table}`);
            }
          }
        } catch (cleanupError) {
          console.warn(`⚠️ DatabaseSeeder: Non-critical cleanup error for ${operation.table}:`, cleanupError);
        }
      }

      return {
        success: true,
        message: `Test data cleanup completed. Removed ${totalDeleted} test records.`
      };

    } catch (error: any) {
      console.error("❌ DatabaseSeeder: Cleanup failed:", error);
      return {
        success: false,
        message: "Test data cleanup failed",
        error: error.message
      };
    }
  }

  /**
   * Seed basic test data for general testing
   */
  async seedBasicTestData(options: SeederOptions = {}): Promise<SeederResult> {
    try {
      console.log("🌱 DatabaseSeeder: Starting basic test data seeding...");

      // Cleanup existing test data if requested
      if (options.cleanup) {
        const cleanupResult = await this.cleanupTestData();
        if (!cleanupResult.success) {
          return {
            success: false,
            message: "Failed to cleanup existing test data",
            error: cleanupResult.error
          };
        }
      }

      const insertedData = {
        customers: [],
        products: [],
        staff: [],
        suppliers: [],
        leads: []
      };

      // 1. Insert Customers
      const customerData = testDataFactory.createCustomers(options.customerCount || 3);
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .insert(customerData)
        .select();

      if (customerError) throw new Error(`Customer insertion failed: ${customerError.message}`);
      insertedData.customers = customers || [];
      console.log(`✅ DatabaseSeeder: Inserted ${customers?.length || 0} customers`);

      // 2. Insert Products (with warranty and installation requirements)
      const productData = testDataFactory.createProducts(options.productCount || 5, {
        warranty_months: 12, // Ensure warranty products exist
        requires_installation: true // Ensure installation products exist
      });
      
      const { data: products, error: productError } = await supabase
        .from('products')
        .insert(productData)
        .select();

      if (productError) throw new Error(`Product insertion failed: ${productError.message}`);
      insertedData.products = products || [];
      console.log(`✅ DatabaseSeeder: Inserted ${products?.length || 0} products`);

      // 3. Insert Staff (ensure we have all roles)
      const staffData = [
        testDataFactory.createStaff({ role: 'admin' }),
        testDataFactory.createStaff({ role: 'sales_rep', commission_rate: 5 }),
        testDataFactory.createStaff({ role: 'accountant' }),
        testDataFactory.createStaff({ role: 'warehouse' }),
        testDataFactory.createStaff({ role: 'installer' })
      ];
      
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .insert(staffData as any)
        .select();

      if (staffError) throw new Error(`Staff insertion failed: ${staffError.message}`);
      insertedData.staff = staff || [];
      console.log(`✅ DatabaseSeeder: Inserted ${staff?.length || 0} staff members`);

      // 4. Insert Suppliers
      const supplierData = testDataFactory.createSuppliers(options.supplierCount || 2);
      const { data: suppliers, error: supplierError } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select();

      if (supplierError) throw new Error(`Supplier insertion failed: ${supplierError.message}`);
      insertedData.suppliers = suppliers || [];
      console.log(`✅ DatabaseSeeder: Inserted ${suppliers?.length || 0} suppliers`);

      // 5. Insert Leads (link some to customers and staff)
      const leadData = testDataFactory.createLeads(options.leadCount || 4);
      
      // Link some leads to existing customers and staff
      if (customers && customers.length > 0 && staff && staff.length > 0) {
        const salesReps = staff.filter(s => s.role === 'sales_rep');
        leadData.forEach((lead, index) => {
          if (index % 2 === 0 && customers[index % customers.length]) {
            lead.customer_id = customers[index % customers.length].id;
          }
          if (salesReps.length > 0) {
            lead.assigned_to = salesReps[index % salesReps.length].id;
          }
        });
      }
      
      const { data: leads, error: leadError } = await supabase
        .from('leads')
        .insert(leadData as any)
        .select();

      if (leadError) throw new Error(`Lead insertion failed: ${leadError.message}`);
      insertedData.leads = leads || [];
      console.log(`✅ DatabaseSeeder: Inserted ${leads?.length || 0} leads`);

      console.log("🎉 DatabaseSeeder: Basic test data seeding completed successfully!");
      
      return {
        success: true,
        message: `Successfully seeded test data: ${customers?.length || 0} customers, ${products?.length || 0} products, ${staff?.length || 0} staff, ${suppliers?.length || 0} suppliers, ${leads?.length || 0} leads`,
        insertedData
      };

    } catch (error: any) {
      console.error("❌ DatabaseSeeder: Seeding failed:", error);
      return {
        success: false,
        message: "Test data seeding failed",
        error: error.message
      };
    }
  }

  /**
   * Seed comprehensive test data for advanced testing scenarios
   */
  async seedComprehensiveTestData(): Promise<SeederResult> {
    try {
      console.log("🌱 DatabaseSeeder: Starting comprehensive test data seeding...");
      
      // First seed basic data
      const basicResult = await this.seedBasicTestData({
        customerCount: 5,
        productCount: 8,
        staffCount: 7,
        supplierCount: 3,
        leadCount: 10,
        cleanup: true
      });

      if (!basicResult.success || !basicResult.insertedData) {
        return basicResult;
      }

      const { customers, products, staff } = basicResult.insertedData;

      // Create additional complex test scenarios
      const salesRep = staff.find(s => s.role === 'sales_rep');
      
      if (customers.length > 0 && products.length > 0 && salesRep) {
        // Create test sales with items for workflow testing
        const testSales = [];
        for (let i = 0; i < 3; i++) {
          const customer = customers[i % customers.length];
          const saleData = testDataFactory.createSale(customer.id, {
            sales_rep_id: salesRep.id,
            requires_installation: true,
            requires_warranty: true
          });

          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert(saleData)
            .select()
            .single();

          if (saleError) {
            console.warn(`⚠️ DatabaseSeeder: Sale creation warning:`, saleError.message);
            continue;
          }

          testSales.push(sale);

          // Create sale items
          const saleItems = [];
          for (let j = 0; j < 2; j++) {
            const product = products[j % products.length];
            const itemData = testDataFactory.createSaleItem(sale.id, product.id);
            saleItems.push(itemData);
          }

          const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(saleItems);

          if (itemsError) {
            console.warn(`⚠️ DatabaseSeeder: Sale items creation warning:`, itemsError.message);
          }
        }

        console.log(`✅ DatabaseSeeder: Created ${testSales.length} test sales with items`);
      }

      return {
        success: true,
        message: "Comprehensive test data seeding completed with advanced scenarios",
        insertedData: basicResult.insertedData
      };

    } catch (error: any) {
      console.error("❌ DatabaseSeeder: Comprehensive seeding failed:", error);
      return {
        success: false,
        message: "Comprehensive test data seeding failed",
        error: error.message
      };
    }
  }

  /**
   * Check if sufficient test data exists
   */
  async checkTestDataAvailability(): Promise<{
    success: boolean;
    message: string;
    availability: {
      customers: number;
      products: number;
      staff: number;
      suppliers: number;
      leads: number;
      warrantyProducts: number;
      installationProducts: number;
      salesReps: number;
    };
  }> {
    try {
      const availability = {
        customers: 0,
        products: 0,
        staff: 0,
        suppliers: 0,
        leads: 0,
        warrantyProducts: 0,
        installationProducts: 0,
        salesReps: 0
      };

      // Check customers
      const { data: customers } = await supabase.from('customers').select('id').limit(1);
      availability.customers = customers?.length || 0;

      // Check products
      const { data: products } = await supabase.from('products').select('id, warranty_months, requires_installation');
      availability.products = products?.length || 0;
      availability.warrantyProducts = products?.filter(p => p.warranty_months > 0).length || 0;
      availability.installationProducts = products?.filter(p => p.requires_installation).length || 0;

      // Check staff
      const { data: staff } = await supabase.from('staff').select('id, role');
      availability.staff = staff?.length || 0;
      availability.salesReps = staff?.filter(s => s.role === 'sales_rep').length || 0;

      // Check suppliers
      const { data: suppliers } = await supabase.from('suppliers').select('id').limit(1);
      availability.suppliers = suppliers?.length || 0;

      // Check leads
      const { data: leads } = await supabase.from('leads').select('id').limit(1);
      availability.leads = leads?.length || 0;

      const hasMinimumData = 
        availability.customers > 0 &&
        availability.products > 0 &&
        availability.staff > 0 &&
        availability.suppliers > 0 &&
        availability.salesReps > 0;

      return {
        success: hasMinimumData,
        message: hasMinimumData 
          ? "Sufficient test data available for testing"
          : "Insufficient test data - seeding recommended",
        availability
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Failed to check test data availability",
        availability: {
          customers: 0,
          products: 0,
          staff: 0,
          suppliers: 0,
          leads: 0,
          warrantyProducts: 0,
          installationProducts: 0,
          salesReps: 0
        }
      };
    }
  }
}

export const databaseSeeder = new DatabaseSeeder();