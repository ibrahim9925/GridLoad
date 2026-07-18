// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { getCache, setCache, invalidateCache } from "@/lib/sessionCache";

type Product = Tables<'products'>;
const CACHE_KEY = "products:list";

export const useProductsData = () => {
  const cached = getCache<Product[]>(CACHE_KEY);
  const [products, setProducts] = useState<Product[]>(cached || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(!cached);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (cached) return;
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const list = data || [];
        setProducts(list);
        setCache(CACHE_KEY, list);
      } catch (error: any) {
        console.error("💥 Products: Fetch failed:", error);
        toast({
          variant: "destructive",
          title: "Error fetching products",
          description: error.message || "Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);


  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    console.log("🗑️ Products: Delete requested for product:", product?.name);
    
    if (window.confirm(`Are you sure you want to delete "${product?.name}"? This action cannot be undone.`)) {
      try {
        setIsDeleting(productId);
        console.log("🗑️ Products: Checking references before delete");
        
        // Check for foreign key references first
        const { data: saleItems, error: saleItemsError } = await supabase
          .from("sale_items")
          .select("id")
          .eq("product_id", productId)
          .limit(1);
          
        if (saleItemsError) throw saleItemsError;
        
        if (saleItems && saleItems.length > 0) {
          // Use soft delete instead of hard delete for products with references
          console.log("🔄 Products: Product has references, using soft delete");
          const { error } = await supabase
            .from("products")
            .update({ is_active: false })
            .eq("id", productId);
            
          if (error) throw error;
          
          invalidateCache(CACHE_KEY); setProducts(products.map(p => 
            p.id === productId ? { ...p, is_active: false } : p
          ));
          
          toast({
            title: "Product archived",
            description: `"${product?.name}" has been archived due to existing sales records.`,
          });
        } else {
          // Safe to hard delete
          console.log("🗑️ Products: Safe to delete, no references found");
          const { error } = await supabase
            .from("products")
            .delete()
            .eq("id", productId);
          
          if (error) throw error;
          
          invalidateCache(CACHE_KEY); setProducts(products.filter((product) => product.id !== productId));
          toast({
            title: "Product deleted",
            description: `"${product?.name}" has been removed successfully.`,
          });
        }
        
        console.log("✅ Products: Product operation completed successfully");
      } catch (error: any) {
        console.error("💥 Products: Delete error:", error);
        let errorMessage = "Please try again later.";
        
        if (error.message?.includes("violates foreign key constraint")) {
          errorMessage = "Cannot delete product - it's referenced in sales records. The product will be archived instead.";
        } else if (error.message?.includes("duplicate key value")) {
          errorMessage = "A product with this SKU already exists.";
        }
        
        toast({
          variant: "destructive",
          title: "Error deleting product",
          description: errorMessage,
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleSaveProduct = async (productData: any) => {
    console.log("💾 Products: Save product called with data:", productData);
    try {
      if (productData.id) {
        // Update existing product
        console.log("📝 Products: Updating existing product:", productData.id);
        const { data, error } = await supabase
          .from("products")
          .update({
            name: productData.name,
            category: productData.category,
            moq: productData.moq || 0,
            status: productData.status,
            sku: productData.sku,
            description: productData.description,
            cost_price: productData.cost_price,
            current_stock: productData.current_stock,
            low_stock_threshold: productData.low_stock_threshold,
            max_stock_level: productData.max_stock_level,
            supplier: productData.supplier,
            unit: productData.unit,
            min_selling_price: productData.min_selling_price,
            standard_selling_price: productData.standard_selling_price,
            max_selling_price: productData.max_selling_price,
            image_url: productData.image_url,
            requires_installation: productData.requires_installation || false,
            warranty_months: productData.warranty_months === undefined ? 12 : productData.warranty_months,
            product_type: productData.product_type || 'other',
            brand: productData.brand || null,
            short_description: productData.short_description || null,
            full_description: productData.full_description || null,
            specs: productData.specs || {},
            images: Array.isArray(productData.images) ? productData.images : [],
            datasheet_url: productData.datasheet_url || null,
            is_featured: !!productData.is_featured,
            is_active: productData.is_active !== false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", productData.id)
          .select()
          .single();
        
        if (error) {
          console.error("❌ Products: Update failed:", error);
          throw error;
        }
        
        console.log("✅ Products: Product updated successfully:", data);
        invalidateCache(CACHE_KEY); setProducts(
          products.map((product) =>
            product.id === productData.id ? data : product
          )
        );
        
        toast({
          title: "Product updated",
          description: `"${data.name}" has been updated successfully.`,
        });
      } else {
        // Add new product
        console.log("➕ Products: Creating new product");
        
        // Generate SKU if not provided
        let finalSku = productData.sku;
        if (!finalSku) {
          const timestamp = Date.now().toString().slice(-6);
          const namePrefix = productData.name?.substring(0, 3).toUpperCase() || 'PRD';
          finalSku = `${namePrefix}-${timestamp}`;
        }
        
        const { data, error } = await supabase
          .from("products")
          .insert({
            name: productData.name!,
            category: productData.category,
            moq: productData.moq || 0,
            status: productData.status || 'Active',
            sku: finalSku,
            description: productData.description,
            cost_price: productData.cost_price || 0,
            current_stock: productData.current_stock || 0,
            low_stock_threshold: productData.low_stock_threshold || 10,
            max_stock_level: productData.max_stock_level || 100,
            supplier: productData.supplier,
            unit: productData.unit || 'pcs',
            min_selling_price: productData.min_selling_price || 0,
            standard_selling_price: productData.standard_selling_price || 0,
            max_selling_price: productData.max_selling_price || 0,
            image_url: productData.image_url,
            requires_installation: productData.requires_installation || false,
            warranty_months: productData.warranty_months === undefined ? 12 : productData.warranty_months,
            product_type: productData.product_type || 'other',
            brand: productData.brand || null,
            short_description: productData.short_description || null,
            full_description: productData.full_description || null,
            specs: productData.specs || {},
            images: Array.isArray(productData.images) ? productData.images : [],
            datasheet_url: productData.datasheet_url || null,
            is_featured: !!productData.is_featured,
            is_active: productData.is_active !== false,
          })
          .select()
          .single();
        
        if (error) {
          console.error("❌ Products: Create failed:", error);
          throw error;
        }
        
        console.log("✅ Products: Product created successfully:", data);
        invalidateCache(CACHE_KEY); setProducts([data, ...products]);
        
        toast({
          title: "Product added",
          description: `"${data.name}" has been added successfully.`,
        });
      }
    } catch (error: any) {
      console.error("💥 Products: Save error:", error);
      
      let errorMessage = "Please try again later.";
      if (error.message?.includes("duplicate key value") || error.message?.includes("unique constraint")) {
        errorMessage = "A product with this SKU already exists. Please use a different SKU.";
      } else if (error.message?.includes("violates not null constraint")) {
        errorMessage = "Please fill in all required fields.";
      }
      
      toast({
        variant: "destructive",
        title: "Error saving product",
        description: errorMessage,
      });
    }
  };

  return {
    products,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    isLoading,
    isDeleting,
    handleDeleteProduct,
    handleSaveProduct,
  };
};
