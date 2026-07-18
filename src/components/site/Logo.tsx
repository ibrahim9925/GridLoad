interface LogoProps {
  variant?: "navy" | "white";
  className?: string;
  /** Tailwind height class, e.g. h-8, h-10 */
  heightClass?: string;
}

/** Inline SVG — no white frame, crisp at any size */
export default function Logo({
  variant = "navy",
  className = "",
  heightClass = "h-8",
}: LogoProps) {
  const textColor = variant === "white" ? "#FFFFFF" : "#1B2A3B";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 168 32"
      fill="none"
      role="img"
      aria-label="GridLoad"
      className={`${heightClass} w-auto shrink-0 ${className}`}
    >
      <text
        x="0"
        y="24"
        fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial Black, sans-serif"
        fontSize="22"
        fontWeight="800"
        letterSpacing="-0.02em"
        fill={textColor}
      >
        Grid
      </text>
      {/* Lightning bolt (L) — two-tone yellow */}
      <path d="M62 2 L72 14 L66 14 L70 30 L54 14 L60 14 Z" fill="#F5C518" />
      <path d="M62 2 L72 14 L66 14 L62 14 Z" fill="#E5A800" />
      <text
        x="76"
        y="24"
        fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial Black, sans-serif"
        fontSize="22"
        fontWeight="800"
        letterSpacing="-0.02em"
        fill={textColor}
      >
        oad
      </text>
    </svg>
  );
}
