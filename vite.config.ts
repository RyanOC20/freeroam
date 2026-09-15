import { defineConfig } from "vite";

export default defineConfig({
  // Project Pages site served from https://ryanoc20.github.io/freeroam/
  base: "/freeroam/",
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
