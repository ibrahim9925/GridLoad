// @ts-nocheck

import { useState } from "react";

export type ImageFormat = "square" | "instagram" | "facebook" | "twitter" | "custom";
type FormatData = {
  width: number;
  height: number;
  label: string;
};
export const FORMATS: Record<ImageFormat, FormatData> = {
  square:   { width: 1024, height: 1024, label: "Square (1:1, 1024x1024)" },
  instagram:{ width: 1080, height: 1080, label: "Instagram (1:1, 1080x1080)" },
  facebook: { width: 1200, height: 628,  label: "Facebook (1.91:1, 1200x628)" },
  twitter:  { width: 1500, height: 500,  label: "Twitter (3:1, 1500x500)" },
  custom:   { width: 1024, height: 1024, label: "Custom" },
};
export type AiImageOptions = {
  prompt: string;
  style?: "vivid" | "natural";
  width?: number;
  height?: number;
  format?: ImageFormat;
};

const EDGE_FUNC_URL =
  "https://npryfxvfbacxetocnihq.functions.supabase.co/generate-marketing-image";

export function useAiImageGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const generateImage = async (options: AiImageOptions) => {
    setLoading(true);
    setError(null);
    setImage(null);

    try {
      const response = await fetch(EDGE_FUNC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: options.prompt,
          size:
            options.width && options.height
              ? `${options.width}x${options.height}`
              : "1024x1024",
          style: options.style || "vivid",
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to generate image.");
      }
      if (data.image) {
        setImage(data.image);
        setCount((c) => c + 1);
      } else {
        throw new Error("No image returned");
      }
    } catch (err: any) {
      setError(err.message || "Error generating image");
    }
    setLoading(false);
  };

  return { image, loading, error, generateImage, setImage, count };
}
