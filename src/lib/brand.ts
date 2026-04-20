export const BRAND_COLORS = {
  obsidianBlack: "#0B0B0B",
  electricBlue: "#26B0E2",
  charcoalGray: "#4C4F51",
  whiteLight: "#FFFFFF",
} as const;

export const BRAND_RGB = {
  obsidianBlack: "11, 11, 11",
  electricBlue: "38, 176, 226",
  charcoalGray: "76, 79, 81",
  whiteLight: "255, 255, 255",
} as const;

export const BRAND_COPY = {
  name: "SingulAI",
  tagline: "Intelligence Beyond Limits",
} as const;

export const BRAND_TYPE_SCALE = {
  eyebrow: "0.625rem",
  h1: "clamp(2.75rem, 9vw, 6.5rem)",
  h2: "clamp(2rem, 5vw, 4rem)",
  body: "1rem",
  caption: "0.8125rem",
  microLabel: "0.6875rem",
} as const;

export const BRAND_LOGO_USAGE = {
  demo: {
    variant: "vertical",
    tone: "color",
    size: "lg",
    usage: "intro",
  },
  dashboard: {
    variant: "horizontal",
    tone: "white",
    size: "sm",
    usage: "header",
  },
  modal: {
    variant: "horizontal",
    tone: "color",
    size: "sm",
    usage: "modal",
  },
} as const;

export type BrandLogoPreset = typeof BRAND_LOGO_USAGE[keyof typeof BRAND_LOGO_USAGE];

export const MODEL_VISUALS = {
  safe: {
    id: "safe",
    model: "Safe Quantum",
    avatarName: "Pedro",
    accent: "#26B0E2",
    rgb: [38, 176, 226] as const,
    glow: "rgba(38, 176, 226, 0.42)",
    soft: "rgba(38, 176, 226, 0.16)",
  },
  diffusion: {
    id: "diffusion",
    model: "Difusão Spin",
    avatarName: "Laura",
    accent: "#E2269C",
    rgb: [226, 38, 156] as const,
    glow: "rgba(226, 38, 156, 0.42)",
    soft: "rgba(226, 38, 156, 0.16)",
  },
  focus: {
    id: "focus",
    model: "Foco Atômico",
    avatarName: "Letícia",
    accent: "#E2C026",
    rgb: [226, 192, 38] as const,
    glow: "rgba(226, 192, 38, 0.42)",
    soft: "rgba(226, 192, 38, 0.16)",
  },
} as const;

export type ModelVisualKey = keyof typeof MODEL_VISUALS;