// @ts-nocheck

import React from "react";
import ProductImageUpload from "../ProductImageUpload";

interface ProductImageSectionProps {
  imageUrl: string;
  setImageUrl: (url: string) => void;
  isSubmitting: boolean;
}

const ProductImageSection: React.FC<ProductImageSectionProps> = ({
  imageUrl,
  setImageUrl,
  isSubmitting
}) => (
  <ProductImageUpload
    value={imageUrl}
    onChange={setImageUrl}
    label="Product Image (optional)"
    disabled={isSubmitting}
    className="mb-2"
  />
);

export default ProductImageSection;
