import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    // Must be IPv4 0.0.0.0 so Cursor can see 8080 in /proc/net/tcp.
    // host: true / "::" only binds IPv6 (:::8080). Cursor's port forward
    // falls back to /proc/net/tcp and never finds the server — blank Browser tab.
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
