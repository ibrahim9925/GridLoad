// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

/**
 * PHASE 2: Product Pricing Validation and Fix Utilities
 */
export class ProductPricingValidator {
  
  /**
   * Fix products with missing or invalid pricing (PHASE 2 CRITICAL FIX)
   */
  static async fixProductPricing() {
    try {
      console.log('💰 Fixing product pricing issues...');
      
      // Get all products with missing or invalid pricing
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, cost_price, standard_selling_price, is_active')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const fixes = [];
      
      for (const product of products || []) {
        const costPrice = product.cost_price || 0;
        const sellingPrice = product.standard_selling_price || 0;
        
        // Check if pricing needs fixing
        if (sellingPrice <= costPrice || sellingPrice === 0) {
          const newSellingPrice = costPrice > 0 ? Math.round(costPrice * 1.4) : 140; // 40% markup or default $140
          
          const { error: updateError } = await supabase
            .from('products')
            .update({
              standard_selling_price: newSellingPrice,
              min_selling_price: costPrice > 0 ? Math.round(costPrice * 1.2) : 120, // 20% markup minimum
              max_selling_price: costPrice > 0 ? Math.round(costPrice * 2.0) : 280  // 100% markup maximum
            })
            .eq('id', product.id);
          
          if (updateError) {
            console.warn(`⚠️ Failed to update pricing for product ${product.name}:`, updateError);
          } else {
            fixes.push({
              productId: product.id,
              productName: product.name,
              oldPrice: sellingPrice,
              newPrice: newSellingPrice,
              costPrice: costPrice
            });
          }
        }
      }
      
      console.log(`✅ Fixed pricing for ${fixes.length} products`);
      return {
        success: true,
        fixedCount: fixes.length,
        totalProducts: products?.length || 0,
        fixes: fixes
      };
    } catch (error) {
      console.error('❌ Failed to fix product pricing:', error);
      throw error;
    }
  }
  
  /**
   * Validate product pricing integrity
   */
  static async validateProductPricing() {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, cost_price, standard_selling_price, is_active')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const validProducts = products?.filter(p => 
        (p.standard_selling_price || 0) > (p.cost_price || 0) && 
        (p.standard_selling_price || 0) > 0
      ) || [];
      
      const invalidProducts = products?.filter(p => 
        (p.standard_selling_price || 0) <= (p.cost_price || 0) || 
        (p.standard_selling_price || 0) === 0
      ) || [];
      
      return {
        totalProducts: products?.length || 0,
        validProducts: validProducts.length,
        invalidProducts: invalidProducts.length,
        validationPassed: invalidProducts.length === 0,
        invalidList: invalidProducts.map(p => ({
          id: p.id,
          name: p.name,
          costPrice: p.cost_price,
          sellingPrice: p.standard_selling_price
        }))
      };
    } catch (error) {
      console.error('❌ Product pricing validation failed:', error);
      throw error;
    }
  }
  
  /**
   * Ensure all products have valid pricing before running tests
   */
  static async ensureValidProductPricing() {
    try {
      const validation = await this.validateProductPricing();
      
      if (!validation.validationPassed) {
        console.log(`⚠️ Found ${validation.invalidProducts} products with invalid pricing. Fixing...`);
        await this.fixProductPricing();
        
        // Re-validate
        const revalidation = await this.validateProductPricing();
        return revalidation;
      }
      
      return validation;
    } catch (error) {
      console.error('❌ Failed to ensure valid product pricing:', error);
      throw error;
    }
  }
}