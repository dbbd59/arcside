import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: "sidepanel.html",
        offscreen: "offscreen.html",
        newtab: "newtab.html",
        overlay: "src/overlay.ts",
        "ambient-probe": "src/ambient-probe.ts",
        background: "src/background.ts"
      },
      output: {
        entryFileNames: chunk =>
          chunk.facadeModuleId?.endsWith(".html") ? "assets/[name]-[hash].js" : "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
