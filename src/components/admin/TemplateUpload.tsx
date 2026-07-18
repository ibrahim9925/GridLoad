// @ts-nocheck

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface TemplateUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export const TemplateUpload: React.FC<TemplateUploadProps> = ({
  value,
  onChange
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed as templates.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-3 items-center">
      {value ? (
        <img
          src={value}
          alt="Template Preview"
          className="rounded-lg border w-72 h-72 object-contain shadow"
        />
      ) : (
        <div className="text-sm text-gray-500 mb-2">
          No template uploaded. Upload a PNG/JPG post design.
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" /> {value ? "Change Template" : "Upload Template"}
      </Button>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          type="button"
          className="text-red-600 mt-1"
        >
          Remove Template
        </Button>
      )}
    </div>
  );
};
