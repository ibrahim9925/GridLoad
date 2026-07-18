// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

interface SampleDataScenario {
  name: string;
  description: string;
  config: {
    salesVelocity: 'high' | 'medium' | 'low';
    leadTimes: 'short' | 'medium' | 'long';
    seasonality: boolean;
    cashFlow: 'healthy' | 'tight' | 'frozen';
  };
}

export class EnhancedSampleDataService {
  private scenarios: SampleDataScenario[] = [
    {
      name: "High Velocity Solar Season",
      description: "Peak summer season with high sales velocity and mixed lead times",
      config: {
        salesVelocity: 'high',
        leadTimes: 'medium',
        seasonality: true,
        cashFlow: 'healthy'
      }
    },
    {
      name: "Long Lead Time Challenge",
      description: "Suppliers with 2+ month lead times, moderate sales",
      config: {
        salesVelocity: 'medium',
        leadTimes: 'long',
        seasonality: false,
        cashFlow: 'tight'
      }
    },
    {
      name: "Fast Turnaround Operations",
      description: "10-day suppliers, low current sales, good cash position",
      config: {
        salesVelocity: 'low',
        leadTimes: 'short',
        seasonality: false,
        cashFlow: 'healthy'
      }
    },
    {
      name: "Cash Flow Crisis",
      description: "Frozen capital scenario with moderate sales and lead times",
      config: {
        salesVelocity: 'medium',
        leadTimes: 'medium',
        seasonality: false,
        cashFlow: 'frozen'
      }
    }
  ];

  async generateScenarioData(scenarioName: string) {
    const scenario = this.scenarios.find(s => s.name === scenarioName);
    if (!scenario) throw new Error(`Scenario ${scenarioName} not found`);

    console.log(`🎭 Generating scenario: ${scenario.name}`);

    // Generate in sequence to maintain relationships
    const bankAccounts = await this.generateBankAccounts(scenario);
    const suppliers = await this.generateSuppliers(scenario);
    const customers = await this.generateCustomers(scenario);
    const products = await this.generateProducts(scenario);
    const sales = await this.generateSales(scenario, customers, products);
    const purchaseOrders = await this.generatePurchaseOrders(scenario, suppliers, products);
    const bankTransactions = await this.generateBankTransactions(scenario, bankAccounts);

    return {
      scenario: scenario.name,
      generated: {
        bankAccounts: bankAccounts.length,
        suppliers: suppliers.length,
        customers: customers.length,
        products: products.length,
        sales: sales.length,
        purchaseOrders: purchaseOrders.length,
        bankTransactions: bankTransactions.length
      }
    };
  }

  async generateAllScenarios() {
    const results = [];
    for (const scenario of this.scenarios) {
      try {
        const result = await this.generateScenarioData(scenario.name);
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate ${scenario.name}:`, error);
        results.push({ scenario: scenario.name, error: error.message });
      }
    }
    return results;
  }

  private async generateBankAccounts(scenario: SampleDataScenario) {
    const accounts = [
      {
        name: 'Main Business Account - USD',
        currency: 'USD',
        current_balance: scenario.config.cashFlow === 'healthy' ? 150000 : 
                        scenario.config.cashFlow === 'tight' ? 25000 : 5000,
        account_number: 'ACC-USD-001',
        bank_name: 'Business Bank'
      },
      {
        name: 'Local Operations - NIS',
        currency: 'NIS',
        current_balance: scenario.config.cashFlow === 'healthy' ? 500000 : 
                        scenario.config.cashFlow === 'tight' ? 80000 : 15000,
        account_number: 'ACC-NIS-002',
        bank_name: 'Local Bank'
      }
    ];

    const results = [];
    for (const account of accounts) {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert(account)
        .select()
        .single();
      
      if (!error && data) results.push(data);
    }
    
    return results;
  }

  private async generateSuppliers(scenario: SampleDataScenario) {
    const baseSuppliers = [
      {
        name: 'SolarTech Manufacturing',
        contact_person: 'Zhang Wei',
        email: 'zhang@solartech.com',
        phone: '+86-138-0013-8000',
        lead_time_days: scenario.config.leadTimes === 'short' ? 10 : 
                       scenario.config.leadTimes === 'medium' ? 30 : 65,
        reliability_score: 92.0,
        avg_margin_percentage: 28.5,
        on_time_delivery_rate: scenario.config.leadTimes === 'short' ? 95.0 : 78.0,
        quality_score: 4.5
      },
      {
        name: 'BatteryPower Solutions',
        contact_person: 'Li Ming',
        email: 'li@batterypower.com',
        phone: '+86-139-0014-9000',
        lead_time_days: scenario.config.leadTimes === 'short' ? 15 : 
                       scenario.config.leadTimes === 'medium' ? 45 : 85,
        reliability_score: 88.0,
        avg_margin_percentage: 32.0,
        on_time_delivery_rate: scenario.config.leadTimes === 'short' ? 92.0 : 72.0,
        quality_score: 4.2
      },
      {
        name: 'InverterMax Technologies',
        contact_person: 'Wang Lei',
        email: 'wang@invertermax.com',
        phone: '+86-137-0012-7000',
        lead_time_days: scenario.config.leadTimes === 'short' ? 8 : 
                       scenario.config.leadTimes === 'medium' ? 25 : 55,
        reliability_score: 94.5,
        avg_margin_percentage: 25.0,
        on_time_delivery_rate: scenario.config.leadTimes === 'short' ? 98.0 : 85.0,
        quality_score: 4.8
      }
    ];

    const results = [];
    for (const supplier of baseSuppliers) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplier)
        .select()
        .single();
      
      if (!error && data) results.push(data);
    }
    
    return results;
  }

  private async generateCustomers(scenario: SampleDataScenario) {
    const customers = Array.from({ length: 15 }, (_, i) => ({
      contact_person: `Customer ${i + 1}`,
      company_name: `Solar Client ${i + 1} Ltd`,
      email: `customer${i + 1}@email.com`,
      phone: `+972-${50 + i}-${Math.floor(Math.random() * 9000000) + 1000000}`,
      address: `${i + 1} Solar Street, Tel Aviv`,
      credit_limit: 50000 + (i * 5000),
      payment_terms: 'net_30'
    }));

    const results = [];
    for (const customer of customers) {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();
      
      if (!error && data) results.push(data);
    }
    
    return results;
  }

  private async generateProducts(scenario: SampleDataScenario) {
    const products = [
      // Solar Panels
      {
        name: 'Solar Panel 400W Mono',
        category: 'Solar Panels',
        sku: `SP400-${Date.now()}-1`,
        cost_price: 120,
        selling_price: 200,
        current_stock: scenario.config.salesVelocity === 'high' ? 45 : 
                      scenario.config.salesVelocity === 'medium' ? 120 : 250,
        reorder_point: 50,
        reorder_quantity: 200,
        requires_installation: true,
        warranty_months: 24
      },
      {
        name: 'Solar Panel 500W Mono',
        category: 'Solar Panels',
        sku: `SP500-${Date.now()}-2`,
        cost_price: 150,
        selling_price: 250,
        current_stock: scenario.config.salesVelocity === 'high' ? 25 : 
                      scenario.config.salesVelocity === 'medium' ? 80 : 180,
        reorder_point: 30,
        reorder_quantity: 150,
        requires_installation: true,
        warranty_months: 24
      },
      // Batteries
      {
        name: 'LiFePO4 Battery 10kWh',
        category: 'Batteries',
        sku: `BATT10-${Date.now()}-3`,
        cost_price: 800,
        selling_price: 1400,
        current_stock: scenario.config.salesVelocity === 'high' ? 8 : 
                      scenario.config.salesVelocity === 'medium' ? 35 : 65,
        reorder_point: 10,
        reorder_quantity: 50,
        requires_installation: true,
        warranty_months: 60
      },
      // Inverters
      {
        name: 'Grid Tie Inverter 5kW',
        category: 'Inverters',
        sku: `INV5K-${Date.now()}-4`,
        cost_price: 300,
        selling_price: 550,
        current_stock: scenario.config.salesVelocity === 'high' ? 15 : 
                      scenario.config.salesVelocity === 'medium' ? 45 : 85,
        reorder_point: 20,
        reorder_quantity: 100,
        requires_installation: true,
        warranty_months: 36
      }
    ];

    const results = [];
    for (const product of products) {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      if (!error && data) results.push(data);
    }
    
    return results;
  }

  private async generateSales(scenario: SampleDataScenario, customers: any[], products: any[]) {
    if (!customers.length || !products.length) return [];

    const salesCount = scenario.config.salesVelocity === 'high' ? 45 : 
                       scenario.config.salesVelocity === 'medium' ? 25 : 12;

    const results = [];
    
    for (let i = 0; i < salesCount; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 90));

      const sale = {
        customer_id: customer.id,
        sale_date: saleDate.toISOString().split('T')[0],
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        payment_status: Math.random() > 0.7 ? 'paid' : 'pending'
      };

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert(sale)
        .select()
        .single();

      if (saleError || !saleData) continue;

      // Add sale items
      const itemCount = Math.floor(Math.random() * 3) + 1;
      let saleTotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const unitPrice = product.selling_price;
        const lineTotal = quantity * unitPrice;

        const { error: itemError } = await supabase
          .from('sale_items')
          .insert({
            sale_id: saleData.id,
            product_id: product.id,
            quantity,
            unit_price: unitPrice,
            line_total: lineTotal
          });

        if (!itemError) {
          saleTotal += lineTotal;
        }
      }

      // Update sale totals
      const taxAmount = saleTotal * 0.17; // Israeli VAT
      await supabase
        .from('sales')
        .update({
          subtotal: saleTotal,
          tax_amount: taxAmount,
          total_amount: saleTotal + taxAmount
        })
        .eq('id', saleData.id);

      results.push(saleData);
    }
    
    return results;
  }

  private async generatePurchaseOrders(scenario: SampleDataScenario, suppliers: any[], products: any[]) {
    if (!suppliers.length || !products.length) return [];

    const results = [];
    
    for (const supplier of suppliers) {
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30));
      
      const expectedDate = new Date(orderDate);
      expectedDate.setDate(expectedDate.getDate() + supplier.lead_time_days);

      const po = {
        supplier_id: supplier.id,
        order_date: orderDate.toISOString().split('T')[0],
        expected_delivery_date: expectedDate.toISOString().split('T')[0],
        status: Math.random() > 0.3 ? 'confirmed' : 'pending',
        subtotal: 0,
        total_amount: 0,
        created_by: '00000000-0000-0000-0000-000000000000' // System generated
      };

      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert(po)
        .select()
        .single();

      if (poError || !poData) continue;

      // Add PO items
      const itemCount = Math.floor(Math.random() * 3) + 2;
      let poTotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 100) + 50;
        const unitCost = product.cost_price;
        const lineTotal = quantity * unitCost;

        const { error: itemError } = await supabase
          .from('purchase_order_items')
          .insert({
            purchase_order_id: poData.id,
            product_id: product.id,
            quantity,
            unit_cost: unitCost,
            line_total: lineTotal
          });

        if (!itemError) {
          poTotal += lineTotal;
        }
      }

      // Update PO totals
      await supabase
        .from('purchase_orders')
        .update({
          subtotal: poTotal,
          total_amount: poTotal
        })
        .eq('id', poData.id);

      results.push(poData);
    }
    
    return results;
  }

  private async generateBankTransactions(scenario: SampleDataScenario, bankAccounts: any[]) {
    if (!bankAccounts.length) return [];

    const results = [];
    
    for (const account of bankAccounts) {
      // Generate transactions for the last 3 months
      for (let i = 0; i < 20; i++) {
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 90));

        const isIncome = Math.random() > 0.4;
        const amount = isIncome ? 
          Math.floor(Math.random() * 15000) + 5000 : 
          -(Math.floor(Math.random() * 8000) + 2000);

        const transaction = {
          bank_account_id: account.id,
          date: transactionDate.toISOString().split('T')[0],
          transaction_type: isIncome ? 'IN' : 'OUT',
          amount: Math.abs(amount),
          currency: account.currency,
          purpose: isIncome ? 'Customer Payment' : 'Supplier Payment',
          notes: `Generated transaction for ${scenario.name}`
        };

        const { data, error } = await supabase
          .from('bank_ledger')
          .insert(transaction)
          .select()
          .single();

        if (!error && data) results.push(data);
      }
    }
    
    return results;
  }

  getAvailableScenarios() {
    return this.scenarios.map(s => ({
      name: s.name,
      description: s.description,
      config: s.config
    }));
  }

  async clearTestData() {
    const tables = ['sale_items', 'sales', 'purchase_order_items', 'purchase_orders', 'bank_ledger'];
    const customerTables = ['customers', 'products', 'suppliers', 'bank_accounts'];

    const results = [];
    
    // Clear transaction tables first
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        results.push({ table, success: !error, error: error?.message });
      } catch (error: any) {
        results.push({ table, success: false, error: error.message });
      }
    }
    
    // Clear customer tables
    for (const table of customerTables) {
      try {
        const { error } = await supabase.from(table as any).delete().or('name.like.%Test%,company_name.like.%Test%,contact_person.like.%Customer%');
        results.push({ table, success: !error, error: error?.message });
      } catch (error: any) {
        results.push({ table, success: false, error: error.message });
      }
    }
    
    return results;
  }
}

export const enhancedSampleDataService = new EnhancedSampleDataService();