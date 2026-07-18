// @ts-nocheck
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, Edit, Trash2, Package, DollarSign, Search } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { 
  calculateMarginPercent, 
  formatPercent, 
  getMarginColor 
} from "@/utils/profitUtils";
import { useIsMobile } from "@/hooks/use-mobile";

type ProductBase = Tables<'products'>;
type ProductWithPricing = ProductBase & {
  standard_price?: number;
  premium_price?: number;
  bulk_price?: number;
};

interface ProductsTableProps {
  products: ProductWithPricing[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean;
  isDeleting: string | null;
  onEditProduct: (product: ProductWithPricing) => void;
  onDeleteProduct: (product: ProductWithPricing) => void;
  // Bulk selection props
  selectedIds?: string[];
  selectItem?: (id: string) => void;
  selectAll?: () => void;
  deselectAll?: () => void;
  isSelected?: (id: string) => boolean;
}

const ProductsTable = ({
  products,
  searchTerm,
  setSearchTerm,
  isLoading,
  isDeleting,
  onEditProduct,
  onDeleteProduct,
  selectedIds = [],
  selectItem,
  selectAll,
  deselectAll,
  isSelected,
}: ProductsTableProps) => {
  const isMobile = useIsMobile();
  
  const getStockStatus = (product: ProductWithPricing) => {
    const currentStock = product.current_stock || 0;
    const lowThreshold = product.low_stock_threshold || 5;

    if (currentStock === 0) {
      return { status: "Out of Stock", variant: "destructive" as const };
    } else if (currentStock <= lowThreshold) {
      return { status: "Low Stock", variant: "outline" as const };
    } else {
      return { status: "In Stock", variant: "default" as const };
    }
  };

  const ProductCard = ({ product }: { product: ProductWithPricing }) => {
    const stockStatus = getStockStatus(product);
    const margin = calculateMarginPercent(product.standard_price || 0, product.cost_price || 0);
    
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground mb-1">{product.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">SKU: {product.sku}</p>
            {product.category && (
              <Badge variant="secondary" className="text-xs">
                {product.category}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditProduct(product)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeleteProduct(product)}
              disabled={isDeleting === product.id}
              className="h-8 w-8 p-0"
            >
              {isDeleting === product.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="font-semibold">${(product.standard_price || 0).toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Stock</p>
              <Badge variant={stockStatus.variant} className="text-xs">
                {stockStatus.status}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Margin: </span>
            <span className={`font-medium ${getMarginColor(margin)}`}>
              {formatPercent(margin)}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {product.current_stock || 0} in stock
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Catalog</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, category, or SKU..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {selectItem && selectedIds && selectedIds.length === 0 && (
            <div className="text-sm text-muted-foreground px-2">
              Select items using checkboxes for bulk actions
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading products...</span>
          </div>
        ) : (
          <>
            {isMobile ? (
              // Mobile/Tablet Card Layout
              <div className="space-y-4">
                {products.length === 0 ? (
                  <div className="text-center py-8">
                    {searchTerm ? 
                      `No products found matching "${searchTerm}"` : 
                      "No products found. Add your first product to get started."
                    }
                  </div>
                ) : (
                  products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
                )}
              </div>
            ) : (
              // Desktop Table Layout (Simplified)
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectItem && (
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={products.length > 0 && products.every(p => isSelected?.(p.id))}
                            onChange={selectAll || deselectAll}
                            className="rounded border-gray-300"
                          />
                        </TableHead>
                      )}
                      <TableHead>Product Details</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={selectItem ? 9 : 8} className="text-center py-8">
                          {searchTerm ? 
                            `No products found matching "${searchTerm}"` : 
                            "No products found. Add your first product to get started."
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => {
                        const stockStatus = getStockStatus(product);
                        const margin = calculateMarginPercent(product.standard_price || 0, product.cost_price || 0);

                        return (
                          <TableRow key={product.id}>
                            {selectItem && (
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={isSelected?.(product.id) || false}
                                  onChange={() => selectItem(product.id)}
                                  className="rounded border-gray-300"
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  SKU: {product.sku}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.category && (
                                <Badge variant="outline">{product.category}</Badge>
                              )}
                            </TableCell>
                            <TableCell>${(product.standard_price || 0).toFixed(2)}</TableCell>
                            <TableCell>${(product.cost_price || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={getMarginColor(margin)}>
                                {formatPercent(margin)}
                              </span>
                            </TableCell>
                            <TableCell>{product.current_stock || 0}</TableCell>
                            <TableCell>
                              <Badge variant={stockStatus.variant}>
                                {stockStatus.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onEditProduct(product)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onDeleteProduct(product)}
                                  disabled={isDeleting === product.id}
                                >
                                  {isDeleting === product.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-2 text-sm text-muted-foreground">
              <div>
                Showing {products.length} product{products.length !== 1 ? 's' : ''}
              </div>
              <div>
                Total inventory value: $
                {products.reduce((sum, product) => 
                  sum + ((product.current_stock || 0) * (product.cost_price || 0)), 0
                ).toFixed(2)}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductsTable;
