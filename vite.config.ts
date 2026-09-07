import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Bind IPv4 all-interfaces so Cursor/port-forward can reach localhost:8080.
    // host: "::" only listens on IPv6 (:::8080) and the preview looks "not running".
    host: "0.0.0.0",
    // GridLoad owns 8080. Aqarkoom must use a different port (5173).
    port: 8080,
    strictPort: true,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
