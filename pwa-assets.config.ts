import { defineConfig } from "@vite-pwa/assets-generator/config"

export default defineConfig({
  images: ["public/icon.svg"],
  preset: {
    transparent: {
      sizes: [64, 96, 128, 192, 384, 512],
      favicons: [[48, "favicon.ico"]],
    },
    maskable: {
      sizes: [192, 512],
    },
    apple: {
      sizes: [180],
    },
  },
})