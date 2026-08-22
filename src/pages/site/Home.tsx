import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import BannerSlider from "@/components/site/BannerSlider";
import ProductCard from "@/components/site/ProductCard";
import ProjectCard from "@/components/site/ProjectCard";
import { Award, Handshake, Headphones, Globe } from "lucide-react";
import { PublicProduct, PublicProject, PRODUCT_FIELDS } from "@/lib/publicTypes";

const WHY = [
  { icon: Award, title: "Authorized Distributor", desc: "Official partner status with leading global manufacturers." },
  { icon: Handshake, title: "Deye & Jinko Partner", desc: "Stocked inventory of trusted inverter and panel brands." },
  { icon: Headphones, title: "Technical Support", desc: "Engineering help from sizing to commissioning." },
  { icon: Globe, title: "Export Ready", desc: "Container-scale logistics across the MENA region." },
];

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<PublicProduct[] | null>(null);
  const [projects, setProjects] = useState<PublicProject[] | null>(null);

  useEffect(() => {
    document.title = "GridLoad Energy — Authorized Solar Distribution";
    supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("is_active", true)
      .eq("is_featured", true)
      .limit(6)
      .then(({ data }) => setProducts((data ?? []) as any));
    supabase
      .from("projects")
      .select("*")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("completion_date", { ascending: false, nullsFirst: false })
      .limit(3)
      .then(({ data }) => setProjects((data ?? []) as any));
  }, []);

  return (
    <SiteLayout>
      <BannerSlider />

      {/* Why GridLoad */}
      <section className="py-16 bg-white">
        <div className="gridload-container">
          <h2 className="text-3xl md:text-4xl font-bold text-gridload-navy text-center">Why GridLoad</h2>
          <p className="mt-2 text-center text-muted-foreground">Trusted by installers, built for scale.</p>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            {WHY.map((w) => (
              <div key={w.title} className="text-center p-6 bg-gridload-offwhite rounded-lg">
                <div className="mx-auto w-12 h-12 rounded-full bg-gridload-navy text-gridload-yellow flex items-center justify-center">
                  <w.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-gridload-navy">{w.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gridload-offwhite">
        <div className="gridload-container">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-2">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gridload-navy">Featured Products</h2>
              <p className="mt-1 text-muted-foreground">Inverters, panels and batteries — in stock and ready to ship.</p>
            </div>
            <Link to="/products" className="text-gridload-green font-semibold hover:underline">View all →</Link>
          </div>
          {products === null ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-white rounded-lg animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No featured products yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-16 bg-white">
        <div className="gridload-container">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-2">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gridload-navy">Featured Projects</h2>
              <p className="mt-1 text-muted-foreground">A look at recent installations powered by GridLoad.</p>
            </div>
            <Link to="/projects" className="text-gridload-green font-semibold hover:underline">View all →</Link>
          </div>
          {projects === null ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-gridload-offwhite rounded-lg animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No featured projects yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={() => navigate(`/projects?open=${p.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gridload-navy text-white">
        <div className="gridload-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Get a Quote Today</h2>
          <p className="mt-3 text-white/80 max-w-xl mx-auto">
            Tell us what you're building. Our team responds within 24 hours with availability and pricing.
          </p>
          <Link
            to="/contact"
            className="mt-8 inline-flex px-8 py-3 rounded-md bg-gridload-yellow text-gridload-navy font-semibold hover:brightness-95"
          >
            Request a Quote
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
