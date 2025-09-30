const CACHE_NAME = "run-it-up-app-cache-v1";
// List all files your app needs to function offline.
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-512x512.maskable.png",
  "/assets/index-xxxxxxxx.js", // Vite will replace these hashes
  "/assets/index-xxxxxxxx.css", // Vite will replace these hashes
  "/icons/boot.svg",
];

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install Event");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell");
      // Use a non-blocking cache addAll. If one asset fails, the others still cache.
      // This is more robust, especially for the hashed assets.
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn("[Service Worker] Caching failed for some assets:", err);
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activate Event");
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// --- MODIFIED FETCH LISTENER ---
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // **FIX: Bypass cache for all Firestore and Google API requests.**
  // This ensures that all communication with your database is live.
  if (
    requestUrl.hostname === "firestore.googleapis.com" ||
    requestUrl.hostname.endsWith("firebaseapp.com")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For all other requests, use the cache-first strategy.
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      // No cache hit - fetch from network
      return fetch(event.request);
    })
  );
});
