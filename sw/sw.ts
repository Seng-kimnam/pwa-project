import { clientsClaim, skipWaiting } from "workbox-core"
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching"
import { NavigationRoute, registerRoute } from "workbox-routing"
import { CacheFirst, NetworkFirst } from "workbox-strategies"
import { CacheableResponsePlugin } from "workbox-cacheable-response"
import { ExpirationPlugin } from "workbox-expiration"
import { HABIT_SYNC_TAG, HABIT_SYNC_WAKE } from "../src/lib/sync"

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision?: string })[]
}

precacheAndRoute(self.__WB_MANIFEST)
skipWaiting()
clientsClaim()

registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")))

registerRoute(
  ({ request, url }) =>
    request.destination === "image" ||
    /\.(png|jpe?g|svg|gif|webp|avif|ico)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
)

registerRoute(
  ({ request, url }) => url.pathname.startsWith("/api/") && request.method === "GET",
  new NetworkFirst({
    cacheName: "api",
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
)

async function wakeClients(): Promise<void> {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  for (const client of clients) {
    client.postMessage({ type: HABIT_SYNC_WAKE, tag: HABIT_SYNC_TAG })
  }
}

self.addEventListener("sync", (rawEvent) => {
  const event = rawEvent as ExtendableEvent & { tag?: string }
  if (event.tag === HABIT_SYNC_TAG) {
    event.waitUntil(wakeClients())
  }
})