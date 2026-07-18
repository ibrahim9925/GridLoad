import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import { PublicProduct, PRODUCT_FIELDS } from "@/lib/publicTypes";
import { ChevronRight, Download } from "lucide-react";

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const [product, setProduct] = useState<PublicProduct | null | undefined>(undefined);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    (async () => {
      // try slug first, then id fallback
      const bySlug = await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (bySlug.data) {
        setProduct(bySlug.data as any);
        return;
      }
      const byId = await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("id", slug)
        .eq("is_active", true)
        .maybeSingle();
      setProduct((byId.data as any) ?? null);
    })();
  }, [slug]);

  useEffect(() => {
    if (product) {
      document.title = `${product.name} — GridLoad Energy`;
      const meta = document.querySelector('meta[name="description"]');
      if (meta && product.short_description) meta.setAttribute("content", product.short_description);
    }
  }, [product]);

  if (product === undefined) {
    return (
      <SiteLayout>
        <div className="gridload-container py-12">
          <div className="h-96 bg-gridload-offwhite animate-pulse rounded-lg" />
        </div>
      </SiteLayout>
    );
  }

  if (product === null) {
    return (
      <SiteLayout>
        <div className="gridload-container py-20 text-center">
          <h1 className="text-2xl font-bold text-gridload-navy">Product not found</h1>
          <Link to="/products" className="mt-4 inline-block text-gridload-green font-semibold">← Back to products</Link>
        </div>
      </SiteLayout>
    );
  }

  const images = (product.images && product.images.length > 0
    ? product.images
    : product.image_url
    ? [product.image_url]
    : []) as string[];

  const specEntries = product.specs ? Object.entries(product.specs) : [];

  return (
    <SiteLayout>
      <div className="gridload-container py-6">
        {/* breadcrumbs */}
        <nav className="text-sm text-muted-foreground flex items-center flex-wrap gap-1 mb-4">
          <Link to="/" className="hover:text-gridload-green">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/products" className="hover:text-gridload-green">Products</Link>
          {product.category && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/products?category=${product.category}`} className="hover:text-gridload-green capitalize">
                {product.category}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-gridload-navy truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Gallery */}
          <div>
            <div className="aspect-square bg-gridload-offwhite rounded-lg overflow-hidden flex items-center justify-center">
              {images[imgIdx] ? (
                <img src={images[imgIdx]} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-gridload-navy/30">No image</span>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-md border-2 overflow-hidden bg-white ${
                      i === imgIdx ? "border-gridload-green" : "border-gridload-lightgray"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {product.brand && (
                <span className="font-semibold text-gridload-navy uppercase tracking-wider">{product.brand}</span>
              )}
              {(product.product_type || product.category) && (
                <span className="px-2 py-0.5 rounded bg-gridload-green/10 text-gridload-green font-medium capitalize">
                  {product.product_type || product.category}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold text-gridload-navy">{product.name}</h1>
            {product.sku && <p className="mt-1 text-sm text-muted-foreground">SKU: {product.sku}</p>}
            {product.short_description && (
              <p className="mt-4 text-lg text-gridload-navy/80">{product.short_description}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/contact?product=${encodeURIComponent(product.name)}`}
                className="px-5 py-2.5 rounded-md bg-gridload-green text-white font-semibold hover:bg-gridload-green/90"
              >
                Request a Quote
              </Link>
              {product.datasheet_url && (
                <a
                  href={product.datasheet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-gridload-navy text-gridload-navy font-semibold hover:bg-gridload-navy hover:text-white transition-colors"
                >
                  <Download className="h-4 w-4" /> Download Datasheet
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Full description */}
        {product.full_description && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gridload-navy mb-3">Description</h2>
            <div className="prose max-w-none whitespace-pre-line text-gridload-navy/85">
              {product.full_description}
            </div>
          </section>
        )}

        {/* Specs */}
        {specEntries.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gridload-navy mb-3">Technical Specifications</h2>
            <div className="bg-white border border-gridload-lightgray rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {specEntries.map(([k, v], i) => (
                    <tr key={k} className={i % 2 ? "bg-gridload-offwhite" : "bg-white"}>
                      <td className="px-4 py-3 font-medium text-gridload-navy w-1/2">{k}</td>
                      <td className="px-4 py-3 text-muted-foreground">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
