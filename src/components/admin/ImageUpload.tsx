// @ts-nocheck

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploadProps {
  label: string;
  value: string | null;  // Currently set image URL, if any
  onChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  disabled,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value ?? null);

  // Handle file selection & upload
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Max size is 5MB.");
      return;
    }

    setUploading(true);
    try {
      // Generate a unique file path in the bucket
      const filePath = `cms/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("site-images")
        .upload(filePath, file, { upsert: true });
      if (uploadError) {
        setError(uploadError.message || "Upload failed.");
        setUploading(false);
        return;
      }
      const { data } = supabase.storage.from("site-images").getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      if (publicUrl) {
        setPreview(publicUrl);
        onChange(publicUrl);
      }
    } catch (err: any) {
      setError((err?.message as string) || "Unexpected error");
    } finally {
      setUploading(false);
    }
  };

  // Allow removing the image (reset to null)
  const removeImage = () => {
    setPreview(null);
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={className}>
      <div className="mb-1 text-sm font-medium">{label}</div>
      <div className="flex items-center gap-3">
        {preview ? (
          <div className="flex flex-col gap-2">
            <img
              src={preview}
              alt="Preview"
              className="h-24 w-24 object-cover rounded border"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={removeImage}
              disabled={disabled}
              className="text-red-600 hover:text-red-800"
              type="button"
            >
              <X className="h-4 w-4" /> Remove
            </Button>
          </div>
        ) : (
          <label
            className="flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-muted transition"
          >
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-xs text-blue-600">Click to upload</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
              disabled={uploading || disabled}
            />
          </label>
        )}
      </div>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
};
