// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Upload, Download, Search, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatters";

interface Product {
  id: string;
  name: string;
  sku: string;
  warranty_months: number;
}

interface SerialNumber {
  id: string;
  serial_number: string;
  status: string;
  product_id: string;
  product: Product;
  received_date: string;
  sold_date?: string;
  notes?: string;
}

const SerialNumberManager = () => {
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [bulkSerials, setBulkSerials] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchSerialNumbers();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, warranty_months")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error loading products",
        description: "Please try again.",
      });
    }
  };

  const fetchSerialNumbers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_serial_numbers")
        .select(`
          *,
          product:products(id, name, sku, warranty_months)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSerialNumbers(data || []);
    } catch (error) {
      console.error("Error fetching serial numbers:", error);
      toast({
        variant: "destructive",
        title: "Error loading serial numbers",
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!selectedProduct || !bulkSerials.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a product and enter serial numbers.",
      });
      return;
    }

    const serialsArray = bulkSerials
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (serialsArray.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter at least one serial number.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const serialsToInsert = serialsArray.map(serial => ({
        product_id: selectedProduct,
        serial_number: serial,
        status: 'available',
        received_date: new Date().toISOString().split('T')[0],
      }));

      const { error } = await supabase
        .from("product_serial_numbers")
        .insert(serialsToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${serialsArray.length} serial numbers successfully.`,
      });

      setBulkSerials("");
      setSelectedProduct("");
      setShowAddDialog(false);
      fetchSerialNumbers();
    } catch (error: any) {
      console.error("Error importing serial numbers:", error);
      toast({
        variant: "destructive",
        title: "Import Error",
        description: error.message?.includes('duplicate') 
          ? "Some serial numbers already exist in the system."
          : "Failed to import serial numbers. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "default",
      sold: "destructive",
      reserved: "secondary",
      defective: "outline",
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredSerialNumbers = serialNumbers.filter(serial => {
    const matchesSearch = serial.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         serial.product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || serial.status === statusFilter;
    const matchesProduct = productFilter === "all" || serial.product_id === productFilter;
    
    return matchesSearch && matchesStatus && matchesProduct;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Serial Number Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track product serial numbers from factory to customer
              </p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Serial Numbers
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Import Serial Numbers</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="product">Product</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serials">Serial Numbers (one per line)</Label>
                    <Textarea
                      id="serials"
                      placeholder="Enter serial numbers, one per line..."
                      value={bulkSerials}
                      onChange={(e) => setBulkSerials(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkImport} disabled={isLoading}>
                      {isLoading ? "Importing..." : "Import Serial Numbers"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search serial numbers or products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="defective">Defective</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Serial Numbers Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Sold Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading serial numbers...
                    </TableCell>
                  </TableRow>
                ) : filteredSerialNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No serial numbers found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSerialNumbers.map((serial) => (
                    <TableRow key={serial.id}>
                      <TableCell className="font-mono font-medium">
                        {serial.serial_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{serial.product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {serial.product.sku}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(serial.status)}</TableCell>
                      <TableCell>
                        {new Date(serial.received_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {serial.sold_date 
                          ? new Date(serial.sold_date).toLocaleDateString()
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {serial.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {serialNumbers.filter(s => s.status === 'available').length}
              </div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {serialNumbers.filter(s => s.status === 'sold').length}
              </div>
              <div className="text-sm text-muted-foreground">Sold</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {serialNumbers.filter(s => s.status === 'reserved').length}
              </div>
              <div className="text-sm text-muted-foreground">Reserved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {serialNumbers.filter(s => s.status === 'defective').length}
              </div>
              <div className="text-sm text-muted-foreground">Defective</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SerialNumberManager;