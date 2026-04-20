/**
 * Device routing utilities for SingulAI multi-domain architecture.
 *
 * Domain mapping:
 *   mobile  → https://app.singulai.live
 *   desktop → https://dk.singulai.live
 */

/**
 * Returns true if the current environment is a mobile device.
 *
 * Detection criteria (any match = mobile):
 * 1. Viewport width < 768px
 * 2. Pointer type is coarse (touch input)
 * 3. UserAgent contains Android, iPhone, iPad, iPod or Mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;

  if (window.innerWidth < 768) return true;

  if (window.matchMedia("(pointer: coarse)").matches) return true;

  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true;

  return false;
}

/**
 * Returns the absolute dashboard URL for the current device type.
 *
 * @param path - Path to append (default: "/dashboard")
 * @returns Full URL, e.g. "https://app.singulai.live/dashboard"
 */
export function getDashboardUrl(path = "/dashboard"): string {
  const base = isMobileDevice()
    ? "https://app.singulai.live"
    : "https://dk.singulai.live";

  return `${base}${path}`;
}
