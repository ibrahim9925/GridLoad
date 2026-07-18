// @ts-nocheck

import React, { useRef, useState } from "react";

interface BrandAdaptPreviewProps {
  templateImage: string | null;
  brandLogo: string; // URL for demo, could be uploaded
  brandColors: string[];
}

export const BrandAdaptPreview: React.FC<BrandAdaptPreviewProps> = ({
  templateImage,
  brandLogo,
  brandColors
}) => {
  // Allow interactive logo drag/move for preview
  const [logoPos, setLogoPos] = useState({ x: 35, y: 35 });
  const imgContainerRef = useRef<HTMLDivElement>(null);

  if (!templateImage) {
    return <div className="text-gray-500 text-sm">Upload a template to see the preview here.</div>;
  }

  // Brand color overlays on corners for demonstration
  // Advanced: In future, offer color-replacement and text overlays
  return (
    <div className="relative w-72 h-72 border rounded-lg shadow overflow-hidden" ref={imgContainerRef}>
      <img
        src={templateImage}
        alt="With Branding"
        className="w-full h-full object-contain"
        style={{ filter: "brightness(0.96)" }}
      />
      {/* Brand color overlays in the corners */}
      {brandColors.map((color, idx) => (
        <div
          key={color}
          style={{
            position: "absolute",
            width: 36,
            height: 36,
            background: color,
            opacity: 0.85,
            borderRadius: 8,
            [idx % 2 === 0 ? "top" : "bottom"]: 8,
            [idx < 2 ? "left" : "right"]: 8,
            zIndex: 10,
            border: "2px solid white",
          }}
        />
      ))}
      {/* Logo with draggable position */}
      <img
        src={brandLogo}
        alt="Logo overlay"
        className="absolute cursor-move"
        draggable
        style={{
          left: logoPos.x,
          top: logoPos.y,
          width: 48,
          height: 48,
          zIndex: 20,
          background: "white",
          borderRadius: 16,
          border: "2px solid #FFC107"
        }}
        onDragStart={e => {
          // Workaround: since HTML drag/drop is awkward, intercept coordinates.
          const startX = e.clientX, startY = e.clientY;
          const onDrag = (ev: DragEvent) => {
            if (!imgContainerRef.current || !ev.clientX || !ev.clientY) return;
            const rect = imgContainerRef.current.getBoundingClientRect();
            setLogoPos({
              x: Math.min(rect.width - 48, Math.max(0, logoPos.x + ev.clientX - startX)),
              y: Math.min(rect.height - 48, Math.max(0, logoPos.y + ev.clientY - startY)),
            });
            document.removeEventListener("dragover", onDrag);
          };
          document.addEventListener("dragover", onDrag);
        }}
      />
    </div>
  );
};
