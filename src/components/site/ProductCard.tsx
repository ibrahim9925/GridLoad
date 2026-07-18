import { Link } from "react-router-dom";
import { PublicProduct } from "@/lib/publicTypes";

const CATEGORY_LABEL: Record<string, string> = {
  inverter: "Inverter",
  panel: "Panel",
  battery: "Battery",
  accessory: "Accessory",
};

export default function ProductCard({ product }: { product: PublicProduct }) {
  const cover = product.images?.[0] || product.image_url || null;
  const href = `/products/${product.slug ?? product.id}`;
  return (
    <Link
      to={href}
      className="group bg-white border border-gridload-lightgray rounded-lg overflow-hidden hover:shadow-lg hover:border-gridload-green transition-all flex flex-col"
    >
      <div className="aspect-[4/3] bg-gridload-offwhite flex items-center justify-center overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-gridload-navy/30 text-sm">No image</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-xs">
          {product.brand && (
            <span className="font-semibold text-gridload-navy uppercase tracking-wider">
              {product.brand}
            </span>
          )}
          {product.category && (
            <span className="px-2 py-0.5 rounded bg-gridload-green/10 text-gridload-green font-medium">
              {CATEGORY_LABEL[product.category] ?? product.category}
            </span>
          )}
        </div>
        <h3 className="mt-2 font-semibold text-gridload-navy leading-snug line-clamp-2">
          {product.name}
        </h3>
        {product.sku && (
          <p className="mt-1 text-xs text-muted-foreground">SKU: {product.sku}</p>
        )}
        {product.short_description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {product.short_description}
          </p>
        )}
        <span className="mt-4 text-sm font-semibold text-gridload-green inline-flex items-center group-hover:translate-x-1 transition-transform">
          View Details →
        </span>
      </div>
    </Link>
  );
}
