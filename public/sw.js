// Import the modern, modular SDKs for Firebase
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js"
);

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDk-n02q6hW_41tCnLw4oaYYjEh3codxcw",
  authDomain: "runit-91e6f.firebaseapp.com",
  projectId: "runit-91e6f",
  storageBucket: "gs://runit-91e6f.firebasestorage.app",
  messagingSenderId: "1098137720623",
  appId: "1:1098137720623:web:48a6cb82eb37a08fd6b3da",
};

// Initialize Firebase using the modular functions
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging.getMessaging(app);

// Set the background message handler for incoming notifications
firebase.messaging.onBackgroundMessage(messaging, (payload) => {
  console.log("[sw.js] Received background message ", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icons/icon-192x192.png", // A default icon
    badge: "/icons/boot.svg", // Icon for the notification bar on Android
    data: {
      url: payload.data.url || "/", // URL to open when notification is clicked
    },
  };

  // Display the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || "/";

  event.waitUntil(clients.openWindow(urlToOpen));
});

// --- Your Existing PWA Caching Logic (Remains Unchanged) ---

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
