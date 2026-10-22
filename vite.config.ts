import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installs the kiosk on the shop's Android tablet: manifest + service
    // worker with autoUpdate, so a redeploy reaches the tablet on next launch.
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Padretar Kiosk",
        short_name: "Padretar",
        display: "fullscreen",
        // Falls back to standalone on browsers that don't take fullscreen.
        display_override: ["fullscreen", "standalone"],
        background_color: "#000000",
        orientation: "landscape",
        start_url: "/kiosk",
        theme_color: "#000000",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
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
