import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    // The kiosk screen and the employee phone must reach the dev server.
    host: true,
    // Vite rejects unfamiliar Host headers. Allow quick tunnels, which is how
    // the camera gets tested before deploying: getUserMedia needs https, so a
    // LAN IP over http will never prompt for the camera.
    //   cloudflared tunnel --url http://localhost:5199
    allowedHosts: [".trycloudflare.com"],
  },
});
