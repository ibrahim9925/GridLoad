import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";

type WebsiteProject = {
  id: string;
  title: string;
  location: string | null;
  country: string | null;
  system_size_kwp: number | null;
  description: string | null;
  images: string[] | null;
  completion_date: string | null;
  is_featured: boolean | null;
  is_active: boolean;
};

type ProjectDraft = Partial<WebsiteProject> & { title?: string };

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

const emptyDraft: ProjectDraft = {
  title: "",
  location: "",
  country: "Palestine",
  system_size_kwp: null,
  description: "",
  images: [],
  completion_date: "",
  is_featured: false,
  is_active: true,
};

async function uploadProjectImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `projects/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage.from("product-images").createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw signError || new Error("Failed to sign image URL");
  return data.signedUrl;
}

export default function WebsiteProjects() {
  const { toast } = useToast();
  const [rows, setRows] = useState<WebsiteProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProjectDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<WebsiteProject | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const imgInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("completion_date", { ascending: false, nullsFirst: false });
    if (error) {
      toast({ variant: "destructive", title: "Load failed", description: error.message });
    } else {
      setRows((data as WebsiteProject[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const images = Array.isArray(editing?.images) ? editing.images : [];

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) {
      toast({ variant: "destructive", title: "Project title required" });
      return;
    }
    setSaving(true);
    const payload = {
      title: editing.title.trim(),
      location: editing.location?.trim() || null,
      country: editing.country?.trim() || null,
      system_size_kwp: editing.system_size_kwp == null || Number.isNaN(Number(editing.system_size_kwp))
        ? null
        : Number(editing.system_size_kwp),
      description: editing.description?.trim() || null,
      images,
      completion_date: editing.completion_date || null,
      is_featured: !!editing.is_featured,
      is_active: editing.is_active !== false,
    };
    const { id } = editing;
    const isUpdate = !!id;
    const { data, error } = isUpdate
      ? await supabase.from("projects").update(payload).eq("id", id!).select().single()
      : await supabase.from("projects").insert(payload).select().single();
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
      return;
    }
    setRows((prev) => {
      const saved = data as WebsiteProject;
      return isUpdate ? prev.map((r) => (r.id === id ? saved : r)) : [saved, ...prev];
    });
    toast({ title: isUpdate ? "Project updated" : "Project created" });
    setEditing(null);
    void load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("projects").delete().eq("id", deleting.id);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } else {
      toast({ title: "Project deleted" });
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
    }
    setDeleting(null);
  };

  const handleImageFiles = async (files: FileList | null) => {
    if (!editing || !files || files.length === 0) return;
    const remaining = 8 - images.length;
    if (remaining <= 0) {
      toast({ variant: "destructive", title: "Maximum 8 images" });
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setImgUploading(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 5 * 1024 * 1024) {
          toast({ variant: "destructive", title: `${file.name} exceeds 5MB` });
          continue;
        }
        urls.push(await uploadProjectImage(file));
      }
      setEditing({ ...editing, images: [...images, ...urls] });
      if (urls.length) toast({ title: `${urls.length} image(s) uploaded` });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upload failed";
      toast({ variant: "destructive", title: "Upload failed", description: message });
    } finally {
      setImgUploading(false);
      if (imgInput.current) imgInput.current.value = "";
    }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [r.title, r.location, r.country, r.description]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Website Projects</h1>
          <p className="text-muted-foreground">
            Publish completed installations to the public Projects gallery and homepage.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyDraft)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>All projects ({filtered.length})</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search title, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No website projects yet. Add one to show it on gridload.com/projects.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <div className="h-12 w-16 rounded bg-muted overflow-hidden shrink-0">
                          {project.images?.[0] ? (
                            <img src={project.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <span className="font-medium">{project.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {[project.location, project.country].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      {project.system_size_kwp != null ? `${project.system_size_kwp} kWp` : "—"}
                    </TableCell>
                    <TableCell>
                      {project.completion_date
                        ? new Date(project.completion_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.is_featured ? "default" : "secondary"}>
                        {project.is_featured ? "Featured" : "Gallery"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.is_active ? "default" : "secondary"}>
                        {project.is_active ? "Published" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(project)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleting(project)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit project" : "New project"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="project-title">Title *</Label>
                <Input
                  id="project-title"
                  className="text-base"
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Ramallah rooftop — 12 kWp"
                />
              </div>
              <div>
                <Label htmlFor="project-location">Location</Label>
                <Input
                  id="project-location"
                  className="text-base"
                  value={editing.location ?? ""}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  placeholder="Ramallah"
                />
              </div>
              <div>
                <Label htmlFor="project-country">Country</Label>
                <Input
                  id="project-country"
                  className="text-base"
                  value={editing.country ?? ""}
                  onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="project-size">System size (kWp)</Label>
                <Input
                  id="project-size"
                  className="text-base"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  value={editing.system_size_kwp ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      system_size_kwp: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="project-date">Completion date</Label>
                <Input
                  id="project-date"
                  className="text-base"
                  type="date"
                  value={editing.completion_date ?? ""}
                  onChange={(e) => setEditing({ ...editing, completion_date: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  rows={4}
                  className="text-base"
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="What was installed, who it serves, and the outcome."
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Photos (up to 8 — first is the cover)</Label>
                <div className="flex flex-wrap gap-3">
                  {images.map((url, i) => (
                    <div key={`${url}-${i}`} className="relative w-24 h-24 rounded border overflow-hidden bg-muted group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                          Cover
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                        {i !== 0 && (
                          <button
                            type="button"
                            className="text-[10px] bg-white/90 text-black px-1.5 py-0.5 rounded"
                            onClick={() => {
                              const next = [...images];
                              const [item] = next.splice(i, 1);
                              next.unshift(item);
                              setEditing({ ...editing, images: next });
                            }}
                          >
                            Cover
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-white"
                          aria-label="Remove image"
                          onClick={() =>
                            setEditing({ ...editing, images: images.filter((_, idx) => idx !== i) })
                          }
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {images.length < 8 && (
                    <button
                      type="button"
                      onClick={() => imgInput.current?.click()}
                      disabled={imgUploading}
                      className="w-24 h-24 rounded border-2 border-dashed flex flex-col items-center justify-center text-xs text-muted-foreground hover:bg-muted"
                    >
                      {imgUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mb-1" />
                          Add photo
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={imgInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => handleImageFiles(e.target.files)}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <Label htmlFor="project-featured" className="block">
                    Featured on homepage
                  </Label>
                  <p className="text-xs text-muted-foreground">Shows in Featured Projects</p>
                </div>
                <Switch
                  id="project-featured"
                  checked={!!editing.is_featured}
                  onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <Label htmlFor="project-active" className="block">
                    Published
                  </Label>
                  <p className="text-xs text-muted-foreground">Visible on the public site</p>
                </div>
                <Switch
                  id="project-active"
                  checked={editing.is_active !== false}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" className="w-full sm:w-auto" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{deleting?.title}</strong> from the public gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
