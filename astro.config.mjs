import { defineConfig } from "astro/config";

import solid from "@astrojs/solid-js";

import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  build: { format: "preserve" },
  integrations: [solid()],
  vite: { plugins: [tailwindcss()] },
});
