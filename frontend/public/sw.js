const STATIC_CACHE = "veshtit-static-v1";
const RUNTIME_CACHE = "veshtit-runtime-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const valid = new Set([STATIC_CACHE, RUNTIME_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !valid.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API proxy routes or icon generation
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/pwa-icon")) return;

  // Immutable Next.js static assets — hash-based filenames, cache forever
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((res) => {
            cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // App shell HTML — network first, fall back to cache so the app loads offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((r) => r || caches.match("/accounts"))
        )
    );
  }
});
