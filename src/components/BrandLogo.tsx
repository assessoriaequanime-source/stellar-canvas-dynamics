import { useState } from "react";
import { cn } from "@/lib/utils";

export type BrandLogoProps = {
  src?: string;
  fallbackSrc?: string;
  className?: string;
  size?: number;
  alt?: string;
};

export default function BrandLogo({
  src = "/singulai_logo.svg",
  fallbackSrc = "/logo.png",
  className = "",
  size = 96,
  alt = "SingulAI",
}: BrandLogoProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (currentSrc === src && fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div
        className={cn("inline-flex items-center justify-center font-bold text-primary", className)}
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        <span className="text-lg">SingulAI</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
      onError={handleError}
    />
  );
}