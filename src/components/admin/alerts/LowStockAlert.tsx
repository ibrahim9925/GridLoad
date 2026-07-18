// @ts-nocheck

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";

type Product = Tables<'products'>;

interface LowStockAlertProps {
  products: Product[];
}

const LowStockAlert = ({ products }: LowStockAlertProps) => {
  const navigate = useNavigate();

  // Unified threshold: reorder_point (default 5)
  const thresholdOf = (p: any) => (p.reorder_point && p.reorder_point > 0 ? p.reorder_point : 5);
  const lowStockProducts = products.filter(p =>
    (p.current_stock || 0) > 0 && (p.current_stock || 0) <= thresholdOf(p)
  );

  const outOfStockProducts = products.filter(p => (p.current_stock || 0) === 0);
  const totalCriticalStock = lowStockProducts.length + outOfStockProducts.length;

  if (totalCriticalStock === 0) {
    return null;
  }

  const handleViewProducts = () => {
    navigate("/admin/products");
  };

  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-800">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <span className="font-medium">
            Stock Alert: {totalCriticalStock} product{totalCriticalStock !== 1 ? 's' : ''} need attention
          </span>
          <span className="text-sm">
            ({outOfStockProducts.length} out of stock, {lowStockProducts.length} low stock)
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleViewProducts}
          className="text-orange-800 border-orange-300 hover:bg-orange-100"
        >
          View Products
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default LowStockAlert;
