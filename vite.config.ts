import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      host: true,
      allowedHosts: ["singulai.live", "www.singulai.live"],
    },
    preview: {
      allowedHosts: ["singulai.live", "www.singulai.live"],
    },
  },
});
