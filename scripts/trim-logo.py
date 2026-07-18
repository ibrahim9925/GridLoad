#!/usr/bin/env python3
"""Trim white frame from logo PNG and make background transparent."""
from PIL import Image

SRC = "public/gridload-logo-source.png"
OUT = "public/gridload-logo.png"

# Keep original as source if not already saved
import shutil
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = root / "public" / "gridload-logo.png"
source = root / "public" / "gridload-logo-source.png"
if not source.exists() and src.exists():
    shutil.copy(src, source)

img_path = source if source.exists() else src
img = Image.open(img_path).convert("RGBA")
pixels = img.load()
w, h = img.size

# White/near-white -> transparent
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if r > 240 and g > 240 and b > 240:
            pixels[x, y] = (r, g, b, 0)

# Tight crop to non-transparent pixels
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

# Scale up slightly for crisp display (2x if small)
if max(img.size) < 400:
    img = img.resize((img.width * 2, img.height * 2), Image.Resampling.LANCZOS)

out = root / OUT
img.save(out, "PNG", optimize=True)
print(f"Saved {out} size={img.size}")
