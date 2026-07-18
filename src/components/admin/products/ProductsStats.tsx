// @ts-nocheck

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Product = Tables<'products'>;

interface ProductsStatsProps {
  products: Product[];
  lowStockProducts?: Product[];
  categoryFilter?: string;
  setCategoryFilter?: (category: string) => void;
  statusFilter?: string;
  setStatusFilter?: (status: string) => void;
}

const ProductsStats = ({ products }: ProductsStatsProps) => {
  const activeProducts = products.filter(p => p.status === 'Active').length;
  const inactiveProducts = products.filter(p => p.status === 'Inactive').length;
  const totalCategories = [...new Set(products.map(p => p.category).filter(Boolean))].length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Active Products</p>
              <p className="text-2xl font-bold">{activeProducts}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-gray-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Inactive Products</p>
              <p className="text-2xl font-bold">{inactiveProducts}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">{totalCategories}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsStats;
