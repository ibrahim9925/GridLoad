import { PublicProject } from "@/lib/publicTypes";
import { MapPin, Zap } from "lucide-react";

export default function ProjectCard({
  project,
  onClick,
}: {
  project: PublicProject;
  onClick?: () => void;
}) {
  const cover = project.images?.[0];
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white border border-gridload-lightgray rounded-lg overflow-hidden hover:shadow-lg hover:border-gridload-green transition-all flex flex-col w-full"
    >
      <div className="aspect-[16/10] bg-gridload-offwhite overflow-hidden">
        {cover ? (
          <img src={cover} alt={project.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gridload-navy/30 text-sm">
            No image
          </div>
        )}
      </div>
      <div className="p-4 flex-1">
        <h3 className="font-semibold text-gridload-navy line-clamp-2">{project.title}</h3>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {project.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {project.location}
              {project.country && `, ${project.country}`}
            </span>
          )}
          {project.system_size_kwp != null && (
            <span className="inline-flex items-center gap-1 text-gridload-green font-medium">
              <Zap className="h-3.5 w-3.5" /> {project.system_size_kwp} kWp
            </span>
          )}
        </div>
        {project.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        )}
      </div>
    </button>
  );
}
