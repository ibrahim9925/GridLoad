import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SiteLayout from "@/components/site/SiteLayout";
import ProjectCard from "@/components/site/ProjectCard";
import { PublicProject } from "@/lib/publicTypes";
import { X, MapPin, Zap, Calendar } from "lucide-react";

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<PublicProject[] | null>(null);
  const [country, setCountry] = useState("all");
  const [active, setActive] = useState<PublicProject | null>(null);

  useEffect(() => {
    document.title = "Projects — GridLoad Energy";
    supabase
      .from("projects")
      .select("*")
      .eq("is_active", true)
      .order("completion_date", { ascending: false, nullsFirst: false })
      .then(({ data }) => setProjects((data ?? []) as PublicProject[]));
  }, []);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || !projects) return;
    const match = projects.find((p) => p.id === openId);
    if (match) setActive(match);
  }, [projects, searchParams]);

  const closeModal = () => {
    setActive(null);
    if (searchParams.has("open")) {
      const next = new URLSearchParams(searchParams);
      next.delete("open");
      setSearchParams(next, { replace: true });
    }
  };

  const countries = useMemo(() => {
    if (!projects) return [];
    return Array.from(new Set(projects.map((p) => p.country).filter(Boolean))) as string[];
  }, [projects]);

  const filtered = useMemo(() => {
    if (!projects) return [];
    return country === "all" ? projects : projects.filter((p) => p.country === country);
  }, [projects, country]);

  return (
    <SiteLayout>
      <div className="bg-gridload-navy text-white py-12">
        <div className="gridload-container">
          <h1 className="text-3xl md:text-5xl font-bold">Projects</h1>
          <p className="mt-2 text-white/80">A selection of completed installations.</p>
        </div>
      </div>

      <div className="gridload-container py-8">
        {countries.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setCountry("all")}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                country === "all"
                  ? "bg-gridload-green text-white border-gridload-green"
                  : "border-gridload-lightgray text-gridload-navy"
              }`}
            >
              All
            </button>
            {countries.map((c) => (
              <button
                key={c}
                onClick={() => setCountry(c)}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  country === c
                    ? "bg-gridload-green text-white border-gridload-green"
                    : "border-gridload-lightgray text-gridload-navy"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {projects === null ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-gridload-offwhite rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-20 text-muted-foreground">
            No projects yet. Published installations will appear here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} onClick={() => setActive(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {active.images?.[0] && (
                <img src={active.images[0]} alt={active.title} className="w-full h-72 object-cover rounded-t-lg" />
              )}
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-3 right-3 p-2 rounded-full bg-white text-gridload-navy"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gridload-navy">{active.title}</h2>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {active.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {active.location}
                    {active.country && `, ${active.country}`}
                  </span>
                )}
                {active.system_size_kwp != null && (
                  <span className="inline-flex items-center gap-1 text-gridload-green font-medium">
                    <Zap className="h-4 w-4" /> {active.system_size_kwp} kWp
                  </span>
                )}
                {active.completion_date && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> {new Date(active.completion_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              {active.description && (
                <p className="mt-4 text-gridload-navy/85 whitespace-pre-line">{active.description}</p>
              )}
              {active.images && active.images.length > 1 && (
                <div className="mt-6 grid grid-cols-2 gap-2">
                  {active.images.slice(1).map((img, i) => (
                    <img key={i} src={img} alt="" className="w-full h-40 object-cover rounded-md" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}
