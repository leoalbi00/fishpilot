// Service Worker "leggero" per FishPilot AI: nessuna dipendenza (niente
// Workbox), pensato per garantire che l'app shell e le ultime pagine
// visitate restino consultabili anche con scarso segnale GPS/4G in mare
// (gli spot preferiti vivono comunque in localStorage/Supabase, vedi
// src/lib/favorites.ts, quindi sono già disponibili offline una volta
// caricata la home).
const CACHE_VERSION = "fishpilot-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // non tocchiamo POST /api/analyze ecc.

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigazione tra pagine: rete con fallback su cache, poi su offline.html.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(
          () => caches.match(request).then((cached) => cached ?? caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Asset statici (JS/CSS/icone/font): cache-first, aggiornata in background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached ?? network;
    })
  );
});
