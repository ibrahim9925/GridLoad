import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import ProductCard from "@/components/site/ProductCard";
import { PublicProduct, PRODUCT_FIELDS } from "@/lib/publicTypes";
import { Search } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "inverter", label: "Inverter" },
  { value: "panel", label: "Panel" },
  { value: "battery", label: "Battery" },
  { value: "accessory", label: "Accessory" },
];

export default function Products() {
  const [products, setProducts] = useState<PublicProduct[] | null>(null);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const category = params.get("category") ?? "all";
  const brand = params.get("brand") ?? "all";

  useEffect(() => {
    document.title = "Products — GridLoad Energy";
    supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("name")
      .then(({ data }) => setProducts((data ?? []) as any));
  }, []);

  const brands = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.map((p) => p.brand).filter(Boolean))) as string[];
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (brand !== "all" && p.brand !== brand) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.sku ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, category, brand, search]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "all" || !value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <SiteLayout>
      <div className="bg-gridload-navy text-white py-12">
        <div className="gridload-container">
          <h1 className="text-3xl md:text-5xl font-bold">Products</h1>
          <p className="mt-2 text-white/80">Authorized inverters, panels, batteries and accessories.</p>
        </div>
      </div>

      <div className="gridload-container py-8">
        <div className="bg-white border border-gridload-lightgray rounded-lg p-4 flex flex-col md:flex-row gap-3 md:items-center mb-6">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setParam("category", c.value)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  category === c.value
                    ? "bg-gridload-green text-white border-gridload-green"
                    : "border-gridload-lightgray text-gridload-navy hover:border-gridload-green"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {brands.length > 0 && (
            <select
              value={brand}
              onChange={(e) => setParam("brand", e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-gridload-lightgray text-gridload-navy bg-white"
            >
              <option value="all">All brands</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          <div className="relative md:ml-auto md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-gridload-lightgray"
            />
          </div>
        </div>

        {products === null ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-gridload-offwhite rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No products match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
