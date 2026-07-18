// @ts-nocheck

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SaleLineSerialSelector from "./SaleLineSerialSelector";
import {
  type SerialEntry,
  buildDefaultSerialEntries,
  resizeSerialEntries,
  computeHasMissingSerials,
  serialEntriesToNumbers,
} from "@/lib/serialInventory";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  cost_price: number | null;
  current_stock: number | null;
  unit: string | null;
  is_active: boolean | null;
  is_serialized?: boolean | null;
  warranty_months?: number | null;
  product_type?: string | null;
  brand?: string | null;
  standard_selling_price?: number | null;
}

interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  stock_available: number;
  is_serialized?: boolean;
  warranty_months?: number | null;
  product_type?: string | null;
  brand?: string | null;
  serial_numbers?: string[];
  selected_serial_ids?: string[];
  serial_entries?: SerialEntry[];
  has_missing_serials?: boolean;
}

interface ProductSelectorProps {
  saleItems: SaleItem[];
  onAddItem: (item: SaleItem) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<SaleItem>) => void;
  editingSaleId?: string;
}

const ProductSelector = ({ saleItems, onAddItem, onRemoveItem, onUpdateItem, editingSaleId }: ProductSelectorProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [productSelectOpen, setProductSelectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error fetching products",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const notAlreadyAdded = !saleItems.some(item => item.product_id === product.id);
    
    return matchesSearch && matchesCategory && notAlreadyAdded;
  });

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const getExcludedSerialIds = (currentItemId: string) =>
    saleItems.flatMap((i) =>
      i.id !== currentItemId
        ? (i.serial_entries || [])
            .filter((e) => e.mode === "pick" && e.serial_id)
            .map((e) => e.serial_id!)
        : []
    );

  const getProductSellPrice = (product: Product) =>
    Number(product.standard_selling_price) || 0;

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setProductSelectOpen(false);

    const product = products.find(p => p.id === productId);
    if (product) {
      setUnitPrice(String(getProductSellPrice(product)));
    }

    requestAnimationFrame(() => {
      quantityInputRef.current?.focus();
    });
  };

  const handleAddProduct = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) {
      toast({
        variant: "destructive",
        title: "Invalid Selection",
        description: "Please select a valid product.",
      });
      return;
    }

    const qty = parseInt(quantity);
    const price = parseFloat(unitPrice || product.cost_price?.toString() || "0");

    if (qty <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Quantity",
        description: "Quantity must be greater than 0.",
      });
      return;
    }

    if (qty > (product.current_stock || 0)) {
      toast({
        variant: "destructive",
        title: "Insufficient Stock",
        description: `Only ${product.current_stock || 0} units available in stock.`,
      });
      return;
    }

    if (price <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Price",
        description: "Unit price must be greater than 0.",
      });
      return;
    }

    const serialEntries = buildDefaultSerialEntries(qty, 0);

    const newItem: SaleItem = {
      id: `temp_${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      quantity: qty,
      unit_price: price,
      line_total: qty * price,
      stock_available: product.current_stock || 0,
      is_serialized: !!product.is_serialized,
      warranty_months: (product as any).warranty_months ?? null,
      product_type: (product as any).product_type ?? null,
      brand: (product as any).brand ?? null,
      serial_entries: serialEntries,
      serial_numbers: [],
      selected_serial_ids: [],
      has_missing_serials: computeHasMissingSerials(serialEntries, qty),
    };

    onAddItem(newItem);

    setSelectedProduct("");
    setQuantity("1");
    setUnitPrice("");
  };

  const handleQuantityChange = (itemId: string, newQuantity: string) => {
    const qty = parseInt(newQuantity);
    const item = saleItems.find(i => i.id === itemId);
    
    if (!item || qty <= 0) return;

    const otherQtySameProduct = saleItems
      .filter((i) => i.product_id === item.product_id && i.id !== itemId)
      .reduce((sum, i) => sum + Number(i.quantity || 0), 0);
    const maxForLine = Math.max(0, item.stock_available - otherQtySameProduct);

    if (qty > maxForLine) {
      toast({
        variant: "destructive",
        title: "Insufficient Stock",
        description: `Only ${maxForLine} units available for ${item.product_name} on this sale.`,
      });
      return;
    }

    const prevEntries = item.serial_entries || [];
    const nextEntries = resizeSerialEntries(prevEntries, qty, prevEntries.filter((e) => e.mode === "pick").length);

    onUpdateItem(itemId, {
      quantity: qty,
      line_total: qty * item.unit_price,
      serial_entries: nextEntries,
      serial_numbers: serialEntriesToNumbers(nextEntries),
      selected_serial_ids: nextEntries
        .filter((e) => e.mode === "pick" && e.serial_id)
        .map((e) => e.serial_id!),
      has_missing_serials: computeHasMissingSerials(nextEntries, qty),
    });
  };

  const handlePriceChange = (itemId: string, newPrice: string) => {
    const price = parseFloat(newPrice);
    const item = saleItems.find(i => i.id === itemId);
    
    if (!item || price <= 0) return;

    onUpdateItem(itemId, {
      unit_price: price,
      line_total: item.quantity * price
    });
  };

  const handleSerialChange = (itemId: string, entries: SerialEntry[], hasMissing: boolean) => {
    onUpdateItem(itemId, {
      serial_entries: entries,
      serial_numbers: serialEntriesToNumbers(entries),
      selected_serial_ids: entries
        .filter((e) => e.mode === "pick" && e.serial_id)
        .map((e) => e.serial_id!),
      has_missing_serials: hasMissing,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 p-4 border rounded-lg">
        <h3 className="font-semibold">Add Products to Sale</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Search Products</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category!}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Product *</Label>
            <Select
              open={productSelectOpen}
              onOpenChange={setProductSelectOpen}
              value={selectedProduct}
              onValueChange={handleProductSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {product.current_stock || 0} {product.unit || 'pcs'}
                        {product.sku && ` • SKU: ${product.sku}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantity *</Label>
            <Input
              ref={quantityInputRef}
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <Label>Unit Price *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder={selectedProduct ? undefined : "0"}
            />
          </div>

          <div className="space-y-2">
            <Label className="invisible">Action</Label>
            <Button 
              type="button" 
              onClick={handleAddProduct}
              disabled={!selectedProduct || !quantity}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </div>

      {saleItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Sale Items</h3>
          <div className="space-y-2">
            {saleItems.map((item) => {
              const warrantyLabel = item.warranty_months
                ? `This product carries ${item.warranty_months >= 12 && item.warranty_months % 12 === 0
                    ? `${item.warranty_months / 12} year`
                    : `${item.warranty_months} month`} warranty`
                : "No warranty";
              return (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <div className="font-medium">{item.product_name}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.product_type && (
                          <Badge variant="secondary" className="capitalize text-[10px]">
                            {item.product_type}
                          </Badge>
                        )}
                        {item.brand && (
                          <Badge variant="outline" className="text-[10px]">{item.brand}</Badge>
                        )}
                        {item.has_missing_serials && (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-800 bg-amber-50">
                            Missing serials
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{warrantyLabel}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        {item.stock_available < 10 && (
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        )}
                        Stock: {item.stock_available}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        max={Math.max(
                          1,
                          item.stock_available -
                            saleItems
                              .filter(
                                (i) =>
                                  i.product_id === item.product_id && i.id !== item.id
                              )
                              .reduce((sum, i) => sum + Number(i.quantity || 0), 0)
                        )}
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Line Total</Label>
                      <div className="font-medium">₪{(Number(item.line_total) || 0).toFixed(2)}</div>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <SaleLineSerialSelector
                    productId={item.product_id}
                    productName={item.product_name}
                    quantity={item.quantity}
                    serialEntries={item.serial_entries || []}
                    editingSaleId={editingSaleId}
                    excludeSerialIds={getExcludedSerialIds(item.id)}
                    onChange={(entries, hasMissing) =>
                      handleSerialChange(item.id, entries, hasMissing)
                    }
                  />
                </CardContent>
              </Card>
              );
            })}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center font-semibold text-lg">
              <span>Total Amount:</span>
              <span>₪{(Number(saleItems.reduce((sum, item) => sum + item.line_total, 0)) || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSelector;
