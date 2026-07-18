// @ts-nocheck

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Palette, Upload } from "lucide-react";

interface BrandCanvasPreviewProps {
  templateImage: string | null;
  brandLogo: string;
  brandColors: string[];
}

export const BrandCanvasPreview: React.FC<BrandCanvasPreviewProps> = ({
  templateImage,
  brandLogo,
  brandColors,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement>(null);
  const [overlayColor, setOverlayColor] = useState<string>(brandColors[0]);
  const [logoPos, setLogoPos] = useState({ x: 35, y: 35 });
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Draws the template image, color overlay, and logo onto the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load the main image
    const img = new window.Image();
    img.src = templateImage;
    img.onload = () => {
      // Resize canvas to image dimensions, capped at 400x400
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      const maxDim = 400;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Draw semitransparent color overlay
      if (overlayColor) {
        ctx.fillStyle = overlayColor + "CC"; // ~80% opacity
        ctx.fillRect(0, 0, width, 48); // Top banner
      }

      // Draw brand logo (if loaded)
      const logoImg = logoImgRef.current;
      if (logoImg) {
        const logoW = 48, logoH = 48;
        ctx.save();
        ctx.beginPath();
        ctx.arc(
          logoPos.x + logoW / 2,
          logoPos.y + logoH / 2,
          logoW / 2,
          0,
          2 * Math.PI,
        );
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImg, logoPos.x, logoPos.y, logoW, logoH);
        ctx.restore();
        // Add yellow border
        ctx.strokeStyle = "#FFC107";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          logoPos.x + logoW / 2,
          logoPos.y + logoH / 2,
          logoW / 2,
          0, 2 * Math.PI,
        );
        ctx.stroke();
      }
    };
    // eslint-disable-next-line
  }, [templateImage, logoPos, overlayColor]);

  // Handle drag/move of logo
  const handleCanvasMouseDown = (
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
  ) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Check if click is within logo
    if (
      mouseX > logoPos.x &&
      mouseX < logoPos.x + 48 &&
      mouseY > logoPos.y &&
      mouseY < logoPos.y + 48
    ) {
      setDragOffset({ x: mouseX - logoPos.x, y: mouseY - logoPos.y });
      setDragging(true);
    }
  };
  const handleCanvasMouseMove = (
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
  ) => {
    if (dragging && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      // Constrain to canvas edges
      const x = Math.max(0, Math.min(mouseX - dragOffset.x, canvasRef.current.width - 48));
      const y = Math.max(0, Math.min(mouseY - dragOffset.y, canvasRef.current.height - 48));
      setLogoPos({ x, y });
    }
  };
  const handleCanvasMouseUp = () => setDragging(false);

  // Load logo image src
  useEffect(() => {
    if (logoImgRef.current) logoImgRef.current.src = brandLogo;
  }, [brandLogo]);

  if (!templateImage) {
    return <div className="text-gray-500 text-sm">Upload a template to see the preview here.</div>;
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Canvas for actual rendering */}
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: 12,
          border: "1px solid #ddd",
          boxShadow: "0 2px 10px 0 #0001",
          background: "#fff",
          cursor: dragging ? "grabbing" : "default",
          transition: "box-shadow 0.2s"
        }}
        width={320}
        height={320}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        className="mb-2 animate-fade-in"
      />
      {/* Hidden image for logo drawing */}
      <img ref={logoImgRef} src={brandLogo} alt="" style={{ display: "none" }} />
      {/* Brand color overlay controls */}
      <div className="flex items-center gap-2 mt-2">
        <Palette className="h-5 w-5 text-yellow-600" />
        {brandColors.map((color) => (
          <button
            key={color}
            title="Change overlay color"
            style={{
              background: color,
              width: 28,
              height: 28,
              borderRadius: 8,
              border: overlayColor === color ? "2px solid #222" : "2px solid #ddd",
              transition: "border 0.14s"
            }}
            className="hover-scale"
            onClick={() => setOverlayColor(color)}
            aria-label={`Overlay ${color}`}
            type="button"
          />
        ))}
      </div>
      <div className="text-xs text-muted-foreground mt-1">Try different overlay colors. Drag logo on canvas.</div>
    </div>
  );
};
