import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  vite: {
    server: {
      host: true,
      allowedHosts: [
        "singulai.live",
        "www.singulai.live",
        "app.singulai.live",
        "dk.singulai.live",
      ],
    },
    preview: {
      allowedHosts: [
        "singulai.live",
        "www.singulai.live",
        "app.singulai.live",
        "dk.singulai.live",
      ],
    },
  },
});
