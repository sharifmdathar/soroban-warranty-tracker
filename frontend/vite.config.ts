import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split node_modules into separate chunks
          if (id.includes("node_modules")) {
            // Stellar SDK and related packages (likely large)
            if (
              id.includes("@stellar") ||
              id.includes("stellar") ||
              id.includes("xdr")
            ) {
              return "stellar-vendor";
            }
            // React and React DOM
            if (id.includes("react") || id.includes("react-dom")) {
              return "react-vendor";
            }
            // Lucide icons
            if (id.includes("lucide-react")) {
              return "icons-vendor";
            }
            // Everything else from node_modules
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit after optimization
  },
  server: {
    port: 3000,
    open: true,
  },
});
