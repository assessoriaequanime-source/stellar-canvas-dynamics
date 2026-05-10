import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  cloudflare: false,
  vite: {
    plugins: [
      nodePolyfills({
        // Buffer e process são obrigatórios para @solana/web3.js no browser
        include: ["buffer", "process", "stream", "util", "events"],
        globals: { Buffer: true, process: true, global: true },
      }),
    ],
    server: {
      host: true,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8091",
          changeOrigin: true,
        },
      },
      allowedHosts: ["singulai.live", "www.singulai.live", "app.singulai.live", "dk.singulai.live"],
    },
    preview: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8091",
          changeOrigin: true,
        },
      },
      allowedHosts: ["singulai.live", "www.singulai.live", "app.singulai.live", "dk.singulai.live"],
    },
  },
});
