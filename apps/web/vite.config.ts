import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Alamat tunnel `npm run share` dan alternatifnya.
    allowedHosts: [".loca.lt", ".trycloudflare.com", ".ngrok-free.app"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("leaflet")) return "leaflet";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react")) return "react-vendor";
          return undefined;
        },
      },
    },
  },
});
