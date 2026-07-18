// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SaleItem {
  id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  warranty_months?: number;
}

interface SaleData {
  id: string;
  customer_id: string;
  sale_date: string;
  invoice_number?: string;
}

export const useWarrantyAutoCreation = () => {
  const { toast } = useToast();

  const createWarrantiesForSale = async (saleData: SaleData, saleItems: SaleItem[]) => {
    try {
      console.log('🔧 Creating warranties for sale:', saleData.id);

      // Get products that require warranties (inverters, batteries, etc.)
      const productIds = saleItems.map(item => item.product_id);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, warranty_months, category')
        .in('id', productIds)
        .not('warranty_months', 'is', null);

      if (productsError) throw productsError;

      const warrantyProducts = products?.filter(p => p.warranty_months && p.warranty_months > 0) || [];
      
      if (warrantyProducts.length === 0) {
        console.log('ℹ️ No products require warranties for this sale');
        return { success: true, warrantiesCreated: 0 };
      }

      // Create warranties for each item that requires one
      const warrantiesToCreate = [];
      
      for (const product of warrantyProducts) {
        const saleItem = saleItems.find(item => item.product_id === product.id);
        if (!saleItem) continue;

        // Create warranties for each quantity (each unit gets its own warranty)
        for (let i = 0; i < saleItem.quantity; i++) {
          const startDate = new Date(saleData.sale_date);
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + product.warranty_months);

          // Generate unique serial number (will be updated with actual when available)
          const serialNumber = `${product.category?.slice(0,3).toUpperCase() || 'WTY'}${Date.now()}-${i + 1}`;

          warrantiesToCreate.push({
            sale_id: saleData.id,
            product_id: product.id,
            customer_id: saleData.customer_id,
            serial_number: serialNumber,
            warranty_type: 'manufacturer',
            warranty_period_months: product.warranty_months,
            warranty_start_date: startDate.toISOString().split('T')[0],
            warranty_end_date: endDate.toISOString().split('T')[0],
            status: 'active',
            notes: `Auto-created from sale ${saleData.invoice_number || saleData.id}`
          });
        }
      }

      if (warrantiesToCreate.length > 0) {
        const { error: warrantyError } = await supabase
          .from('warranties')
          .insert(warrantiesToCreate);

        if (warrantyError) throw warrantyError;

        console.log(`✅ Created ${warrantiesToCreate.length} warranties for sale ${saleData.id}`);
        
        toast({
          title: "Warranties Created",
          description: `${warrantiesToCreate.length} warranties automatically registered for this sale`,
        });
      }

      return { success: true, warrantiesCreated: warrantiesToCreate.length };

    } catch (error: any) {
      console.error('❌ Error creating warranties:', error);
      toast({
        variant: "destructive",
        title: "Warranty Creation Failed",
        description: error.message || "Failed to create warranties for this sale",
      });
      return { success: false, error };
    }
  };

  const assignSerialNumberToWarranty = async (warrantyId: string, serialNumber: string) => {
    try {
      const { error } = await supabase
        .from('warranties')
        .update({ serial_number: serialNumber })
        .eq('id', warrantyId);

      if (error) throw error;

      toast({
        title: "Serial Number Updated",
        description: "Warranty serial number has been assigned",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating warranty serial:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update warranty serial number",
      });
      return { success: false, error };
    }
  };

  return {
    createWarrantiesForSale,
    assignSerialNumberToWarranty
  };
};