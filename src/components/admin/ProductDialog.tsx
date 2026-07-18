// @ts-nocheck
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ProductImageSection from "./product-dialog/ProductImageSection";
import ProductBasicInfoSection from "./product-dialog/ProductBasicInfoSection";
import ProductPricingSection from "./product-dialog/ProductPricingSection";
import ProductInventorySection from "./product-dialog/ProductInventorySection";
import ProductStatusSection from "./product-dialog/ProductStatusSection";
import ProductWebsiteContentSection from "./product-dialog/ProductWebsiteContentSection";
import { useProductForm } from "./product-dialog/useProductForm";
import { Tables } from "@/integrations/supabase/types";

// 👇 Extend Product and Partial<Product> to include new pricing fields

type ProductBase = Tables<'products'>;
type ProductWithPricing = ProductBase & {
  min_selling_price?: number;
  standard_selling_price?: number;
  max_selling_price?: number;
  image_url?: string;
};
type PartialProductWithPricing = Partial<ProductWithPricing>;

type ProductDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (product: Partial<ProductWithPricing>) => void;
  product?: ProductWithPricing | null;
};

const ProductDialog = ({
  open,
  onClose,
  onSave,
  product = null,
}: ProductDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    formData,
    handleInputChange,
    imageUrl,
    setImageUrl,
  } = useProductForm(product);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      console.warn("⚠️ ProductDialog: Product name is required");
      return;
    }

    console.log("💾 ProductDialog: Submitting form data:", formData);
    setIsSubmitting(true);
    
    try {
      await onSave({...formData, image_url: imageUrl});
      console.log("✅ ProductDialog: Product saved successfully");
    } catch (error) {
      console.error("❌ ProductDialog: Save failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? `Edit Product: ${product.name}` : "Add New Product"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <ProductImageSection 
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            isSubmitting={isSubmitting}
          />

          <ProductBasicInfoSection
            formData={formData}
            handleInputChange={handleInputChange}
          />

          <ProductPricingSection
            formData={formData}
            handleInputChange={handleInputChange}
          />

          <ProductInventorySection
            formData={formData}
            handleInputChange={handleInputChange}
          />

          <ProductStatusSection
            formData={formData}
            handleInputChange={handleInputChange}
          />

          <ProductWebsiteContentSection
            formData={formData}
            handleInputChange={handleInputChange}
          />

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (product ? "Update Product" : "Add Product")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDialog;
