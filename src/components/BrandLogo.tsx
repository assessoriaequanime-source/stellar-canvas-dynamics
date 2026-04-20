import type { CSSProperties } from "react";

import { BRAND_COPY } from "@/lib/brand";
import { cn } from "@/lib/utils";

export type BrandLogoProps = {
  variant: "horizontal" | "vertical";
  tone: "black" | "white" | "color";
  size: "sm" | "md" | "lg";
  usage: "header" | "intro" | "footer" | "modal";
  className?: string;
};

const LOGO_ASSET_SRC: string | null = "/singulai_logo.svg";

const LOGO_SIZE_MAP: Record<BrandLogoProps["variant"], Record<BrandLogoProps["size"], { width: string; height: string }>> = {
  horizontal: {
    sm: { width: "132px", height: "36px" },
    md: { width: "196px", height: "54px" },
    lg: { width: "252px", height: "70px" },
  },
  vertical: {
    sm: { width: "92px", height: "92px" },
    md: { width: "120px", height: "120px" },
    lg: { width: "156px", height: "156px" },
  },
};

const USAGE_LABELS: Record<BrandLogoProps["usage"], string> = {
  header: "dashboard interface",
  intro: "demo memory",
  footer: "signal archive",
  modal: "capsule protocol",
};

export default function BrandLogo({ variant, tone, size, usage, className }: BrandLogoProps) {
  const dimensions = LOGO_SIZE_MAP[variant][size];
  const style = {
    "--brand-logo-width": dimensions.width,
    "--brand-logo-height": dimensions.height,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "brand-logo",
        `brand-logo--${variant}`,
        `brand-logo--${tone}`,
        `brand-logo--${size}`,
        `brand-logo--${usage}`,
        className,
      )}
      style={style}
      aria-label={BRAND_COPY.name}
    >
      <div className="brand-logo-safearea">
        {LOGO_ASSET_SRC ? (
          <img className="brand-logo-asset" src={LOGO_ASSET_SRC} alt={BRAND_COPY.name} />
        ) : (
          <>
            <span className="brand-logo-mark" aria-hidden="true">
              <span className="brand-logo-mark-core" />
              <span className="brand-logo-mark-orbit" />
              <span className="brand-logo-mark-glyph">S</span>
            </span>

            <span className="brand-logo-copy">
              <span className="brand-logo-wordmark">{BRAND_COPY.name}</span>
              <span className="brand-logo-tagline">{USAGE_LABELS[usage]}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}