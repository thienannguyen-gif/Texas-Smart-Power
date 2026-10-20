/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The disclaimer page imports ../docs/DISCLAIMER.md (one source of truth
    // for the text), which sits outside this folder: allow the repo root.
    fs: { allow: [".."] },
    // `vercel dev` assigns a port and passes it as $PORT, then proxies
    // :3000 to it. Vite ignores $PORT on its own, so bind to it explicitly.
    // Falls back to Vite's default for a plain `npm run dev`.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: Boolean(process.env.PORT),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
