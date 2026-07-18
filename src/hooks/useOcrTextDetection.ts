// @ts-nocheck

import { useEffect, useState } from "react";
import Tesseract from "tesseract.js";

export type OcrBox = {
  text: string,
  bbox: [number, number, number, number], // [x0, y0, x1, y1]
};

export function useOcrTextDetection(imgSrc: string | null) {
  const [ocrBoxes, setOcrBoxes] = useState<OcrBox[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imgSrc) {
      setOcrBoxes([]);
      return;
    }
    setError(null);
    setLoading(true);

    const runOcr = async () => {
      try {
        const res = await Tesseract.recognize(imgSrc, "eng", {
          logger: (log) => { /* console.log(log); */ }
        });
        const words = res.data.words ?? [];
        setOcrBoxes(
          words
            .filter(w => w.text.trim())
            .map(w => ({
              text: w.text,
              bbox: [w.bbox.x0, w.bbox.y0, w.bbox.x1, w.bbox.y1] as [number, number, number, number],
            }))
        );
      } catch (e: any) {
        setError(e.message || "Failed to detect text.");
      }
      setLoading(false);
    };

    runOcr();
  }, [imgSrc]);

  return { ocrBoxes, loading, error };
}
