import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { componentTagger } from "lovable-tagger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/", // use '/' for root, or './' for relative paths if needed
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    outDir: "build", // change to "dist" if you prefer Vite default
    emptyOutDir: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      // app alias
      "@": path.resolve(__dirname, "./src"),

      // Node core shims -> resolved to absolute node_modules paths to avoid duplication errors
      buffer: path.resolve(__dirname, "node_modules/buffer"),
      stream: path.resolve(__dirname, "node_modules/stream-browserify"),
      crypto: path.resolve(__dirname, "node_modules/crypto-browserify"),
      assert: path.resolve(__dirname, "node_modules/assert"),
      http: path.resolve(__dirname, "node_modules/stream-http"),
      https: path.resolve(__dirname, "node_modules/https-browserify"),
      os: path.resolve(__dirname, "node_modules/os-browserify"),
      url: path.resolve(__dirname, "node_modules/url"),
      zlib: path.resolve(__dirname, "node_modules/browserify-zlib"),
      events: path.resolve(__dirname, "node_modules/events"),
      process: path.resolve(__dirname, "node_modules/process/browser"),
      util: path.resolve(__dirname, "node_modules/util"),
    },
  },
  define: {
    "process.env": {},
    global: "globalThis",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
      define: {
        global: "globalThis",
      },
    },
    include: ["buffer", "process"],
  },
}));
