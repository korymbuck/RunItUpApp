const CACHE_NAME = "run-it-up-app-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x12.png",
  "/icons/icon-512x512.maskable.png",
  "/assets/index-xxxxxxxx.js", // Note: Vite generates hashed filenames
  "/assets/index-xxxxxxxx.css",
  "/icons/boot.svg",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Install Event");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching app shell");
      // Use catch() to prevent a single failed asset from breaking the whole install
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn("[SW] Caching failed for some assets:", err);
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activate Event");
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass cache for Firebase and Google APIs to ensure live data.
  if (
    requestUrl.hostname === "firestore.googleapis.com" ||
    requestUrl.hostname.endsWith("firebaseapp.com") ||
    requestUrl.hostname === "www.gstatic.com"
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For all other requests, use the cache-first strategy.
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
