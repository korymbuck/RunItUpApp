// Import the Firebase "compat" scripts for use with importScripts
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

// Your web app's Firebase configuration (remains the same)
const firebaseConfig = {
  apiKey: "AIzaSyDk-n02q6hW_41tCnLw4oaYYjEh3codxcw",
  authDomain: "runit-91e6f.firebaseapp.com",
  projectId: "runit-91e6f",
  storageBucket: "gs://runit-91e6f.firebasestorage.app",
  messagingSenderId: "1098137720623",
  appId: "1:1098137720623:web:48a6cb82eb37a08fd6b3da",
};

// Initialize Firebase using the v8-compatible syntax
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Set the background message handler
messaging.onBackgroundMessage((payload) => {
  console.log("[sw.js] Received background message ", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/boot.svg",
    data: {
      url: payload.data.url || "/",
    },
  };

  // self.registration refers to the service worker's own registration
  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle notification click events (your existing code is good)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || "/";

  event.waitUntil(clients.openWindow(urlToOpen));
});

// --- Your PWA Caching Logic (No changes needed here) ---

const CACHE_NAME = "run-it-up-app-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-512x512.maskable.png",
  "/assets/index-xxxxxxxx.js",
  "/assets/index-xxxxxxxx.css",
  "/icons/boot.svg",
];

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install Event");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell");
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

// MODIFIED FETCH LISTENER (Bonus Tip)
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // **FIX: Bypass cache for Firebase and Google APIs to ensure live data.**
  if (
    requestUrl.hostname === "firestore.googleapis.com" ||
    requestUrl.hostname.endsWith("firebaseapp.com") ||
    requestUrl.hostname === "www.gstatic.com" // Added this line
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For all other requests, use the cache-first strategy.
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});
