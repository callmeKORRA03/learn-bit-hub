  // import { defineConfig } from "vite";
  // import react from "@vitejs/plugin-react-swc";
  // import path from "path";
  // import { componentTagger } from "lovable-tagger";

  // // https://vitejs.dev/config/
  // export default defineConfig(({ mode }) => ({
  //   server: {
  //     host: "::",
  //     port: 8080,
  //   },
  //   plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  //   resolve: {
  //     alias: {
  //       "@": path.resolve(__dirname, "./src"),
  //     },
  //   },
  // }));
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/", // use '/' for root, or './' for relative paths if needed
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    outDir: "build", // change to "dist" if you want Vite default
    emptyOutDir: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
