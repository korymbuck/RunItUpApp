import { createApp } from "vue";
import App from "./App.vue";

import { IonicVue } from "@ionic/vue";

/* Core CSS required for Ionic components to work properly */
import "@ionic/vue/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/vue/css/normalize.css";
import "@ionic/vue/css/structure.css";
import "@ionic/vue/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/vue/css/padding.css";
import "@ionic/vue/css/float-elements.css";
import "@ionic/vue/css/text-alignment.css";
import "@ionic/vue/css/text-transformation.css";
import "@ionic/vue/css/flex-utils.css";
import "@ionic/vue/css/display.css";

/* Theme variables */
import "./style.css";

const app = createApp(App);

app.use(IonicVue);

// --- START: THEME DETECTION LOGIC ---

// This function checks the system's preferred color scheme and toggles the 'dark' class on the body.
const toggleDarkMode = (shouldAdd) => {
  document.body.classList.toggle("dark", shouldAdd);
};

// Use matchMedia to check the user's preference
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

// Immediately set the theme when the app loads
toggleDarkMode(prefersDark.matches);

// Listen for changes in the system preference
prefersDark.addEventListener("change", (mediaQuery) => {
  toggleDarkMode(mediaQuery.matches);
});

// PWA Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "Service Worker registered with scope:",
          registration.scope
        );
      })
      .catch((error) => {
        console.log("Service Worker registration failed:", error);
      });
  });
}

app.mount("#app");
