// @ts-nocheck
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database, Users, Package, UserCheck } from "lucide-react";

export const TestDataSeeder: React.FC = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const seedTestData = async () => {
    setIsSeeding(true);
    try {
      console.log('🌱 Starting test data seeding...');

      // Check existing data first
      const [customersCheck, productsCheck, staffCheck] = await Promise.all([
        supabase.from('customers').select('id').limit(1),
        supabase.from('products').select('id').limit(1),
        supabase.from('staff').select('id').limit(1)
      ]);

      let dataCreated = 0;

      // Add sample customers if none exist
      if (!customersCheck.data?.length) {
        console.log('📝 Creating sample customers...');
        await supabase.from('customers').insert([
          {
            contact_person: 'John Doe',
            company_name: 'Test Customer Co.',
            email: 'john@testcustomer.com',
            phone: '+1234567890',
            address: '123 Test Street',
            is_active: true
          },
          {
            contact_person: 'Jane Smith', 
            company_name: 'Sample Business Ltd.',
            email: 'jane@samplebiz.com',
            phone: '+0987654321',
            address: '456 Sample Ave',
            is_active: true
          }
        ]);
        dataCreated++;
      }

      // Add sample products if none exist
      if (!productsCheck.data?.length) {
        console.log('📦 Creating sample products...');
        await supabase.from('products').insert([
          {
            name: 'Test Solar Panel 300W',
            category: 'solar_panels',
            cost_price: 150.00,
            standard_selling_price: 250.00,
            current_stock: 100,
            reorder_point: 20,
            reorder_quantity: 50,
            is_active: true,
            requires_installation: true,
            warranty_months: 24
          },
          {
            name: 'Test Inverter 5kW',
            category: 'inverters', 
            cost_price: 800.00,
            standard_selling_price: 1200.00,
            current_stock: 50,
            reorder_point: 10,
            reorder_quantity: 25,
            is_active: true,
            requires_installation: true,
            warranty_months: 36
          },
          {
            name: 'Test Battery 10kWh',
            category: 'batteries',
            cost_price: 2000.00,
            standard_selling_price: 3000.00,
            current_stock: 25,
            reorder_point: 5,
            reorder_quantity: 10,
            is_active: true,
            requires_installation: false,
            warranty_months: 60
          },
          {
            name: 'Test Mounting System',
            category: 'mounting',
            cost_price: 300.00,
            standard_selling_price: 450.00,
            current_stock: 75,
            reorder_point: 15,
            reorder_quantity: 40,
            is_active: true,
            requires_installation: true,
            warranty_months: 12
          },
          {
            name: 'Test Monitoring System',
            category: 'monitoring',
            cost_price: 200.00,
            standard_selling_price: 350.00,
            current_stock: 30,
            reorder_point: 8,
            reorder_quantity: 20,
            is_active: true,
            requires_installation: false,
            warranty_months: 24
          }
        ]);
        dataCreated++;
      }

      // Add sample staff if none exist
      if (!staffCheck.data?.length) {
        console.log('👥 Creating sample staff...');
        await supabase.from('staff').insert([
          {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'sales@testcompany.com',
            full_name: 'Test Sales Rep',
            role: 'sales_rep' as const,
            commission_rate: 3.5,
            is_active: true
          },
          {
            id: '22222222-2222-2222-2222-222222222222',
            email: 'manager@testcompany.com',
            full_name: 'Test Manager',
            role: 'admin' as const,
            commission_rate: 0,
            is_active: true
          },
          {
            id: '33333333-3333-3333-3333-333333333333',
            email: 'warehouse@testcompany.com',
            full_name: 'Test Warehouse',
            role: 'warehouse' as const,
            commission_rate: 0,
            is_active: true
          }
        ]);
        dataCreated++;
      }

      // Add sample suppliers
      await supabase.from('suppliers').upsert([
        {
          name: 'Test Supplier Inc.',
          contact_person: 'Bob Johnson',
          email: 'bob@testsupplier.com',
          phone: '+1122334455',
          address: '789 Supplier St',
          is_active: true
        }
      ]);
      
      console.log('✅ Test data seeding completed successfully');
      toast({
        title: "Test Data Created",
        description: `Successfully created test data for ${dataCreated} categories.`,
        variant: "default",
      });

    } catch (error: any) {
      console.error('❌ Error seeding test data:', error);
      toast({
        title: "Error Creating Test Data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test Data Setup
        </CardTitle>
        <CardDescription>
          Create sample data required for comprehensive testing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Sample Customers</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>Test Products</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span>Sample Suppliers</span>
            </div>
          </div>
          
          <Button 
            onClick={seedTestData}
            disabled={isSeeding}
            className="w-full"
          >
            {isSeeding ? 'Creating Test Data...' : 'Create Test Data'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};