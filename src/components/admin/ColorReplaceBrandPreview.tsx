// @ts-nocheck

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Palette, Paintbrush } from "lucide-react";

// Utilities: get dominant colors from image data using median cut (simple implementation)
function getDominantColors(img: HTMLImageElement, numColors: number): Promise<string[]> {
  return new Promise((resolve) => {
    // Downsample image for quick color clustering
    const canvas = document.createElement("canvas");
    const maxDim = 100;
    let w = img.naturalWidth, h = img.naturalHeight;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // Gather all pixels
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b, a] = [d[i], d[i+1], d[i+2], d[i+3]];
      if (a > 128) pixels.push([r, g, b]);
    }

    // K-means for simplicity
    function randomColor() {
      const idx = Math.floor(Math.random() * pixels.length);
      return pixels[idx];
    }
    let centers = Array(numColors).fill(0).map(randomColor);
    let clusters: number[] = [];
    for (let iter = 0; iter < 7; iter++) {
      clusters = pixels.map(px =>
        centers
          .map((c, i) => [i, Math.hypot(c[0] - px[0], c[1] - px[1], c[2] - px[2])])
          .reduce((a, b) => (a[1] < b[1] ? a : b))[0]
      );
      // Recompute centers
      centers = centers.map((_, c) => {
        const members = pixels.filter((_, i) => clusters[i] === c);
        if (!members.length) return centers[c];
        return [
          Math.round(members.reduce((s, p) => s + p[0], 0) / members.length),
          Math.round(members.reduce((s, p) => s + p[1], 0) / members.length),
          Math.round(members.reduce((s, p) => s + p[2], 0) / members.length),
        ] as [number, number, number];
      });
    }
    // Convert clusters centers to hex
    const hex = (c: number) => c.toString(16).padStart(2, "0");
    resolve(centers.map(([r, g, b]) => `#${hex(r)}${hex(g)}${hex(b)}`));
  });
}

// Actually map template image pixels to brand palette
function recolorImage(
  img: HTMLImageElement,
  detectedColors: string[],
  mapping: string[]
): string {
  const canvas = document.createElement("canvas");
  let w = img.naturalWidth, h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Find closest palette color for each pixel and remap
  const hexToRgb = (hex: string) => {
    const n = hex.startsWith("#") ? hex.slice(1) : hex;
    return [
      parseInt(n.slice(0, 2), 16),
      parseInt(n.slice(2, 4), 16),
      parseInt(n.slice(4, 6), 16),
    ];
  };
  const templateRGB = detectedColors.map(hexToRgb);
  const targetRGB = mapping.map(hexToRgb);

  // Replace each pixel
  for (let i = 0; i < d.length; i += 4) {
    const px = [d[i], d[i+1], d[i+2]];
    // Which template color is closest?
    let minDist = Infinity, closestIdx = 0;
    for (let j = 0; j < templateRGB.length; j++) {
      const dist = Math.hypot(
        px[0] - templateRGB[j][0],
        px[1] - templateRGB[j][1],
        px[2] - templateRGB[j][2]
      );
      if (dist < minDist) {
        minDist = dist;
        closestIdx = j;
      }
    }
    // Only recolor if quite close!
    if (minDist < 74) { // Tunable threshold
      const rep = targetRGB[closestIdx];
      d[i] = rep[0]; d[i+1] = rep[1]; d[i+2] = rep[2];
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

export interface ColorReplaceBrandPreviewProps {
  templateImage: string | null;
  brandColors: string[];
}

export const ColorReplaceBrandPreview: React.FC<ColorReplaceBrandPreviewProps> = ({
  templateImage,
  brandColors,
}) => {
  const [detectedColors, setDetectedColors] = useState<string[] | null>(null);
  const [mapping, setMapping] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Step 1: Extract dominant colors from template
  useEffect(() => {
    setDetectedColors(null);
    setPreviewUrl(null);
    if (!templateImage) return;
    setLoading(true);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = templateImage;
    img.onload = () => {
      getDominantColors(img, 3).then((palette) => {
        setDetectedColors(palette);
        // Default mapping: map 1-to-1 or fallback
        setMapping(palette.map((_, i) => brandColors[i % brandColors.length]));
        setLoading(false);
      });
      imgRef.current = img;
    };
  }, [templateImage, brandColors]);

  // Step 2: When mappings change, create recolored preview
  useEffect(() => {
    if (!detectedColors || !imgRef.current) return;
    setLoading(true);
    setTimeout(() => {
      const newPreviewUrl = recolorImage(imgRef.current!, detectedColors, mapping);
      setPreviewUrl(newPreviewUrl);
      setLoading(false);
    }, 60); // allow React to show loader
  }, [detectedColors, mapping]);

  if (!templateImage) {
    return null;
  }
  if (loading) {
    return <div className="flex items-center gap-2 mt-6 text-muted-foreground text-sm"><Paintbrush className="animate-spin h-5 w-5" />Analyzing and recoloring…</div>;
  }
  if (!detectedColors) {
    return null;
  }

  return (
    <div className="w-full my-6 border rounded-2xl bg-gray-50 shadow p-6">
      <div className="font-semibold text-base flex items-center mb-4"><Palette className="text-yellow-600 mr-2" />Advanced Brand Color Remapping</div>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Controls */}
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Template colors detected:</span>
            <div className="flex gap-2 mt-1">
              {detectedColors.map((c, i) => (
                <div key={c}
                  style={{ background: c, width: 28, height: 28, borderRadius: 8, border: "2px solid #999" }}
                  title={c}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">Map to your brand colors:</span>
          </div>
          <div>
            {detectedColors.map((src, i) => (
              <div className="flex items-center gap-2 mb-2" key={i}>
                <div style={{ background: src, width: 22, height: 22, borderRadius: 5, border: "1px solid #aaa" }} />
                <span className="text-muted-foreground text-xs">→</span>
                <select
                  value={mapping[i]}
                  onChange={e => {
                    const next = [...mapping];
                    next[i] = e.target.value;
                    setMapping(next);
                  }}
                  className="border rounded px-1 py-0.5 bg-white text-xs"
                >
                  {brandColors.map(c =>
                    <option value={c} key={c}>{c}</option>
                  )}
                </select>
                <div style={{ background: mapping[i], width: 22, height: 22, borderRadius: 5, border: "1px solid #aaa" }} />
              </div>
            ))}
          </div>
        </div>
        {/* Preview */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-full flex justify-center">
            {previewUrl ?
              <img src={previewUrl} alt="Recolored preview" className="rounded-xl border max-w-xs" style={{ background: "#eee", maxHeight: 320 }} />
              : <span className="text-sm text-muted-foreground">Generating…</span>
            }
          </div>
          <div className="text-xs text-muted-foreground">This is a true recoloring—try mapping template colors to business brand palette!</div>
        </div>
      </div>
    </div>
  );
};
