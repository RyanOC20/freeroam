import { defineConfig } from "vite";

export default defineConfig({
  plugins: [],
  build: {
    target: "es2022",
  },
  resolve: {
    alias: {
      buffer: "buffer/",
    },
  },
  define: {
    global: "globalThis",
  },
});
