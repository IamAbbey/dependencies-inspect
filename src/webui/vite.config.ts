import path from "path";
import fs, { constants } from "fs/promises";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    {
      name: "transform-html",
      transformIndexHtml: {
        order: "pre",
        async handler() {
          try {
            // Check if the file exists in the current directory.
            await fs.access("./dev.html", constants.F_OK);
          } catch {
            await fs.copyFile("./index.html", "./dev.html");
          }
        },
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
  server: {
    open: "./dev.html",
  },
});
