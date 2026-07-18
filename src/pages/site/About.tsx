import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import { PublicAboutSection } from "@/lib/publicTypes";

export default function About() {
  const [sections, setSections] = useState<PublicAboutSection[] | null>(null);

  useEffect(() => {
    document.title = "About — GridLoad Energy";
    supabase
      .from("about_sections")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => setSections((data ?? []) as any));
  }, []);

  const hero = sections?.find((s) => s.section_key === "hero");
  const certs = sections?.find((s) => s.section_key === "certifications");
  const blocks = sections?.filter((s) => !["hero", "certifications"].includes(s.section_key)) ?? [];

  return (
    <SiteLayout>
      {/* Hero */}
      <div className="bg-gridload-navy text-white py-16">
        <div className="gridload-container">
          <h1 className="text-3xl md:text-5xl font-bold">{hero?.title ?? "About GridLoad"}</h1>
          {hero?.body && <p className="mt-4 text-white/85 max-w-2xl text-lg whitespace-pre-line">{hero.body}</p>}
        </div>
      </div>

      <div className="gridload-container py-12">
        {sections === null ? (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-gridload-offwhite rounded-lg animate-pulse" />
            ))}
          </div>
        ) : blocks.length === 0 && !certs ? (
          <p className="text-center text-muted-foreground py-20">
            About content has not been published yet.
          </p>
        ) : (
          <div className="space-y-16">
            {blocks.map((s, i) => (
              <section
                key={s.id}
                className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${
                  i % 2 ? "md:[&>:first-child]:order-2" : ""
                }`}
              >
                {s.image_url ? (
                  <img src={s.image_url} alt={s.title ?? ""} className="w-full rounded-lg object-cover aspect-[4/3]" />
                ) : (
                  <div className="bg-gridload-offwhite rounded-lg aspect-[4/3]" />
                )}
                <div>
                  {s.title && <h2 className="text-2xl md:text-3xl font-bold text-gridload-navy">{s.title}</h2>}
                  {s.body && <p className="mt-3 text-gridload-navy/80 whitespace-pre-line">{s.body}</p>}
                </div>
              </section>
            ))}

            {certs && (
              <section className="bg-gridload-offwhite rounded-lg p-8 text-center">
                {certs.title && <h2 className="text-2xl font-bold text-gridload-navy">{certs.title}</h2>}
                {certs.body && (
                  <p className="mt-3 text-gridload-navy/80 max-w-2xl mx-auto whitespace-pre-line">{certs.body}</p>
                )}
                {certs.image_url && (
                  <img src={certs.image_url} alt="Certifications" className="mt-6 max-h-32 mx-auto object-contain" />
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
