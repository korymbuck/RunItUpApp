// Import the Firebase "compat" scripts for use with importScripts
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
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

// Initialize Firebase using the v8-compatible syntax
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// --- THIS IS THE KEY PART ---
// Set the background message handler to display the notification
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/boot.svg",
    data: {
      url: payload.data.url || "/", // Use the URL from the data payload
    },
  };

  // self.registration refers to the service worker's own registration
  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle notification click events
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || "/";

  event.waitUntil(clients.openWindow(urlToOpen));
});

// --- IMPORT YOUR PWA CACHING LOGIC ---
// This line will execute the code from your original sw.js
importScripts("/sw.js");
