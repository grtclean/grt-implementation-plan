/**
 * BrandLogo — Official GRT (GerryTech) brand logo component
 *
 * Hierarchy:
 *   1. Local file: /grt-logo.png (CEO can drop the official logo here)
 *   2. Fallback: Professional SVG typographic "GRT" mark in Fluent blue
 *
 * Props:
 *   - size: "sm" | "md" | "lg" | "xl" — preset sizes
 *   - className: additional CSS classes
 *   - showText: show "GRT" wordmark beside the logo (default: false)
 *   - variant: "full" (icon + wordmark) | "icon" (icon only) | "wordmark" (text only)
 *   - theme: "light" | "dark" — controls color scheme for the SVG fallback
 */
import { useState } from "react";

const FLUENT_BLUE = "#0078d4";
const FLUENT_DARK_BLUE = "#004578";

const SIZES = {
  sm: { height: 24, fontSize: 14, iconSize: 24 },
  md: { height: 32, fontSize: 18, iconSize: 32 },
  lg: { height: 40, fontSize: 22, iconSize: 40 },
  xl: { height: 56, fontSize: 32, iconSize: 56 },
} as const;

type LogoSize = keyof typeof SIZES;
type LogoVariant = "full" | "icon" | "wordmark";
type LogoTheme = "light" | "dark";

interface BrandLogoProps {
  size?: LogoSize;
  className?: string;
  variant?: LogoVariant;
  theme?: LogoTheme;
}

/** Professional geometric SVG "GRT" monogram */
function GRTIcon({ size, theme }: { size: number; theme: LogoTheme }) {
  const primary = FLUENT_BLUE;
  const dark = FLUENT_DARK_BLUE;
  const textColor = theme === "dark" ? "#ffffff" : "#ffffff";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="GRT Logo"
    >
      {/* Background rounded square — Fluent-style */}
      <rect width="48" height="48" rx="10" fill={primary} />
      {/* Subtle gradient overlay for depth */}
      <defs>
        <linearGradient id="grt-grad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill="url(#grt-grad)" />
      {/* "GRT" letterforms — bold geometric sans-serif */}
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fontFamily="'Segoe UI', system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="20"
        letterSpacing="1"
        fill={textColor}
      >
        GRT
      </text>
    </svg>
  );
}

/** Full wordmark text */
function GRTWordmark({
  fontSize,
  theme,
}: {
  fontSize: number;
  theme: LogoTheme;
}) {
  const color = theme === "dark" ? "#ffffff" : "#323130";
  return (
    <span
      style={{
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        fontWeight: 700,
        fontSize,
        letterSpacing: "0.02em",
        color,
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      GRT
      <span
        style={{
          fontWeight: 400,
          fontSize: fontSize * 0.55,
          color: theme === "dark" ? "rgba(255,255,255,0.6)" : "#605e5c",
          marginLeft: 4,
        }}
      >
        System
      </span>
    </span>
  );
}

export default function BrandLogo({
  size = "md",
  className = "",
  variant = "full",
  theme = "light",
}: BrandLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const dims = SIZES[size];

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      style={{ height: dims.height }}
    >
      {/* Icon portion (logo image or SVG fallback) */}
      {variant !== "wordmark" && (
        <>
          {!imgFailed ? (
            <img
              src="/grt-logo.png"
              alt="GRT"
              style={{
                height: dims.iconSize,
                width: "auto",
                objectFit: "contain",
              }}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <GRTIcon size={dims.iconSize} theme={theme} />
          )}
        </>
      )}

      {/* Wordmark portion */}
      {variant !== "icon" && (
        <GRTWordmark fontSize={dims.fontSize} theme={theme} />
      )}
    </div>
  );
}
