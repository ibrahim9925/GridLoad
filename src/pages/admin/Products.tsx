import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Package, Search, AlertTriangle, Edit2, Check, X, ChevronRight, Save, Globe, Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatNIS } from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";
import ProductDialog from "@/components/admin/ProductDialog";
import ProductBulkEditDialog from "@/components/admin/products/ProductBulkEditDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkSelection } from "@/hooks/useBulkSelection";

const CATEGORIES = ["Inverter", "Panel", "Battery", "Cable", "Accessory", "Other"];
const PRODUCT_TYPES = ["inverter", "panel", "battery", "breaker", "wire", "structure", "accessory", "other"];

const warrantyLabel = (m: number | null | undefined) => {
  if (m == null) return "No warranty";
  if (m >= 12 && m % 12 === 0) return `${m / 12} year warranty`;
  return `${m} month warranty`;
};

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [activeMobile, setActiveMobile] = useState<any>(null);
  const [serials, setSerials] = useState<any[]>([]);
  const [mobileEdit, setMobileEdit] = useState<any>(null);
  const [savingMobile, setSavingMobile] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [webDialogProduct, setWebDialogProduct] = useState<any>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  const handleCreateProduct = async (data: any) => {
    const sku = data.sku?.trim() || `SKU-${Date.now()}`;
    const payload = {
      name: data.name.trim(),
      sku,
      category: data.category || "Other",
      description: data.description || null,
      cost_price: data.cost_price ?? 0,
      current_stock: data.current_stock ?? 0,
      standard_selling_price: data.standard_selling_price ?? 0,
      min_stock_level: data.low_stock_threshold ?? data.min_stock_level ?? 0,
      product_type: data.product_type || "other",
      brand: data.brand || null,
      warranty_months: data.warranty_months ?? 12,
      status: "active",
      is_active: true,
      reorder_point: 0,
      unit: data.unit || "pcs",
      image_url: data.image_url || null,
      short_description: data.short_description || null,
      full_description: data.full_description || null,
      specs: data.specs ?? {},
      images: Array.isArray(data.images) ? data.images : [],
      datasheet_url: data.datasheet_url || null,
      is_featured: !!data.is_featured,
    };
    const { error } = await supabase.from("products").insert(payload);
    if (error) {
      toast({ variant: "destructive", title: "Create failed", description: error.message });
      throw error;
    }
    toast({ title: "Product created" });
    setCreateDialogOpen(false);
    fetchProducts();
  };

  const handleWebDialogSave = async (data: any) => {
    if (!data.id) return;
    const payload: any = {
      short_description: data.short_description ?? null,
      full_description: data.full_description ?? null,
      specs: data.specs ?? {},
      images: Array.isArray(data.images) ? data.images : [],
      datasheet_url: data.datasheet_url ?? null,
      is_featured: !!data.is_featured,
      is_active: data.is_active !== false,
      brand: data.brand ?? null,
      product_type: data.product_type ?? "other",
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("products").update(payload).eq("id", data.id);
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
      throw error;
    }
    toast({ title: "Website content saved" });
    setWebDialogProduct(null);
    fetchProducts();
  };

  const openMobileDetail = async (p: any) => {
    setActiveMobile(p);
    setMobileEdit({
      standard_selling_price: p.standard_selling_price || 0,
      min_stock_level: p.min_stock_level || 0,
      warranty_months: p.warranty_months ?? 12,
      product_type: p.product_type || "other",
      brand: p.brand || "",
    });
    const { data } = await supabase
      .from("warranties")
      .select("serial_number, status")
      .eq("product_id", p.id)
      .limit(20);
    setSerials(data || []);
  };

  const saveMobileEdit = async () => {
    if (!activeMobile) return;
    setSavingMobile(true);
    const { error } = await supabase.from("products").update(mobileEdit).eq("id", activeMobile.id);
    setSavingMobile(false);
    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else {
      toast({ title: "Product updated" });
      setActiveMobile(null);
      fetchProducts();
    }
  };

  useEffect(() => { fetchProducts(); fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name").order("name");
    setSuppliers(data || []);
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*, suppliers:supplier_id(name)")
      .order("name");
    if (error) {
      toast({ variant: "destructive", title: "Failed to load products", description: error.message });
    }
    setProducts(data || []);
    setIsLoading(false);
  };

  const startEdit = (product: any) => {
    setEditingId(product.id);
    setEditData({
      standard_selling_price: product.standard_selling_price || 0,
      min_stock_level: product.min_stock_level || 0,
      warranty_months: product.warranty_months ?? 12,
      category: product.category || "Other",
      product_type: product.product_type || "other",
      brand: product.brand || "",
      status: product.status || "active",
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("products").update(editData).eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Product updated" });
      fetchProducts();
    }
    setEditingId(null);
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const {
    selectedIds,
    selectedItems,
    selectItem,
    isSelected,
    deselectAll,
    selectedCount,
  } = useBulkSelection(filtered, (p) => p.id);

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => isSelected(p.id));
  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      filtered.forEach((p) => { if (isSelected(p.id)) selectItem(p.id); });
    } else {
      filtered.forEach((p) => { if (!isSelected(p.id)) selectItem(p.id); });
    }
  };

  const lowStockCount = products.filter(
    (p) => p.is_active && p.current_stock <= (p.min_stock_level || 0)
  ).length;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground">
            Manage products, pricing, stock levels, and website content. Products can also be auto-created from Purchase Orders.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Package className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">
                {products.filter((p) => p.status === "active" || p.is_active).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-destructive">{lowStockCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCount > 0 && (
        <div className="hidden md:flex items-center justify-between rounded-lg border bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={deselectAll}>Clear</Button>
            <Button size="sm" onClick={() => setBulkEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Bulk edit
            </Button>
          </div>
        </div>
      )}

      {/* Mobile card grid */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No products found.</p>
        ) : filtered.map((p) => {
          const isLowStock = p.current_stock <= (p.min_stock_level || 0);
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/admin/products/${p.id}`)}
              className="w-full bg-card border rounded-xl p-4 text-left hover:bg-muted/40 min-h-[72px] flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.product_type && (
                    <Badge variant="secondary" className="text-[10px] capitalize">{p.product_type}</Badge>
                  )}
                  {p.brand && <Badge variant="outline" className="text-[10px]">{p.brand}</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-1">{p.sku || "—"} · {warrantyLabel(p.warranty_months)}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-xs ${(p.current_stock <= (p.min_stock_level || 0)) ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                    Stock: {p.current_stock || 0}
                  </span>
                  <span className="text-sm font-bold">{formatNIS(p.standard_selling_price || 0)}</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleSelectAllFiltered}
                    aria-label="Select all products"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Sell Price (₪)</TableHead>
                <TableHead>Cost Price (₪)</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                    No products found. Products will appear here when created via Purchase Orders.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const isEditing = editingId === p.id;
                  const isLowStock = p.current_stock <= (p.min_stock_level || 0);
                  return (
                    <TableRow key={p.id} data-state={isSelected(p.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected(p.id)}
                          onCheckedChange={() => selectItem(p.id)}
                          aria-label={`Select ${p.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <button className="text-left hover:underline" onClick={() => navigate(`/admin/products/${p.id}`)}>{p.name}</button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select value={editData.product_type} onValueChange={(v) => setEditData({ ...editData, product_type: v })}>
                            <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PRODUCT_TYPES.map((t) => (<SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="capitalize">{p.product_type || "other"}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input className="w-28 h-8" value={editData.brand || ""}
                            onChange={(e) => setEditData({ ...editData, brand: e.target.value })} />
                        ) : (
                          <span className="text-muted-foreground">{p.brand || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            className="w-24 h-8"
                            value={editData.standard_selling_price}
                            onChange={(e) => setEditData({ ...editData, standard_selling_price: parseFloat(e.target.value) || 0 })}
                          />
                        ) : (
                          formatNIS(p.standard_selling_price || 0)
                        )}
                      </TableCell>
                      <TableCell>{formatNIS(p.landed_cost || p.cost_price || 0)}</TableCell>
                      <TableCell>
                        <span className={isLowStock ? "text-destructive font-bold" : ""}>
                          {p.current_stock || 0}
                        </span>
                        {isLowStock && <AlertTriangle className="inline h-3 w-3 ml-1 text-destructive" />}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            className="w-20 h-8"
                            value={editData.min_stock_level}
                            onChange={(e) => setEditData({ ...editData, min_stock_level: parseInt(e.target.value) || 0 })}
                          />
                        ) : (
                          p.min_stock_level || 0
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            className="w-20 h-8"
                            placeholder="months"
                            value={editData.warranty_months ?? ""}
                            onChange={(e) => setEditData({ ...editData, warranty_months: e.target.value === "" ? null : parseInt(e.target.value) || 0 })}
                          />
                        ) : (
                          <span className="text-xs">{warrantyLabel(p.warranty_months)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.suppliers?.name || p.supplier || "—"}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                            <SelectTrigger className="w-[130px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="discontinued">Discontinued</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={p.status === "active" ? "default" : "secondary"}>
                            {p.status || "active"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(p.id)}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Website content (descriptions, specs, images, datasheet)"
                              onClick={() => setWebDialogProduct(p)}
                            >
                              <Globe className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Quick edit row" onClick={() => startEdit(p)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile detail sheet */}
      <Sheet open={!!activeMobile} onOpenChange={(o) => !o && setActiveMobile(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto">
          {activeMobile && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle>{activeMobile.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted rounded p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Stock</p>
                    <p className={`text-lg font-bold ${activeMobile.current_stock <= (activeMobile.min_stock_level || 0) ? "text-destructive" : ""}`}>
                      {activeMobile.current_stock || 0}
                    </p>
                  </div>
                  <div className="bg-muted rounded p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Cost</p>
                    <p className="text-lg font-bold">{formatNIS(activeMobile.landed_cost || activeMobile.cost_price || 0)}</p>
                  </div>
                </div>
                <div className="text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">SKU</span><span>{activeMobile.sku || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Category</span><Badge variant="outline">{activeMobile.category || "Other"}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span className="truncate ml-2">{activeMobile.suppliers?.name || "—"}</span></div>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <Label className="text-xs">Sell Price (₪)</Label>
                    <Input type="number" inputMode="decimal" className="h-12 text-base" value={mobileEdit?.standard_selling_price ?? 0}
                      onChange={(e) => setMobileEdit({ ...mobileEdit, standard_selling_price: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Product Type</Label>
                      <Select value={mobileEdit?.product_type || "other"} onValueChange={(v) => setMobileEdit({ ...mobileEdit, product_type: v })}>
                        <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRODUCT_TYPES.map((t) => (<SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Brand</Label>
                      <Input className="h-12 text-base" value={mobileEdit?.brand || ""}
                        onChange={(e) => setMobileEdit({ ...mobileEdit, brand: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Reorder Point</Label>
                      <Input type="number" inputMode="numeric" className="h-12 text-base" value={mobileEdit?.min_stock_level ?? 0}
                        onChange={(e) => setMobileEdit({ ...mobileEdit, min_stock_level: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label className="text-xs">Warranty (months, empty = none)</Label>
                      <Input type="number" inputMode="numeric" className="h-12 text-base"
                        value={mobileEdit?.warranty_months ?? ""}
                        onChange={(e) => setMobileEdit({ ...mobileEdit, warranty_months: e.target.value === "" ? null : parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <Button onClick={saveMobileEdit} disabled={savingMobile} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Save className="h-4 w-4 mr-2" />{savingMobile ? "Saving…" : "Save Changes"}
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Serial Numbers ({serials.length})</p>
                  {serials.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No serials registered.</p>
                  ) : serials.map((s, i) => (
                    <div key={i} className="border rounded p-2 flex justify-between text-xs">
                      <span className="font-mono">{s.serial_number}</span>
                      <Badge variant="outline" className="capitalize text-[10px]">{s.status || "active"}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ProductBulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedProducts={selectedItems}
        suppliers={suppliers}
        onSuccess={() => {
          deselectAll();
          fetchProducts();
        }}
      />

      {/* Create product dialog */}
      <ProductDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSave={handleCreateProduct}
        product={null}
      />

      {/* Website content dialog */}
      <ProductDialog
        open={!!webDialogProduct}
        onClose={() => setWebDialogProduct(null)}
        onSave={handleWebDialogSave}
        product={webDialogProduct}
      />
    </div>
  );
};

export default Products;
