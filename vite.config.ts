import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { Plugin } from "vite"
import type { IncomingMessage, ServerResponse } from "node:http"
import { VitePWA } from "vite-plugin-pwa"

type MockHabit = {
  id: string
  name: string
  createdAt: number
  status: string
}

function mockHabitsApi(): Plugin {
  const habits = new Map<string, MockHabit>()

  const sendJson = (res: ServerResponse, status: number, body: unknown) => {
    const payload = JSON.stringify(body)
    res.statusCode = status
    res.setHeader("Content-Type", "application/json")
    res.setHeader("Content-Length", Buffer.byteLength(payload))
    res.end(payload)
  }

  const readBody = (req: IncomingMessage): Promise<string> =>
    new Promise((resolve, reject) => {
      let raw = ""
      req.on("data", (chunk) => (raw += chunk))
      req.on("end", () => resolve(raw))
      req.on("error", reject)
    })

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET") {
      sendJson(res, 200, Array.from(habits.values()))
      return
    }
    if (req.method === "POST") {
      try {
        const habit = JSON.parse(await readBody(req)) as MockHabit
        if (!habit.id) {
          sendJson(res, 400, { error: "missing `id`" })
          return
        }
        habits.set(habit.id, habit)
        sendJson(res, 201, habit)
      } catch {
        sendJson(res, 400, { error: "invalid JSON body" })
      }
      return
    }
    sendJson(res, 405, { error: "method not allowed" })
  }

  return {
    name: "habits-api",
    configureServer(server) {
      server.middlewares.use("/api/habits", handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/habits", handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // basicSsl(),
    mockHabitsApi(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "sw",
      filename: "sw.ts",
      registerType: "prompt",
      workbox: {
        // Precache: static files built by Vite
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
         runtimeCaching: [
          {
            // Cache Supabase API responses
           
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-public-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images from any source
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,json,svg,png,ico,woff2}"],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        navigateFallback: "index.html",
      },
      manifest: {
        name: "PWA Task",
        short_name: "PWA Task",
        description: "A modern Progressive Web App task manager built with React and Vite.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#4f46e5",
        icons: [
          {
            src: "/pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "/pwa-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "/pwa-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-384x384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/maskable-icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})