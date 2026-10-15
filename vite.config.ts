import { defineConfig } from "vite";

// base relativa: el sitio funciona tanto en la raíz como bajo /<repo>/ en GitHub Pages.
export default defineConfig({
  base: "./",
  build: { target: "es2022" },
});
