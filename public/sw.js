const CACHE_NAME = "run-it-up-app-cache-v1";
// List all files your app needs to function offline.
// Ensure these paths are correct relative to the root of your public folder.
const urlsToCache = [
  "/", // Caches the root URL (your index.html when accessed directly)
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png", // Make sure these paths match your manifest
  "/icons/icon-512x512.png",
  "/icons/icon-512x512.maskable.png",
  // Add your CSS, JS, and other critical assets here:
  "/assets/index-xxxxxxxx.js", // Replace with your actual main JS bundle (check your dist folder after build)
  "/assets/index-xxxxxxxx.css", // Replace with your actual main CSS bundle (check your dist folder after build)
  "/icons/boot.svg", // From your App.vue, ensure this path is correct
];

// Install event: caches assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install Event");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Caching app shell");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("[Service Worker] Failed to cache:", error);
      })
  );
});

// Activate event: cleans up old caches
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

// Fetch event: serves cached assets or fetches from network
self.addEventListener("fetch", (event) => {
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
