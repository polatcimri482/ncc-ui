import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  // Disable source maps to avoid absolute path resolution in Vite dev server
  // (source maps can contain paths like /Users/.../src/... which trigger "outside allow list")
  sourcemap: false,
  splitting: true,
  external: ["react", "react-dom"],
  minify: true,
});
