// @ts-nocheck
// Runtime loader for Amiri Arabic font (TTF) → embeds into jsPDF.
// Cached in module scope + sessionStorage so the network fetch happens once.

const FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf";
const FONT_NAME = "Amiri";
const STORAGE_KEY = "gridload_amiri_b64_v1";

let cachedB64: string | null = null;
let loadingPromise: Promise<string> | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[]
    );
  }
  return btoa(binary);
};

const loadFontBase64 = async (): Promise<string> => {
  if (cachedB64) return cachedB64;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && stored.length > 1000) {
      cachedB64 = stored;
      return stored;
    }
  } catch {}

  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    const b64 = arrayBufferToBase64(buf);
    cachedB64 = b64;
    try { sessionStorage.setItem(STORAGE_KEY, b64); } catch {}
    return b64;
  })();
  return loadingPromise;
};

/**
 * Ensure the Amiri Arabic font is registered on the given jsPDF doc.
 * Safe to call multiple times. Returns the registered font family name.
 */
export const ensureArabicFont = async (doc: any): Promise<string> => {
  try {
    const list = doc.getFontList?.() || {};
    if (list[FONT_NAME]) return FONT_NAME;
    const b64 = await loadFontBase64();
    const fileName = "Amiri-Regular.ttf";
    doc.addFileToVFS(fileName, b64);
    doc.addFont(fileName, FONT_NAME, "normal");
    doc.addFont(fileName, FONT_NAME, "bold");
    return FONT_NAME;
  } catch (err) {
    // Font failed to load — caller will fall back to helvetica.
    // Surface to console for debugging.
    console.warn("[arabicFont] failed to load Amiri:", err);
    return "helvetica";
  }
};

/** Convenience: write an Arabic string with proper RTL on a jsPDF doc. */
export const drawArabic = (
  doc: any,
  text: string,
  x: number,
  y: number,
  opts: { align?: "left" | "center" | "right"; fontSize?: number; bold?: boolean } = {}
) => {
  const prevFont = doc.getFont();
  const prevSize = doc.getFontSize();
  try {
    doc.setFont(FONT_NAME, opts.bold ? "bold" : "normal");
    if (opts.fontSize) doc.setFontSize(opts.fontSize);
    doc.text(text, x, y, { align: opts.align || "right", isInputRtl: true } as any);
  } catch {
    // Fallback if font isn't loaded
    doc.text(text, x, y, { align: opts.align || "right" });
  } finally {
    doc.setFont(prevFont.fontName, prevFont.fontStyle);
    doc.setFontSize(prevSize);
  }
};

export const ARABIC_FONT_NAME = FONT_NAME;
