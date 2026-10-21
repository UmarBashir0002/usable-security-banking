import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        standalone: "index.html",
        modular: "app.html",
      },
    },
  },
});
