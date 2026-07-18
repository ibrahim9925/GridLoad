// @ts-nocheck
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReceiptUploadProps {
  receiptFile: File | null;
  setReceiptFile: (file: File | null) => void;
  isUploading: boolean;
  receiptUrl?: string | null;
  setReceiptUrl?: (url: string | null) => void;
}

const ReceiptUpload = ({
  receiptFile,
  setReceiptFile,
  isUploading,
  receiptUrl,
  setReceiptUrl,
}: ReceiptUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Maximum file size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select a file smaller than 5MB.",
      });
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image (JPEG, PNG, GIF) or PDF file.",
      });
      return;
    }

    setReceiptFile(file);

    // Upload immediately to Supabase Storage
    if (setReceiptUrl) {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
      const { error } = await supabase.storage.from("crm-receipts").upload(fileName, file, { upsert: true });
      if (error) {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: error.message || "Could not upload the file.",
        });
        setUploading(false);
        return;
      }
      // Private bucket — generate a signed URL valid for 7 days
      const { data: signed } = await supabase.storage
        .from("crm-receipts")
        .createSignedUrl(fileName, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) {
        setReceiptUrl(signed.signedUrl);
        toast({
          title: "Receipt uploaded",
          description: "File has been uploaded securely.",
        });
      }
      setUploading(false);

    }
  };

  const removeFile = () => {
    setReceiptFile(null);
    if (setReceiptUrl) setReceiptUrl(null);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="receipt-upload">Receipt</Label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {receiptFile || receiptUrl ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {receiptFile ? (
                fileIconForType(receiptFile.type)
              ) : receiptUrl ? (
                fileIconForType(receiptUrl.endsWith(".pdf") ? "application/pdf" : "image/*")
              ) : null}
              <span className="text-sm text-gray-700">
                {receiptFile?.name ?? "Uploaded"}
              </span>
              {(receiptFile && <span className="text-xs text-gray-500">({(receiptFile.size / 1024 / 1024).toFixed(2)} MB)</span>)}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-red-600 hover:text-red-800"
              disabled={isUploading || uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div className="mt-2">
              <label htmlFor="receipt-upload-input" className="cursor-pointer">
                <span className="text-sm text-blue-600 hover:text-blue-800">
                  Click to upload receipt
                </span>
                <input
                  id="receipt-upload-input"
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  disabled={isUploading || uploading}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, GIF or PDF up to 5MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Utility function to show icon for file type
function fileIconForType(mime: string) {
  if (mime.startsWith("image/")) return <FileImage className="h-4 w-4 text-green-600" />;
  // If PDF, fallback to the Upload icon since FilePdf doesn't exist
  if (mime === "application/pdf") return <Upload className="h-4 w-4 text-red-600" />;
  return <Upload className="h-4 w-4 text-gray-400" />;
}

export default ReceiptUpload;
