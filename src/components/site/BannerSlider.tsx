import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
};

export default function BannerSlider() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    supabase
      .from("banners")
      .select("id,title,subtitle,image_url,cta_text,cta_link")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => setBanners((data ?? []) as Banner[]));
  }, []);

  useEffect(() => {
    if (!banners || banners.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners]);

  if (banners === null) {
    return <div className="h-[420px] md:h-[560px] bg-gridload-offwhite animate-pulse" />;
  }

  if (banners.length === 0) {
    return (
      <section className="relative h-[420px] md:h-[560px] bg-gridload-navy text-white flex items-center">
        <div className="gridload-container">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl">
            Authorized Solar Distribution.
            <span className="block text-gridload-yellow">Built for Scale.</span>
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-xl">
            GridLoad delivers high-performance inverters, panels and storage to installers across the region.
          </p>
          <Link
            to="/products"
            className="mt-8 inline-flex px-6 py-3 rounded-md bg-gridload-yellow text-gridload-navy font-semibold hover:brightness-95"
          >
            Browse Products
          </Link>
        </div>
      </section>
    );
  }

  const b = banners[idx];
  return (
    <section className="relative h-[420px] md:h-[560px] overflow-hidden bg-gridload-navy">
      {b.image_url && (
        <img
          src={b.image_url}
          alt={b.title}
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-gridload-navy/90 via-gridload-navy/60 to-transparent" />
      <div className="relative h-full gridload-container flex items-center">
        <div className="max-w-2xl text-white">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">{b.title}</h1>
          {b.subtitle && <p className="mt-4 text-lg text-white/85">{b.subtitle}</p>}
          {b.cta_text && b.cta_link && (
            <Link
              to={b.cta_link}
              className="mt-8 inline-flex px-6 py-3 rounded-md bg-gridload-yellow text-gridload-navy font-semibold hover:brightness-95"
            >
              {b.cta_text}
            </Link>
          )}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === idx ? "w-8 bg-gridload-yellow" : "w-2 bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
