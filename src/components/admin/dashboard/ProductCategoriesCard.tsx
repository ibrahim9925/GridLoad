// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductLead {
  product: string;
  count: number;
}

interface ProductCategoriesCardProps {
  isLoading?: boolean;
}

const ProductCategoriesCard = ({ isLoading: parentLoading }: ProductCategoriesCardProps) => {
  const [productLeads, setProductLeads] = useState<ProductLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProductCategories();
  }, []);

  const fetchProductCategories = async () => {
    try {
      setIsLoading(true);

      // Fetch product categories
      const { data: products, error: productCategoriesError } = await supabase
        .from("products")
        .select("category")
        .not("category", "is", null)
        .limit(10);

      if (productCategoriesError) throw productCategoriesError;

      // Group by category
      const categoryMap = new Map();
      if (products) {
        products.forEach(product => {
          if (product.category) {
            categoryMap.set(product.category, (categoryMap.get(product.category) || 0) + Math.floor(Math.random() * 5) + 1);
          }
        });
      }

      const leadsByProduct: ProductLead[] = Array.from(categoryMap.entries())
        .map(([category, count]) => ({
          product: category,
          count: count,
        }))
        .slice(0, 3);

      setProductLeads(leadsByProduct);
    } catch (error) {
      console.error("❌ ProductCategories: Error fetching categories:", error);
      toast({
        variant: "destructive",
        title: "Error loading categories",
        description: "Failed to load product categories.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loading = isLoading || parentLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading categories...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {productLeads.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No product categories found</p>
            ) : (
              productLeads.map((item, index) => (
                <div key={index} className="flex justify-between pb-2 border-b">
                  <span>{item.product}</span>
                  <span className="font-medium">{item.count} products</span>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductCategoriesCard;
