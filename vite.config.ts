import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { ManualChunksOption } from "rollup";
import { componentTagger } from "lovable-tagger";

const vendorChunkGroups: Record<string, readonly string[]> = {
  react: ["react", "react-dom"],
  router: ["react-router-dom", "react-router", "@remix-run/router"],
  supabase: ["@supabase/supabase-js"],
};

const manualChunks: ManualChunksOption = (id) => {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  const normalizedId = id.replace(/\\/g, "/");

  for (const [chunkName, packages] of Object.entries(vendorChunkGroups)) {
    if (packages.some((pkg) => normalizedId.includes(`/node_modules/${pkg}/`))) {
      return chunkName;
    }
  }

  return undefined;
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    outDir: "dist", // Default output directory for Vite
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },

  base: "/", // Ensure assets are served from the root path

  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
