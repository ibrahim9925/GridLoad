// @ts-nocheck
import React, { useRef, useEffect, useState } from "react";
import { useOcrTextDetection, OcrBox } from "@/hooks/useOcrTextDetection";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export interface SmartBrandTemplatePreviewProps {
  templateImage: string | null;
}

export const SmartBrandTemplatePreview: React.FC<SmartBrandTemplatePreviewProps> = ({
  templateImage,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });
  const { ocrBoxes, loading, error } = useOcrTextDetection(templateImage);
  const [boxTexts, setBoxTexts] = useState<string[]>([]);

  // On OCR, initialize text state
  useEffect(() => {
    setBoxTexts(ocrBoxes.map(b => b.text));
  }, [ocrBoxes.length]);

  // Get actual displayed image dims
  useEffect(() => {
    if (imgRef.current) {
      setImgDims({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight
      });
    }
  }, [templateImage]);

  if (!templateImage) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 my-4 text-muted-foreground text-sm">
        <span className="animate-spin inline-block w-5 h-5 rounded-full border-2 border-yellow-400 border-r-transparent" />Detecting text...
      </div>
    );
  }

  if (error) return <div className="text-red-500">{error}</div>;
  if (!ocrBoxes.length) {
    return (
      <div className="my-4 text-xs text-muted-foreground">
        No text detected in this image. Upload a template with distinct, horizontal text.
      </div>
    );
  }

  // Style helpers for image/overlays
  const overlayStyle = (b: OcrBox) => {
    // scale according to actual preview display size (max 380px width)
    const displayW = 380, scale = imgDims.width ? displayW / imgDims.width : 1;
    const [x0, y0, x1, y1] = b.bbox.map(v => v * scale);
    return {
      left: x0,
      top: y0,
      width: x1 - x0,
      height: y1 - y0,
    };
  };

  return (
    <div className="relative flex flex-col items-center w-full max-w-2xl mx-auto my-6">
      <div className="font-semibold text-base mb-4">🧠 Smart Template Text Detection</div>
      <div className="relative" style={{ width: 380, height: (imgDims.height ? imgDims.height / imgDims.width * 380 : 300) }}>
        <img
          ref={imgRef}
          src={templateImage}
          alt="Template"
          className="rounded-xl border bg-white"
          style={{ width: 380, height: "auto", maxHeight: 380, objectFit: "contain" }}
          onLoad={e => {
            const t = e.currentTarget;
            setImgDims({ width: t.naturalWidth, height: t.naturalHeight });
          }}
        />
        {/* Overlay text regions */}
        {ocrBoxes.map((b, i) => {
          const style = overlayStyle(b);
          return (
            <div
              key={i}
              className="absolute z-10 border-2 border-yellow-300 bg-yellow-200/70 rounded flex items-center px-1 text-sm"
              style={{
                ...style,
                pointerEvents: "auto",
              }}
            >
              <Input
                value={boxTexts[i] || ""}
                className="bg-transparent w-full px-1 text-black font-semibold !text-xs"
                style={{ minWidth: 20, maxWidth: 120, border: 0, outline: 0, boxShadow: "none" }}
                onChange={e => {
                  const next = [...boxTexts];
                  next[i] = e.target.value;
                  setBoxTexts(next);
                }}
                onBlur={() => toast({ title: "Success", description: "Text updated!" })}
              />
            </div>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Recognized text regions are highlighted. Edit directly in the yellow boxes.<br />
        (Next step: render final composited output based on your edits.)
      </div>
    </div>
  );
};
