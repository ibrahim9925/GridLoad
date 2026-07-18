// @ts-nocheck
// UUID generation using crypto.randomUUID or fallback

export interface TestCustomer {
  id?: string;
  contact_person: string;
  company_name: string;
  email: string;
  phone: string;
  address?: string;
  credit_limit?: number;
  payment_terms?: string;
  is_active?: boolean;
}

export interface TestProduct {
  id?: string;
  name: string;
  sku: string;
  category: string;
  cost_price: number;
  selling_price: number;
  standard_selling_price: number;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  requires_installation?: boolean;
  warranty_months?: number;
  is_active?: boolean;
}

export interface TestStaff {
  id?: string;
  full_name: string;
  email: string;
  role: 'admin' | 'sales_rep' | 'accountant' | 'warehouse' | 'installer';
  commission_rate?: number;
  is_active?: boolean;
}

export interface TestSupplier {
  id?: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address?: string;
  payment_terms?: string;
  lead_time_days?: number;
  is_active?: boolean;
}

export interface TestLead {
  id?: string;
  customer_id?: string;
  assigned_to?: string;
  full_name: string;
  email: string;
  phone: string;
  lead_type: 'solar_calculator' | 'general' | 'supplier';
  status: 'new' | 'contacted' | 'quoted' | 'closed_won' | 'closed_lost';
  estimated_value?: number;
  notes?: string;
}

export interface TestSale {
  id?: string;
  customer_id: string;
  sales_rep_id?: string;
  sale_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'partial_paid' | 'paid';
  invoice_number: string;
  requires_installation?: boolean;
  requires_warranty?: boolean;
}

export interface TestSaleItem {
  id?: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

/**
 * TestDataFactory - Generates realistic test data for all system entities
 * Used by system testers to create consistent, valid test data
 */
export class TestDataFactory {
  private testPrefix = 'TEST_';
  private timestamp = Date.now();
  private counter = 0;

  /**
   * Generate unique test ID with prefix to identify test data
   */
  private generateTestId(): string {
    return this.testPrefix + crypto.randomUUID();
  }

  /**
   * Generate unique test identifier ensuring no duplicates
   */
  private generateTestIdentifier(): string {
    this.counter += 1;
    return `${this.testPrefix}${this.timestamp}_${this.counter}_${Math.random().toString(36).substr(2, 5)}`;
  }

  /**
   * Generate unique SKU to prevent constraint violations
   */
  private generateUniqueSKU(): string {
    return `SKU-${this.timestamp}-${this.counter++}-${Math.random().toString(36).substr(2, 5)}`;
  }

  /**
   * Get valid enum values for database compliance
   */
  private getValidEnums() {
    return {
      // FIXED: Use only valid database enum values
      containerStatus: ['ordered', 'confirmed', 'shipped', 'in_transit', 'port_arrival', 'customs_clearance', 'local_transit', 'out_for_delivery', 'delivered', 'completed'],
      fulfillmentStatus: ['pending', 'packed', 'shipped', 'delivered', 'cancelled'], // FIXED: Removed 'processing'
      paymentMethod: ['cash', 'check', 'bank_transfer', 'credit_card', 'other'], // FIXED: Reordered to match database
      transactionType: ['IN', 'OUT', 'TRANSFER'], // FIXED: Use exact database enum values
      containerType: ['20ft', '40ft'], // FIXED: Only valid database values
      claimType: ['repair', 'replacement', 'refund'] // FIXED: Use exact database enum values
    };
  }

  /**
   * Create test customer data
   */
  createCustomer(overrides: Partial<TestCustomer> = {}): TestCustomer {
    const identifier = this.generateTestIdentifier();
    return {
      contact_person: `Test Customer ${identifier}`,
      company_name: `Test Company ${identifier}`,
      email: `customer${identifier.toLowerCase()}@test.example.com`,
      phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      address: `123 Test Street, Test City, TC 12345`,
      credit_limit: 10000,
      payment_terms: 'net_30',
      is_active: true,
      ...overrides
    };
  }

  /**
   * Create multiple test customers
   */
  createCustomers(count: number, overrides: Partial<TestCustomer> = {}): TestCustomer[] {
    return Array.from({ length: count }, () => this.createCustomer(overrides));
  }

  /**
   * Create test product data with unique SKU
   */
  createProduct(overrides: Partial<TestProduct> = {}): TestProduct {
    const identifier = this.generateTestIdentifier();
    const categories = ['Solar Panels', 'Inverters', 'Batteries', 'Mounting Systems', 'Cables'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    return {
      name: `Test ${category} ${identifier}`,
      sku: this.generateUniqueSKU(),
      category,
      cost_price: Math.floor(Math.random() * 500) + 100,
      selling_price: Math.floor(Math.random() * 800) + 200,
      standard_selling_price: Math.floor(Math.random() * 800) + 200,
      current_stock: Math.floor(Math.random() * 100) + 50,
      reorder_point: 20,
      reorder_quantity: 50,
      requires_installation: Math.random() > 0.5,
      warranty_months: [0, 12, 24, 36][Math.floor(Math.random() * 4)],
      is_active: true,
      ...overrides
    };
  }

  /**
   * Create multiple test products
   */
  createProducts(count: number, overrides: Partial<TestProduct> = {}): TestProduct[] {
    return Array.from({ length: count }, () => this.createProduct(overrides));
  }

  /**
   * Create test staff data
   */
  createStaff(overrides: Partial<TestStaff> = {}): TestStaff {
    const identifier = this.generateTestIdentifier();
    const roles: TestStaff['role'][] = ['admin', 'sales_rep', 'accountant', 'warehouse', 'installer'];
    const role = overrides.role || roles[Math.floor(Math.random() * roles.length)];
    
    return {
      full_name: `Test ${role.replace('_', ' ')} ${identifier}`,
      email: `${role}${identifier.toLowerCase()}@test.example.com`,
      role,
      commission_rate: role === 'sales_rep' ? Math.floor(Math.random() * 10) + 5 : 0,
      is_active: true,
      ...overrides
    };
  }

  /**
   * Create multiple test staff members
   */
  createStaffMembers(count: number, overrides: Partial<TestStaff> = {}): TestStaff[] {
    return Array.from({ length: count }, () => this.createStaff(overrides));
  }

  /**
   * Create test supplier data
   */
  createSupplier(overrides: Partial<TestSupplier> = {}): TestSupplier {
    const identifier = this.generateTestIdentifier();
    
    return {
      name: `Test Supplier ${identifier}`,
      contact_person: `Supplier Contact ${identifier}`,
      email: `supplier${identifier.toLowerCase()}@test.example.com`,
      phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      address: `456 Supplier Avenue, Supplier City, SC 67890`,
      payment_terms: 'net_30',
      lead_time_days: Math.floor(Math.random() * 14) + 7,
      is_active: true,
      ...overrides
    };
  }

  /**
   * Create multiple test suppliers
   */
  createSuppliers(count: number, overrides: Partial<TestSupplier> = {}): TestSupplier[] {
    return Array.from({ length: count }, () => this.createSupplier(overrides));
  }

  /**
   * Create test lead data
   */
  createLead(overrides: Partial<TestLead> = {}): TestLead {
    const identifier = this.generateTestIdentifier();
    const leadTypes: TestLead['lead_type'][] = ['solar_calculator', 'general', 'supplier'];
    const statuses: TestLead['status'][] = ['new', 'contacted', 'quoted', 'closed_won', 'closed_lost'];
    
    return {
      full_name: `Test Lead ${identifier}`,
      email: `lead${identifier.toLowerCase()}@test.example.com`,
      phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      lead_type: leadTypes[Math.floor(Math.random() * leadTypes.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      estimated_value: Math.floor(Math.random() * 50000) + 5000,
      notes: `Test lead generated for system testing - ${identifier}`,
      ...overrides
    };
  }

  /**
   * Create multiple test leads
   */
  createLeads(count: number, overrides: Partial<TestLead> = {}): TestLead[] {
    return Array.from({ length: count }, () => this.createLead(overrides));
  }

  /**
   * Create test sale data
   */
  createSale(customerId: string, overrides: Partial<TestSale> = {}): TestSale {
    const identifier = this.generateTestIdentifier();
    const subtotal = Math.floor(Math.random() * 5000) + 1000;
    const taxAmount = Math.floor(subtotal * 0.1);
    
    return {
      customer_id: customerId,
      sale_date: new Date().toISOString().split('T')[0],
      subtotal,
      tax_amount: taxAmount,
      total_amount: subtotal + taxAmount,
      payment_status: 'pending',
      invoice_number: `TEST-INV-${identifier}`,
      requires_installation: Math.random() > 0.5,
      requires_warranty: Math.random() > 0.5,
      ...overrides
    };
  }

  /**
   * Create test sale item data
   */
  createSaleItem(saleId: string, productId: string, overrides: Partial<TestSaleItem> = {}): TestSaleItem {
    const quantity = Math.floor(Math.random() * 5) + 1;
    const unitPrice = Math.floor(Math.random() * 500) + 100;
    
    return {
      sale_id: saleId,
      product_id: productId,
      quantity,
      unit_price: unitPrice,
      line_total: quantity * unitPrice,
      ...overrides
    };
  }

  /**
   * Create complete test dataset with relationships
   */
  createCompleteTestDataset() {
    return {
      customers: this.createCustomers(5),
      products: this.createProducts(10, { warranty_months: 12, requires_installation: true }), // Ensure some warranty products
      staff: [
        this.createStaff({ role: 'admin' }),
        ...this.createStaffMembers(3, { role: 'sales_rep' }),
        this.createStaff({ role: 'accountant' }),
        this.createStaff({ role: 'warehouse' }),
        this.createStaff({ role: 'installer' })
      ],
      suppliers: this.createSuppliers(3),
      leads: this.createLeads(8)
    };
  }

  /**
   * Get test data identifier prefix for cleanup
   */
  getTestPrefix(): string {
    return this.testPrefix;
  }
}

export const testDataFactory = new TestDataFactory();