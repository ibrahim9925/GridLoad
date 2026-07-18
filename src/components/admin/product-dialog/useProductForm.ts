// @ts-nocheck

import { useState, useEffect } from "react";
import { Tables } from "@/integrations/supabase/types";

type ProductBase = Tables<'products'>;
type ProductWithPricing = ProductBase & {
  min_selling_price?: number;
  standard_selling_price?: number;
  max_selling_price?: number;
  image_url?: string;
};
type PartialProductWithPricing = Partial<ProductWithPricing>;

export function useProductForm(product: ProductWithPricing | null) {
  const [formData, setFormData] = useState<PartialProductWithPricing>({
    name: "",
    sku: "",
    category: "",
    description: "",
    moq: 0,
    cost_price: 0,
    current_stock: 0,
    low_stock_threshold: 10,
    max_stock_level: 100,
    supplier: "",
    unit: "pcs",
    status: "Active",
    min_selling_price: 0,
    standard_selling_price: 0,
    max_selling_price: 0,
    image_url: "",
    product_type: "other",
    brand: "",
    warranty_months: 12,
    short_description: "",
    full_description: "",
    specs: {},
    images: [],
    datasheet_url: "",
    is_featured: false,
    is_active: true,
  } as any);
  const [imageUrl, setImageUrl] = useState<string>(formData.image_url || "");

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id,
        name: product.name,
        sku: product.sku || "",
        category: product.category || "",
        description: product.description || "",
        moq: product.moq || 0,
        cost_price: product.cost_price || 0,
        current_stock: product.current_stock || 0,
        low_stock_threshold: product.low_stock_threshold || 10,
        max_stock_level: product.max_stock_level || 100,
        supplier: product.supplier || "",
        unit: product.unit || "pcs",
        status: product.status || "Active",
        min_selling_price: product.min_selling_price ?? 0,
        standard_selling_price: product.standard_selling_price ?? 0,
        max_selling_price: product.max_selling_price ?? 0,
        image_url: product.image_url ?? "",
        product_type: (product as any).product_type || "other",
        brand: (product as any).brand || "",
        warranty_months: (product as any).warranty_months ?? 12,
        short_description: (product as any).short_description ?? "",
        full_description: (product as any).full_description ?? "",
        specs: (product as any).specs ?? {},
        images: Array.isArray((product as any).images) ? (product as any).images : [],
        datasheet_url: (product as any).datasheet_url ?? "",
        is_featured: !!(product as any).is_featured,
        is_active: (product as any).is_active !== false,
      } as any);
      setImageUrl(product.image_url ?? "");
    } else {
      setFormData({
        name: "",
        sku: "",
        category: "",
        description: "",
        moq: 0,
        cost_price: 0,
        current_stock: 0,
        low_stock_threshold: 10,
        max_stock_level: 100,
        supplier: "",
        unit: "pcs",
        status: "Active",
        min_selling_price: 0,
        standard_selling_price: 0,
        max_selling_price: 0,
        image_url: ""
      });
      setImageUrl("");
    }
  }, [product]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      image_url: imageUrl,
    }));
  }, [imageUrl]);

  const handleInputChange = (field: keyof ProductWithPricing, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return {
    formData, setFormData, handleInputChange, imageUrl, setImageUrl
  };
}
