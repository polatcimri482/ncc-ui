import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "preview",
  plugins: [react()],
  server: {
    proxy: {
      "/ncc": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
