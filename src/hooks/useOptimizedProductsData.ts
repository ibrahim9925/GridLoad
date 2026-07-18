// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type ProductBase = Tables<'products'>;
type ProductWithPricing = ProductBase & {
  min_selling_price?: number;
  standard_selling_price?: number;
  max_selling_price?: number;
};

export const useOptimizedProductsData = () => {
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProducts = async () => {
    console.log("📦 OptimizedProducts: Fetching products with optimized query...");
    try {
      setIsLoading(true);
      
      // Use optimized query with indexes: idx_products_status, idx_products_category
      let query = supabase
        .from("products")
        .select("*");

      // Apply indexed filters first for better performance
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      // Order by indexed columns - ONLY show active products
      const { data, error } = await query
        .eq("is_active", true)  // Uses idx_products_status index
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("❌ OptimizedProducts: Error fetching products:", error);
        throw error;
      }
      
      console.log("✅ OptimizedProducts: Successfully fetched", data?.length || 0, "products");
      setProducts(data || []);
    } catch (error: any) {
      console.error("💥 OptimizedProducts: Fetch failed:", error);
      toast({
        variant: "destructive",
        title: "Error fetching products",
        description: error.message || "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Optimized client-side search with memoization
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    
    const searchLower = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(searchLower) ||
      (product.category && product.category.toLowerCase().includes(searchLower)) ||
      (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
      (product.description && product.description.toLowerCase().includes(searchLower))
    );
  }, [products, searchTerm]);

  // Get low stock products using indexed query
  const lowStockProducts = useMemo(() => {
    // This will be efficient due to idx_products_stock_alerts index
    return products.filter(product => 
      product.is_active && 
      product.current_stock <= (product.low_stock_threshold || 10)
    );
  }, [products]);

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, statusFilter]); // Refetch when filters change

  const handleDeleteProduct = async (productId: string) => {
    setIsDeleting(productId);
    try {
      // Use safe deletion utility function
      const { safeDeleteProduct } = await import('@/utils/productDeletion');
      const result = await safeDeleteProduct(productId);
      
      if (result.deleted) {
        // Product was completely deleted - remove from state
        setProducts(prev => prev.filter(product => product.id !== productId));
        toast({
          title: "Product deleted",
          description: "Product removed successfully",
        });
      } else if (result.archived) {
        // Product was archived - remove from UI immediately since we only show active products
        setProducts(prev => prev.filter(product => product.id !== productId));
        toast({
          title: "Product archived",
          description: `Product archived due to existing references in: ${result.referenceTables?.join(', ')}`,
        });
      }
      
      console.log('✅ OptimizedProducts: Product deletion handled successfully');
    } catch (error: any) {
      console.error('❌ OptimizedProducts: Error deleting product:', error);
      toast({
        variant: "destructive",
        title: "Error deleting product",
        description: error.message || "Please try again later.",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveProduct = async (productData: Partial<ProductWithPricing>) => {
    // Enhanced: support new price fields
    try {
      if (productData.id) {
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
            min_selling_price: productData.min_selling_price,
            standard_selling_price: productData.standard_selling_price,
            max_selling_price: productData.max_selling_price,
            current_stock: productData.current_stock,
            low_stock_threshold: productData.low_stock_threshold,
            max_stock_level: productData.max_stock_level,
            supplier: productData.supplier,
            unit: productData.unit,
            updated_at: new Date().toISOString(),
          })
          .eq("id", productData.id)
          .select()
          .single();
        if (error) throw error;
        setProducts(prev => prev.map(product => 
          product.id === productData.id ? data as ProductWithPricing : product
        ));
        toast({
          title: "Product updated",
          description: `"${(data as ProductWithPricing).name}" has been updated successfully.`,
        });
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({
            name: productData.name!,
            category: productData.category,
            moq: productData.moq || 0,
            status: productData.status || 'Active',
            sku: productData.sku,
            description: productData.description,
            cost_price: productData.cost_price,
            min_selling_price: productData.min_selling_price,
            standard_selling_price: productData.standard_selling_price,
            max_selling_price: productData.max_selling_price,
            current_stock: productData.current_stock || 0,
            low_stock_threshold: productData.low_stock_threshold || 10,
            max_stock_level: productData.max_stock_level || 100,
            supplier: productData.supplier,
            unit: productData.unit || 'pcs',
          })
          .select()
          .single();
        if (error) throw error;
        setProducts(prev => [data as ProductWithPricing, ...prev]);
        toast({
          title: "Product added",
          description: `"${(data as ProductWithPricing).name}" has been added successfully.`,
        });
      }
    } catch (error: any) {
      console.error("💥 OptimizedProducts: Save error:", error);
      toast({
        variant: "destructive",
        title: "Error saving product",
        description: error.message || "Please try again later.",
      });
    }
  };

  return {
    products: filteredProducts,
    lowStockProducts,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    isLoading,
    isDeleting,
    handleDeleteProduct,
    handleSaveProduct,
    fetchProducts,
  };
};
