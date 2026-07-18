// @ts-nocheck
import React, { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload, X, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

async function uploadAndSign(bucket: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage.from(bucket).createSignedUrl(path, TEN_YEARS);
  if (sErr || !data?.signedUrl) throw sErr || new Error("Failed to sign URL");
  return data.signedUrl;
}

const ProductWebsiteContentSection: React.FC<Props> = ({ formData, handleInputChange }) => {
  const { toast } = useToast();
  const imgInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);

  const images: string[] = Array.isArray(formData.images) ? formData.images : [];
  const specsObj: Record<string, string> =
    formData.specs && typeof formData.specs === "object" && !Array.isArray(formData.specs)
      ? formData.specs
      : {};
  const specEntries = Object.entries(specsObj);

  const setImages = (next: string[]) => handleInputChange("images", next);
  const setSpecs = (entries: [string, string][]) => {
    const obj: Record<string, string> = {};
    entries.forEach(([k, v]) => {
      if (k.trim()) obj[k] = v;
    });
    handleInputChange("specs", obj);
  };

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = 5 - images.length;
    if (remaining <= 0) {
      toast({ variant: "destructive", title: "Maximum 5 images" });
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setImgUploading(true);
    try {
      const urls: string[] = [];
      for (const f of toUpload) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > 5 * 1024 * 1024) {
          toast({ variant: "destructive", title: `${f.name} exceeds 5MB` });
          continue;
        }
        urls.push(await uploadAndSign("product-images", f));
      }
      setImages([...images, ...urls]);
      if (urls.length) toast({ title: `${urls.length} image(s) uploaded` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload failed", description: e.message });
    } finally {
      setImgUploading(false);
      if (imgInput.current) imgInput.current.value = "";
    }
  };

  const removeImage = (i: number) => setImages(images.filter((_, idx) => idx !== i));
  const makePrimary = (i: number) => {
    if (i === 0) return;
    const next = [...images];
    const [item] = next.splice(i, 1);
    next.unshift(item);
    setImages(next);
  };

  const handlePdf = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast({ variant: "destructive", title: "Only PDF allowed" });
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Max 15MB" });
      return;
    }
    setPdfUploading(true);
    try {
      const url = await uploadAndSign("datasheets", f);
      handleInputChange("datasheet_url", url);
      handleInputChange("datasheet_name", f.name);
      toast({ title: "Datasheet uploaded" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload failed", description: e.message });
    } finally {
      setPdfUploading(false);
      if (pdfInput.current) pdfInput.current.value = "";
    }
  };

  const addSpec = () => setSpecs([...specEntries, ["", ""]]);
  const updateSpec = (i: number, key: string, value: string) => {
    const next = [...specEntries];
    next[i] = [key, value];
    setSpecs(next);
  };
  const removeSpec = (i: number) => setSpecs(specEntries.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6 border-t pt-6">
      <div>
        <h3 className="text-base font-semibold">Website Content</h3>
        <p className="text-xs text-muted-foreground">Public-facing content shown on gridload.com</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="short_description">Short Description</Label>
        <Textarea
          id="short_description"
          rows={2}
          maxLength={300}
          placeholder="2-3 sentences shown on product cards and search results."
          value={formData.short_description || ""}
          onChange={(e) => handleInputChange("short_description", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_description">Full Description</Label>
        <Textarea
          id="full_description"
          rows={6}
          placeholder="Full product details, features, applications…"
          value={formData.full_description || ""}
          onChange={(e) => handleInputChange("full_description", e.target.value)}
        />
      </div>

      {/* Specs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Technical Specifications</Label>
          <Button type="button" size="sm" variant="outline" onClick={addSpec}>
            <Plus className="h-4 w-4 mr-1" /> Add Spec
          </Button>
        </div>
        {specEntries.length === 0 && (
          <p className="text-xs text-muted-foreground">No specs yet. Click Add Spec to start.</p>
        )}
        <div className="space-y-2">
          {specEntries.map(([k, v], i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="e.g. Power Output"
                value={k}
                onChange={(e) => updateSpec(i, e.target.value, v)}
              />
              <Input
                placeholder="e.g. 8kW"
                value={v}
                onChange={(e) => updateSpec(i, k, e.target.value)}
              />
              <Button type="button" size="icon" variant="ghost" onClick={() => removeSpec(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="space-y-2">
        <Label>Product Images (up to 5 — first is primary)</Label>
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={i} className="relative w-24 h-24 rounded border overflow-hidden bg-muted group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                  Primary
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => makePrimary(i)}
                    className="text-[10px] bg-white/90 text-black px-1.5 py-0.5 rounded"
                  >
                    Make 1st
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="text-white"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {images.length < 5 && (
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
                  Add Image
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

      {/* Datasheet */}
      <div className="space-y-2">
        <Label>Datasheet (PDF)</Label>
        {formData.datasheet_url ? (
          <div className="flex items-center gap-2 p-2 border rounded">
            <FileText className="h-4 w-4 text-primary" />
            <a
              href={formData.datasheet_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm flex-1 truncate hover:underline"
            >
              {formData.datasheet_name || "View current datasheet"}
            </a>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                handleInputChange("datasheet_url", "");
                handleInputChange("datasheet_name", "");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pdfUploading}
            onClick={() => pdfInput.current?.click()}
          >
            {pdfUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload PDF
          </Button>
        )}
        <input
          ref={pdfInput}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => handlePdf(e.target.files)}
        />
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 border rounded">
          <div>
            <Label htmlFor="is_featured" className="block">Featured on Website</Label>
            <p className="text-xs text-muted-foreground">Show on homepage</p>
          </div>
          <Switch
            id="is_featured"
            checked={!!formData.is_featured}
            onCheckedChange={(v) => handleInputChange("is_featured", v)}
          />
        </div>
        <div className="flex items-center justify-between p-3 border rounded">
          <div>
            <Label htmlFor="is_active_web" className="block">Active on Website</Label>
            <p className="text-xs text-muted-foreground">Visible in public catalog</p>
          </div>
          <Switch
            id="is_active_web"
            checked={formData.is_active !== false}
            onCheckedChange={(v) => handleInputChange("is_active", v)}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductWebsiteContentSection;
