<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import {
  IonApp,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonInput,
  IonList,
  IonItem,
  IonLabel,
  IonModal,
  IonIcon,
  IonProgressBar,
  alertController,
  toastController,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  actionSheetController,
  IonActionSheet,
  IonButtons,
  IonSelect,
  IonSelectOption,
  IonNote,
} from "@ionic/vue";
import {
  home,
  people,
  logOut,
  closeCircle,
  trash,
  personCircle,
  rocket,
  timeOutline,
  statsChart,
  speedometer,
  personOutline,
  mailOutline,
  lockClosedOutline,
  settingsOutline,
  footsteps,
  sunnyOutline,
  cloudOutline,
  rainyOutline,
  snowOutline,
  thunderstormOutline,
  partlySunnyOutline,
} from "ionicons/icons";
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  orderBy,
  limit,
  updateDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { gsap } from "gsap";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from "./firebase-config.js";

// Import the new components
import HomePage from "./components/HomePage.vue";
import SocialPage from "./components/SocialPage.vue";
import ProfilePage from "./components/ProfilePage.vue";

// --- NEW: Input Validation and Sanitization Utilities ---
const validators = {
  isValidEmail: (email) => {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  },
  isStrongPassword: (password) => {
    // Minimum 8 characters, at least one letter and one number
    const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return re.test(password);
  },
  sanitizeInput: (input) => {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
  },
};

// --- Helper to display toasts ---
async function presentToast(message, color = "warning") {
  const toast = await toastController.create({
    message,
    duration: 3000,
    color,
    position: "top",
  });
  await toast.present();
}

// --- Ref for IonContent to attach scroll listener ---
const contentRef = ref(null);

// --- STATE ---
const isLoading = ref(true);
const levels = [
  { name: "Bronze", emoji: "🥉", xp: 25 },
  { name: "Silver", emoji: "🥈", xp: 50 },
  { name: "Gold", emoji: "🥇", xp: 100 },
  { name: "Platinum", emoji: "⚪", xp: 200 },
  { name: "Emerald", emoji: "❇️", xp: 400 },
  { name: "Sapphire", emoji: "🔷", xp: 800 },
  { name: "Ruby", emoji: "♦️", xp: 1600 },
  { name: "Diamond", emoji: "💎", xp: 3200 },
  { name: "Onyx", emoji: "⚫", xp: 6400 },
  { name: "Obsidian", emoji: "🖤", xp: 12800 },
  { name: "Mythic", emoji: "🌟", xp: 25600 },
  { name: "Legendary", emoji: "🏆", xp: Infinity },
];
const user = ref(null);
const email = ref("");
const password = ref("");
const authMessage = ref("");
const totalDistance = ref(0);
const totalTime = ref(0);
const xp = ref(0);
const animatedTotalDistance = ref(0);
const animatedTotalTime = ref(0);
const animatedXp = ref(0);
const distanceInput = ref(null);
const hoursInput = ref(null);
const minutesInput = ref(null);
const secondsInput = ref(null);
const runHistory = ref([]);
const isAuthModalVisible = ref(false);
const currentPage = ref("home");
const displayName = ref("");
const friendUsername = ref("");
const friends = ref([]);
let activeListeners = [];
const visibleRunsCount = ref(2);
const isFollowModalVisible = ref(false);
const isTracking = ref(false);
let watchId = null;
let startTime = null;
let lastPosition = null;
const currentDistance = ref(0);
const currentPace = ref(0);
const elapsedTime = ref(0);
let timerInterval = null;
const routeCoordinates = ref([]);
const isSummaryModalVisible = ref(false);
const lastRunSummary = ref(null);
const photoURL = ref(null);
const newDisplayName = ref("");
const fileInput = ref(null);
const authView = ref("signin");
const isLogRunModalVisible = ref(false);
const isLiveTrackingModalVisible = ref(false);
const currentWeekOffset = ref(0);
const isEditingProfile = ref(false);
const isEditProfileModalVisible = ref(false);
const isUserProfileModalVisible = ref(false);
const selectedFriendProfile = ref(null);
const isFetchingFriendRuns = ref(false);
// State for hold-to-stop button
const isHoldingStop = ref(false);
const holdProgress = ref(0);
let holdTimer = null;
let progressInterval = null;

// --- NEW SHOE FEATURE STATE ---
const userShoes = ref([]);
const isAddShoeModalVisible = ref(false);
const newShoeBrand = ref("");
const newShoeModel = ref("");
const isShoeDetailModalVisible = ref(false);
const selectedShoeDetails = ref(null);
const selectedShoeForRun = ref(null);

// -- DESCRIPTIONS STATE --
const runSummaryDescription = ref("");
const logRunDescription = ref("");

// -- MAPS STATE --
const mapContainer = ref(null); // To get a reference to the div
let map = null; // We use 'let' because the map instance itself isn't reactive
let userMarker = null;
let routePolyline = null;
const summaryMapContainer = ref(null);
let summaryMap = null;
let summaryRoutePolyline = null;
const mapRefs = ref({});
let activeCardMaps = [];
const MAPBOX_ACCESS_TOKEN =
  "pk.eyJ1Ijoia29yeW1idWNrIiwiYSI6ImNtZXJheHJveTA0a3Aya3B4Y3JndGthN2MifQ.2qaE0m-37OvguYab1jiLmA";

// --- COMPUTED ---
const setMapRef = (key, el) => {
  if (el) {
    // This function will initialize the map
    const initialize = () => {
      // Find the route data associated with this map key
      const type = key.startsWith("run-") ? "run" : "friend";
      const id = key.substring(type.length + 1);
      let routeData = null;

      if (type === "run") {
        const run = runHistory.value.find((r) => r.id === id);
        if (run) routeData = run.route;
      } else if (type === "friend") {
        const friend = friends.value.find((f) => f.uid === id);
        if (friend) routeData = friend.stats?.lastRun?.route;
      }

      // If we have data and the map isn't already there, create it
      if (routeData && routeData.length > 0 && !el._leaflet_id) {
        initRunCardMap(el, routeData);
      }
    };

    // The ResizeObserver is the key. It waits for the element to have a size.
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // As soon as the container has a width, we know it's visible.
        if (entry.contentRect.width > 0) {
          initialize();
          // Once the map is initialized, we don't need to observe it anymore.
          observer.unobserve(el);
        }
      }
    });

    observer.observe(el);
  }
};

const currentLevel = computed(() => {
  for (let i = 0; i < levels.length; i++) {
    if (xp.value <= levels[i].xp) return { ...levels[i], index: i };
  }
  return levels[levels.length - 1];
});
const nextLevel = computed(
  () => levels[Math.min(currentLevel.value.index + 1, levels.length - 1)]
);
const progress = computed(() => {
  const prevLevel = levels[currentLevel.value.index - 1] || { xp: 0 };
  return currentLevel.value.xp === Infinity
    ? 1
    : (xp.value - prevLevel.xp) / (currentLevel.value.xp - prevLevel.xp);
});
const displayedRuns = computed(() =>
  runHistory.value.slice(0, visibleRunsCount.value)
);
const lastRunXp = computed(() =>
  lastRunSummary.value ? Math.floor(lastRunSummary.value.distance) : 0
);

const getStartOfWeek = (date, offset = 0) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + offset * 7); // Go to Sunday of the offset week
  d.setHours(0, 0, 0, 0);
  return d;
};

const currentWeekStart = computed(() =>
  getStartOfWeek(new Date(), currentWeekOffset.value)
);

const currentWeekEnd = computed(() => {
  const end = new Date(currentWeekStart.value);
  end.setDate(end.getDate() + 7);
  return end;
});

const runsForCurrentWeek = computed(() =>
  runHistory.value.filter((run) => {
    const runDate = new Date(run.timestamp);
    return runDate >= currentWeekStart.value && runDate < currentWeekEnd.value;
  })
);

const weeklyChartData = computed(() => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyTotals = Array(7).fill(0);

  runsForCurrentWeek.value.forEach((run) => {
    const dayIndex = new Date(run.timestamp).getDay();
    dailyTotals[dayIndex] += run.distance;
  });

  const maxDistance = Math.max(...dailyTotals, 1);

  return days.map((day, index) => ({
    day,
    distance: dailyTotals[index],
    height: (dailyTotals[index] / maxDistance) * 100,
  }));
});

const weeklyTotalDistance = computed(() =>
  runsForCurrentWeek.value.reduce((sum, run) => sum + run.distance, 0)
);

const averagePaceInSelectedShoe = computed(() => {
  if (
    !selectedShoeDetails.value ||
    !selectedShoeDetails.value.totalDistance ||
    selectedShoeDetails.value.totalDistance === 0
  ) {
    return 0;
  }
  return (
    selectedShoeDetails.value.totalTime /
    selectedShoeDetails.value.totalDistance
  );
});

const sortedFriends = computed(() => {
  // Create a shallow copy to avoid mutating the original array
  return [...friends.value].sort((a, b) => {
    const aLastRun = a.stats?.lastRun?.date;
    const bLastRun = b.stats?.lastRun?.date;

    // If 'b' has no last run, it should come after 'a'
    if (!bLastRun) return -1;
    // If 'a' has no last run, it should come after 'b'
    if (!aLastRun) return 1;

    // Sort by the most recent date first (descending order)
    return new Date(bLastRun) - new Date(aLastRun);
  });
});

// --- WATCHERS ---

watch(isLiveTrackingModalVisible, (isNowVisible) => {
  if (isNowVisible) {
    setTimeout(() => {
      initMap();
    }, 200);
  }
});

watch(isSummaryModalVisible, (isNowVisible) => {
  if (isNowVisible) {
    // Apply the same logic for the summary map
    setTimeout(() => {
      initSummaryMap();
    }, 200);
  }
});

// --- METHODS ---
function cleanupListeners() {
  activeListeners.forEach((unsubscribe) => unsubscribe());
  activeListeners = [];
}

function getLevelForXp(friendXp) {
  if (typeof friendXp !== "number") friendXp = 0;
  for (let i = 0; i < levels.length; i++) {
    if (friendXp <= levels[i].xp) return { ...levels[i], index: i };
  }
  return { ...levels[levels.length - 1], index: levels.length - 1 };
}

// New function to calculate progress percentage for any given XP
function getProgressForXp(friendXp) {
  if (typeof friendXp !== "number") friendXp = 0;
  const currentFriendLevel = getLevelForXp(friendXp);
  const prevLevel = levels[currentFriendLevel.index - 1] || { xp: 0 };

  if (currentFriendLevel.xp === Infinity) {
    return 1;
  }

  const xpIntoLevel = friendXp - prevLevel.xp;
  const xpForLevel = currentFriendLevel.xp - prevLevel.xp;

  return xpForLevel > 0 ? xpIntoLevel / xpForLevel : 0;
}
function showMoreRuns() {
  visibleRunsCount.value += 5;
}
function openFollowModal() {
  isFollowModalVisible.value = true;
}
function closeFollowModal() {
  isFollowModalVisible.value = false;
  friendUsername.value = "";
}
function openAuthModal() {
  isAuthModalVisible.value = true;
}
function closeAuthModal() {
  isAuthModalVisible.value = false;
  authMessage.value = "";
}

function formatTime(seconds, includeHours = false) {
  if (!seconds || isNaN(seconds)) return includeHours ? "00:00:00" : "00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (includeHours || hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function animateStat(statName, startValue, endValue) {
  gsap.fromTo(
    { value: startValue },
    { value: endValue },
    {
      duration: 1.5,
      ease: "power2.out",
      onUpdate: function () {
        if (statName === "totalDistance")
          animatedTotalDistance.value = this.targets()[0].value;
        if (statName === "totalTime")
          animatedTotalTime.value = this.targets()[0].value;
        if (statName === "xp") animatedXp.value = this.targets()[0].value;
      },
    }
  );
}

function goToPreviousWeek() {
  currentWeekOffset.value--;
}

function goToNextWeek() {
  if (currentWeekOffset.value < 0) {
    currentWeekOffset.value++;
  }
}

async function openRunActionSheet() {
  const actionSheet = await actionSheetController.create({
    header: "New Run",
    cssClass: "run-action-sheet",
    buttons: [
      {
        text: "Start Live Tracking",
        handler: () => {
          isLiveTrackingModalVisible.value = true;
        },
      },
      {
        text: "Log a Past Run",
        handler: () => {
          isLogRunModalVisible.value = true;
        },
      },
      {
        text: "Cancel",
        role: "cancel",
      },
    ],
  });
  await actionSheet.present();
}

async function openSettingsMenu() {
  const actionSheet = await actionSheetController.create({
    header: "Settings",
    cssClass: "run-action-sheet",
    buttons: [
      {
        text: "Edit Profile",
        handler: () => {
          isEditProfileModalVisible.value = true;
        },
      },
      {
        text: "Sign Out",
        role: "destructive",
        handler: handleSignOut,
      },
      {
        text: "Cancel",
        role: "cancel",
      },
    ],
  });
  await actionSheet.present();
}

async function fetchRunsForUser(userId) {
  const runsQuery = query(
    collection(db, "runs"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(5) // Fetch the 5 most recent runs
  );
  const querySnapshot = await getDocs(runsQuery);
  return querySnapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    timestamp: d.data().timestamp.toDate(),
  }));
}

async function openUserProfileModal(friend) {
  isFetchingFriendRuns.value = true;
  selectedFriendProfile.value = { ...friend, runs: [] };
  isUserProfileModalVisible.value = true;

  try {
    const runs = await fetchRunsForUser(friend.uid);
    if (
      selectedFriendProfile.value &&
      selectedFriendProfile.value.uid === friend.uid
    ) {
      selectedFriendProfile.value.runs = runs;
    }
  } catch (error) {
    console.error("Error fetching friend's runs:", error);
    await presentToast("Could not load runs for this user.", "danger");
  } finally {
    isFetchingFriendRuns.value = false;
  }
}

async function initRunCardMap(container, route) {
  // Guard against re-initialization and ensure container exists.
  if (!container || container._leaflet_id) {
    return;
  }

  const mapboxAccessToken = MAPBOX_ACCESS_TOKEN;
  const routeLatLngs = route.map((p) => [p.lat, p.lng]);

  try {
    const cardMap = L.map(container, {
      zoomControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false, // Keep the UI clean for small cards
    });

    L.tileLayer(
      "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token={accessToken}",
      { accessToken: mapboxAccessToken }
    ).addTo(cardMap);

    const polyline = L.polyline(routeLatLngs, {
      color: "#fbbf24",
      weight: 4,
    }).addTo(cardMap);

    // This check is crucial. It ensures we only try to fit the map
    // to the route if the route has actual, valid coordinates.
    if (polyline.getBounds().isValid()) {
      cardMap.fitBounds(polyline.getBounds().pad(0.1));
    }

    activeCardMaps.push(cardMap); // Track map instance for later destruction

    // Final check to ensure size is correct after initialization.
    requestAnimationFrame(() => {
      if (cardMap) cardMap.invalidateSize();
    });
  } catch (error) {
    console.error("Error initializing run card map:", error);
  }
}

function destroyCardMaps() {
  activeCardMaps.forEach((map) => {
    if (map && map.remove) {
      map.remove();
    }
  });
  activeCardMaps = [];
  mapRefs.value = {};
}

/* Weather Methods */
const openWeatherApiKey = ref("0eba5f215da947c9f966707b84cea466");

async function fetchWeatherForRun(latitude, longitude) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherApiKey.value}&units=imperial`
    );
    if (!response.ok) {
      throw new Error("Weather data not available");
    }
    const data = await response.json();
    return {
      temp: data.main.temp,
      description: data.weather[0].main, // e.g., "Clouds", "Clear"
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

// Maps weather descriptions to Ionicons
function getWeatherIcon(description) {
  const iconMap = {
    Thunderstorm: thunderstormOutline,
    Drizzle: rainyOutline,
    Rain: rainyOutline,
    Snow: snowOutline,
    Clear: sunnyOutline,
    Cloudy: cloudOutline,
  };
  return iconMap[description] || partlySunnyOutline; // Default icon for mist, fog, etc.
}

/* Map Methods */

async function initMap() {
  // Guard against re-initialization and ensure container exists.
  if (map || !mapContainer.value) {
    if (!mapContainer.value) {
      console.error("initMap called, but mapContainer div not found!");
    }
    return;
  }

  const mapboxAccessToken = MAPBOX_ACCESS_TOKEN;

  try {
    console.log("Container found. Initializing map...");
    map = L.map(mapContainer.value).setView([51.505, -0.09], 13);
    L.tileLayer(
      "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token={accessToken}",
      {
        attribution:
          '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        accessToken: mapboxAccessToken,
      }
    ).addTo(map);

    // Final check to ensure size is correct after initialization.
    requestAnimationFrame(() => {
      if (map) map.invalidateSize();
    });
  } catch (error) {
    console.error("Error during Leaflet initialization:", error);
  }
}

function destroyMap() {
  // Clean up the map instance when the modal is closed to prevent errors
  if (map) {
    map.remove();
    map = null;
    userMarker = null;
    routePolyline = null;
  }
}

async function initSummaryMap() {
  if (
    summaryMap ||
    !summaryMapContainer.value ||
    !lastRunSummary.value?.route?.length
  ) {
    return;
  }

  const mapboxAccessToken = MAPBOX_ACCESS_TOKEN;

  try {
    summaryMap = L.map(summaryMapContainer.value);
    L.tileLayer(
      "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token={accessToken}",
      {
        attribution:
          '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        accessToken: mapboxAccessToken,
      }
    ).addTo(summaryMap);

    const routeLatLngs = lastRunSummary.value.route.map((p) => [p.lat, p.lng]);
    const polyline = L.polyline(routeLatLngs, {
      color: "#fbbf24",
      weight: 6.5,
    }).addTo(summaryMap);

    summaryMap.fitBounds(polyline.getBounds().pad(0.1));

    requestAnimationFrame(() => {
      if (summaryMap) summaryMap.invalidateSize();
    });
  } catch (error) {
    console.error("Error during summary map initialization:", error);
  }
}

function destroySummaryMap() {
  // Clean up the summary map instance when its modal is closed
  if (summaryMap) {
    summaryMap.remove();
    summaryMap = null;
    summaryRoutePolyline = null;
  }
}

// --- SHOE METHODS ---
async function fetchUserShoes(userId) {
  const q = query(
    collection(db, "shoes"),
    where("userId", "==", userId),
    orderBy("brandName")
  );
  try {
    const querySnapshot = await getDocs(q);
    userShoes.value = querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (error) {
    console.error("Error fetching user shoes:", error);
  }
}

async function addShoe() {
  const brand = newShoeBrand.value.trim();
  const model = newShoeModel.value.trim();

  // --- VALIDATION START ---
  if (!brand || !model) {
    return presentToast("Please enter both a brand and a model.");
  }
  if (brand.length > 50 || model.length > 50) {
    return presentToast("Brand and model names must be under 50 characters.");
  }
  const sanitizedBrand = validators.sanitizeInput(brand);
  const sanitizedModel = validators.sanitizeInput(model);
  // --- VALIDATION END ---

  try {
    await addDoc(collection(db, "shoes"), {
      userId: user.value.uid,
      brandName: sanitizedBrand,
      modelName: sanitizedModel,
      totalDistance: 0,
      totalTime: 0,
      runCount: 0,
    });
    await fetchUserShoes(user.value.uid);
    isAddShoeModalVisible.value = false;
    newShoeBrand.value = "";
    newShoeModel.value = "";
    await presentToast("Shoe added successfully!", "success");
  } catch (error) {
    console.error("Error adding shoe:", error);
    await presentToast("Could not add shoe. Please try again.", "danger");
  }
}

async function addShoeToPastRun(run, shoeId) {
  if (!run || !shoeId || !user.value) return;

  const runDocRef = doc(db, "runs", run.id);
  const shoeDocRef = doc(db, "shoes", shoeId);

  try {
    const shoeInfo = userShoes.value.find((s) => s.id === shoeId);
    if (!shoeInfo) {
      console.error("Selected shoe not found in local state.");
      return presentToast("Error: Selected shoe could not be found.", "danger");
    }

    // 1. Update the run document to link the shoe
    await updateDoc(runDocRef, {
      shoeId: shoeId,
      shoeName: `${shoeInfo.brandName} ${shoeInfo.modelName}`,
    });

    // 2. Atomically update the shoe's total stats
    await updateDoc(shoeDocRef, {
      totalDistance: increment(run.distance),
      totalTime: increment(run.time),
      runCount: increment(1),
    });

    // 3. Refresh local data to instantly update the UI
    await fetchUserRuns(user.value.uid);
    await fetchUserShoes(user.value.uid);

    await presentToast("Shoe added to your run!", "success");
  } catch (error) {
    console.error("Error adding shoe to past run:", error);
    await presentToast(
      "Failed to add shoe to the run. Please try again.",
      "danger"
    );
  }
}

function openShoeDetailModal(shoe) {
  selectedShoeDetails.value = shoe;
  isShoeDetailModalVisible.value = true;
}

async function updateRunAndShoeStats(runId, runData, shoeId) {
  if (!runId || !runData || !shoeId) return;

  const runDocRef = doc(db, "runs", runId);
  const shoeDocRef = doc(db, "shoes", shoeId);

  try {
    const shoeInfo = userShoes.value.find((s) => s.id === shoeId);
    if (!shoeInfo) {
      console.error("Selected shoe not found in local state.");
      return;
    }

    // 1. Update the run document with shoe information
    await updateDoc(runDocRef, {
      shoeId: shoeId,
      shoeName: `${shoeInfo.brandName} ${shoeInfo.modelName}`,
    });

    // 2. Update the shoe's aggregated stats
    const shoeDoc = await getDoc(shoeDocRef);
    if (shoeDoc.exists()) {
      const currentStats = shoeDoc.data();
      const newStats = {
        totalDistance: (currentStats.totalDistance || 0) + runData.distance,
        totalTime: (currentStats.totalTime || 0) + runData.time,
        runCount: (currentStats.runCount || 0) + 1,
      };
      await updateDoc(shoeDocRef, newStats);
    }

    // 3. Refresh local shoe data to reflect changes immediately on the profile page
    await fetchUserShoes(user.value.uid);

    await presentToast("Run logged to your shoe!", "success");
  } catch (error) {
    console.error("Error updating run and shoe stats:", error);
    await presentToast("Failed to log run to shoe.", "danger");
  }
}

// --- SUMMARY MODAL UPDATE METHODS ---
async function handleSummaryModalDismiss() {
  const runId = lastRunSummary.value?.id;
  const shoeId = selectedShoeForRun.value;
  let description = runSummaryDescription.value.trim();

  // Save shoe info if selected
  if (shoeId && runId) {
    await updateRunAndShoeStats(runId, lastRunSummary.value, shoeId);
  }

  // --- VALIDATION & SANITIZATION for description ---
  if (description) {
    if (description.length > 500) {
      await presentToast("Description must be under 500 characters.");
      // Don't close the modal if validation fails
      return;
    }
    description = validators.sanitizeInput(description);
  }
  // --- END VALIDATION ---

  // Save description if entered
  if (description && runId) {
    try {
      const runDocRef = doc(db, "runs", runId);
      await updateDoc(runDocRef, { description });

      // Update local state for immediate UI feedback
      const runIndex = runHistory.value.findIndex((r) => r.id === runId);
      if (runIndex > -1) {
        runHistory.value[runIndex].description = description;
        // If it's the latest run, update stats which includes the description
        if (runIndex === 0) {
          await updateUserStatsInFirestore();
        }
      }
      await presentToast("Description saved!", "success");
    } catch (error) {
      console.error("Error saving run description:", error);
      await presentToast("Could not save description.", "danger");
    }
  }

  // Reset state and close modal
  isSummaryModalVisible.value = false;
  selectedShoeForRun.value = null;
  runSummaryDescription.value = "";
  destroySummaryMap();
}

// --- WORKOUT METHODS ---
function startWorkout() {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  if (!isTracking.value && navigator.geolocation) {
    isTracking.value = true;
    startTime = Date.now();
    elapsedTime.value = 0;
    currentDistance.value = 0;
    lastPosition = null;
    routeCoordinates.value = [];

    timerInterval = setInterval(() => {
      elapsedTime.value = Math.floor((Date.now() - startTime) / 1000);
    }, 1000);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latlng = [latitude, longitude];

        routeCoordinates.value.push({ lat: latitude, lng: longitude });
        if (lastPosition) {
          const dist = calculateDistance(
            lastPosition.latitude,
            lastPosition.longitude,
            latitude,
            longitude
          );
          currentDistance.value += dist;
        }
        lastPosition = { latitude, longitude };
        currentPace.value =
          currentDistance.value > 0
            ? elapsedTime.value / currentDistance.value
            : 0;

        // --- MAP UPDATE LOGIC ---
        if (map) {
          if (!userMarker) {
            // First time getting location: create marker, polyline, and center map
            userMarker = L.marker(latlng).addTo(map);
            routePolyline = L.polyline([latlng], {
              color: "#fbbf24",
              weight: 6.5,
            }).addTo(map);
            map.setView(latlng, 16); // Zoom in on the user
          } else {
            // Subsequent updates: move marker and extend polyline
            userMarker.setLatLng(latlng);
            routePolyline.addLatLng(latlng);
            map.panTo(latlng); // Smoothly move the map to keep the marker in view
          }
        }
      },
      (error) => {
        alert("Geolocation error: " + error.message);
        stopWorkout();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  } else if (!navigator.geolocation) {
    alert("Geolocation is not supported by this browser.");
  }
}

async function stopWorkout() {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  clearInterval(timerInterval);
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
  }
  isTracking.value = false;
  isLiveTrackingModalVisible.value = false;

  if (currentDistance.value > 0.0) {
    if (!user.value) {
      alert("Please log in to save your workout data.");
      return;
    }
    let weatherData = null;
    if (lastPosition) {
      weatherData = await fetchWeatherForRun(
        lastPosition.latitude,
        lastPosition.longitude
      );
    }
    const workoutTime = elapsedTime.value;
    const newRunData = {
      userId: user.value.uid,
      date: new Date().toISOString(),
      distance: currentDistance.value,
      time: workoutTime,
      pace: currentDistance.value > 0 ? workoutTime / currentDistance.value : 0,
      timestamp: new Date(),
      route: routeCoordinates.value,
      weather: weatherData,
    };
    try {
      const docRef = await addDoc(collection(db, "runs"), newRunData);
      await fetchUserRuns(user.value.uid);
      lastRunSummary.value = { id: docRef.id, ...newRunData };
      isSummaryModalVisible.value = true;
    } catch (error) {
      console.error("Error saving run:", error);
      await presentToast("There was an error saving your run.", "danger");
    }
  }
  currentDistance.value = 0;
  currentPace.value = 0;
  lastPosition = null;
  startTime = null;
}

async function logRun() {
  if (navigator.vibrate) navigator.vibrate(50);
  if (!user.value) return presentToast("Please log in.", "danger");

  // --- VALIDATION START ---
  const dist = parseFloat(distanceInput.value);
  const timeInSeconds =
    (parseInt(hoursInput.value) || 0) * 3600 +
    (parseInt(minutesInput.value) || 0) * 60 +
    (parseInt(secondsInput.value) || 0);
  let description = logRunDescription.value.trim();

  if (isNaN(dist) || dist <= 0 || dist > 200) {
    return presentToast("Please enter a valid distance (0-200 miles).");
  }
  if (isNaN(timeInSeconds) || timeInSeconds <= 0 || timeInSeconds > 86400) {
    return presentToast("Please enter a valid time (up to 24 hours).");
  }
  if (description) {
    if (description.length > 500) {
      return presentToast("Description must be under 500 characters.");
    }
    description = validators.sanitizeInput(description);
  }
  // --- VALIDATION END ---

  const newRunData = {
    userId: user.value.uid,
    date: new Date().toISOString(),
    distance: dist,
    time: timeInSeconds,
    pace: timeInSeconds / dist,
    timestamp: new Date(),
    description: description,
  };
  try {
    const docRef = await addDoc(collection(db, "runs"), newRunData);

    if (selectedShoeForRun.value) {
      await updateRunAndShoeStats(
        docRef.id,
        newRunData,
        selectedShoeForRun.value
      );
    }
    await fetchUserRuns(user.value.uid);

    // Clear inputs on success
    distanceInput.value = null;
    hoursInput.value = null;
    minutesInput.value = null;
    secondsInput.value = null;
    logRunDescription.value = "";
    selectedShoeForRun.value = null;
    isLogRunModalVisible.value = false;
    await presentToast("Run logged successfully!", "success");
  } catch (error) {
    console.error("Error logging run:", error);
    await presentToast("There was an error logging your run.", "danger");
  }
}

async function deleteRun(index) {
  if (navigator.vibrate) navigator.vibrate(50);
  if (!user.value) return;

  const alert = await alertController.create({
    header: "Confirm Deletion",
    cssClass: "custom-alert",
    message:
      "Are you sure you want to delete this run? This action cannot be undone.",
    buttons: [
      { text: "Cancel", role: "cancel" },
      {
        text: "Delete",
        role: "destructive",
        handler: async () => {
          const runToDelete = runHistory.value[index];
          if (runToDelete.id) {
            try {
              // STEP 1: If a shoe is linked, update its stats by subtracting the run's data.
              if (runToDelete.shoeId) {
                const shoeDocRef = doc(db, "shoes", runToDelete.shoeId);
                // Use Firebase's `increment` with negative values to atomically subtract.
                await updateDoc(shoeDocRef, {
                  totalDistance: increment(-runToDelete.distance),
                  totalTime: increment(-runToDelete.time),
                  runCount: increment(-1),
                });
              }

              // STEP 2: Delete the actual run document.
              await deleteDoc(doc(db, "runs", runToDelete.id));

              // STEP 3: Refresh local data to reflect changes in the UI.
              await fetchUserRuns(user.value.uid); // Recalculates user's total stats.
              await fetchUserShoes(user.value.uid); // Refreshes shoe list with updated mileage.

              await presentToast("Run deleted successfully.", "success");
            } catch (error) {
              console.error(
                "Error deleting run and updating shoe stats:",
                error
              );
              await presentToast(
                "Failed to delete run. Please try again.",
                "danger"
              );
            }
          }
        },
      },
    ],
  });

  await alert.present();
}

// Hold To Stop Button Methods

function startHoldStop() {
  if (isHoldingStop.value) return; // Prevent multiple triggers
  isHoldingStop.value = true;
  holdProgress.value = 0;

  const holdDuration = 2000; // 2 seconds
  const intervalDuration = 10; // Update progress smoothly

  // Set a timeout that will trigger the actual stopWorkout function
  holdTimer = setTimeout(() => {
    stopWorkout();
    // Reset the state after the action is complete
    isHoldingStop.value = false;
    holdProgress.value = 0;
    clearInterval(progressInterval);
  }, holdDuration);

  // Set an interval to update the visual progress bar
  progressInterval = setInterval(() => {
    holdProgress.value += intervalDuration / holdDuration;
    if (holdProgress.value >= 1) {
      clearInterval(progressInterval);
    }
  }, intervalDuration);
}

function cancelHoldStop() {
  // If the user lets go before 2 seconds, clear the timers
  clearTimeout(holdTimer);
  clearInterval(progressInterval);
  holdTimer = null;
  progressInterval = null;
  isHoldingStop.value = false;

  // Animate the progress bar back to 0 for a smooth visual effect
  gsap.to(
    { value: holdProgress.value },
    {
      value: 0,
      duration: 0.3,
      onUpdate: function () {
        holdProgress.value = this.targets()[0].value;
      },
    }
  );
}

// --- FIREBASE METHODS --
async function handleSignIn() {
  authMessage.value = "";
  // --- VALIDATION START ---
  if (!validators.isValidEmail(email.value)) {
    return (authMessage.value = "Please enter a valid email address.");
  }
  if (!password.value) {
    return (authMessage.value = "Please enter your password.");
  }
  // --- VALIDATION END ---

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    //window.location.reload();
  } catch (error) {
    authMessage.value = `Error signing in: ${error.message}`;
  }
}

async function handleSignUp() {
  authMessage.value = "";

  // --- VALIDATION START ---
  const sanitizedDisplayName = validators.sanitizeInput(
    displayName.value.trim()
  );

  if (!sanitizedDisplayName || !email.value || !password.value) {
    return (authMessage.value = "Please fill out all fields.");
  }
  if (sanitizedDisplayName.length < 3 || sanitizedDisplayName.length > 20) {
    return (authMessage.value =
      "Username must be between 3 and 20 characters.");
  }
  if (!/^[a-zA-Z0-9_]+$/.test(sanitizedDisplayName)) {
    return (authMessage.value =
      "Username can only contain letters, numbers, and underscores.");
  }
  if (!validators.isValidEmail(email.value)) {
    return (authMessage.value = "Please enter a valid email address.");
  }
  if (!validators.isStrongPassword(password.value)) {
    return (authMessage.value =
      "Password must be at least 8 characters long and contain one letter and one number.");
  }
  // --- VALIDATION END ---

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    );
    const newUser = userCredential.user;
    await setDoc(doc(db, "users", newUser.uid), {
      displayName: sanitizedDisplayName, // Use sanitized version
      displayName_lowercase: sanitizedDisplayName.toLowerCase(),
      email: email.value.toLowerCase(),
    });

    //window.location.reload();
  } catch (error) {
    authMessage.value = `Error signing up: ${error.message}`;
  }
}

async function handleSignOut() {
  cleanupListeners();
  await signOut(auth);
}

async function addFriend() {
  if (!friendUsername.value) {
    return presentToast("Please enter a username.");
  }
  const q = query(
    collection(db, "users"),
    where("displayName_lowercase", "==", friendUsername.value.toLowerCase())
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return presentToast("User not found.", "danger");
  }
  const friendDoc = querySnapshot.docs[0];
  const friendUid = friendDoc.id;
  const friendData = friendDoc.data();
  if (friendUid === user.value.uid) {
    return presentToast("You can't follow yourself.");
  }
  await setDoc(doc(db, `users/${user.value.uid}/friends`, friendUid), {
    displayName: friendData.displayName,
    followedAt: new Date(),
  });

  await presentToast(
    `You are now following ${friendData.displayName}!`,
    "success"
  );

  closeFollowModal();
}

async function unfollowUser(friendToUnfollow) {
  const alert = await alertController.create({
    header: "Unfollow User",
    message: `Are you sure you want to unfollow ${friendToUnfollow.displayName}?`,
    buttons: [
      { text: "Cancel", role: "cancel" },
      {
        text: "Unfollow",
        role: "destructive",
        handler: async () => {
          await deleteDoc(
            doc(db, `users/${user.value.uid}/friends`, friendToUnfollow.uid)
          );
        },
      },
    ],
  });
  await alert.present();
}

async function fetchUserRuns(userId) {
  const q = query(collection(db, "runs"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  runHistory.value = querySnapshot.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp.toDate(),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
  visibleRunsCount.value = 2;
  await recalculateStatsFromHistory();
}

async function updateUserStatsInFirestore() {
  if (!user.value) return;
  try {
    const lastRun = runHistory.value.length > 0 ? runHistory.value[0] : null;
    const userStatsDocRef = doc(db, "userStats", user.value.uid);
    await setDoc(
      userStatsDocRef,
      {
        totalDistance: totalDistance.value,
        totalTime: totalTime.value,
        xp: xp.value,
        lastRun: lastRun
          ? {
              distance: lastRun.distance,
              time: lastRun.time,
              pace: lastRun.pace,
              date: lastRun.date,
              description: lastRun.description || "",
              route: lastRun.route || null,
            }
          : null,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating user stats:", error);
  }
}

async function recalculateStatsFromHistory() {
  const oldTotalDistance = totalDistance.value;
  const oldTotalTime = totalTime.value;
  const oldXp = xp.value;
  let newTotalDistance = 0;
  let newTotalTime = 0;
  if (runHistory.value.length > 0) {
    newTotalDistance = runHistory.value.reduce(
      (acc, run) => acc + run.distance,
      0
    );
    newTotalTime = runHistory.value.reduce((acc, run) => acc + run.time, 0);
  }
  totalDistance.value = newTotalDistance;
  totalTime.value = newTotalTime;
  xp.value = newTotalDistance;
  animateStat("totalDistance", oldTotalDistance, totalDistance.value);
  animateStat("totalTime", oldTotalTime, totalTime.value);
  animateStat("xp", oldXp, xp.value);
  await updateUserStatsInFirestore();
}

function setupSocialListeners() {
  cleanupListeners(); // Clean up old listeners before starting new ones
  if (!user.value) return;

  const q = query(collection(db, `users/${user.value.uid}/friends`));
  const mainUnsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const friendUid = change.doc.id;
      const friendData = change.doc.data();

      if (change.type === "added") {
        const statsDocRef = doc(db, "userStats", friendUid);
        // Add the stats listener's unsubscribe function to our array
        const statsUnsubscribe = onSnapshot(statsDocRef, (statsDoc) => {
          const statsData = statsDoc.data() || {
            totalDistance: 0,
            totalTime: 0,
            xp: 0,
            lastRun: null,
          };
          const existingFriendIndex = friends.value.findIndex(
            (f) => f.uid === friendUid
          );
          if (existingFriendIndex > -1) {
            friends.value[existingFriendIndex].stats = statsData;
          } else {
            friends.value.push({
              uid: friendUid,
              displayName: friendData.displayName,
              stats: statsData,
            });
          }
        });
        activeListeners.push(statsUnsubscribe); // Track it!

        const userDocRef = doc(db, "users", friendUid);
        // Add the user data listener's unsubscribe function to our array
        const userUnsubscribe = onSnapshot(userDocRef, (userDoc) => {
          const userData = userDoc.data();
          const existingFriendIndex = friends.value.findIndex(
            (f) => f.uid === friendUid
          );
          if (existingFriendIndex > -1) {
            friends.value[existingFriendIndex].photoURL = userData.photoURL;
          }
        });
        activeListeners.push(userUnsubscribe); // Track it!
      }

      if (change.type === "removed") {
        friends.value = friends.value.filter((f) => f.uid !== friendUid);
        // Note: For a more robust solution, you'd also want to find and
        // remove the specific listeners for the unfollowed user.
        // But for the logout bug, the global cleanup is sufficient.
      }
    });
  });

  // Also track the main listener itself
  activeListeners.push(mainUnsubscribe);
}

function triggerFileUpload() {
  fileInput.value.click();
}

async function handlePictureUpload(event) {
  const file = event.target.files[0];
  if (!file || !user.value) return;

  // --- VALIDATION START ---
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return presentToast("Invalid file type. Please upload a JPG, PNG, or GIF.");
  }
  const maxSizeInMB = 5;
  if (file.size > maxSizeInMB * 1024 * 1024) {
    return presentToast(`File is too large. Maximum size is ${maxSizeInMB}MB.`);
  }
  // --- VALIDATION END ---

  const filePath = `profile-pictures/${user.value.uid}`;
  const fileRef = storageRef(storage, filePath);

  try {
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    await setDoc(
      doc(db, "users", user.value.uid),
      { photoURL: url },
      { merge: true }
    );
    photoURL.value = url;
    await presentToast("Profile picture updated!", "success");
  } catch (error) {
    console.error("Error uploading picture:", error);
    await presentToast("Failed to upload picture.", "danger");
  }
}

async function updateUsername() {
  const newName = newDisplayName.value.trim();
  // --- VALIDATION START ---
  if (!newName) return;
  if (newName === displayName.value) return;
  if (newName.length < 3 || newName.length > 20) {
    return presentToast("Username must be between 3 and 20 characters.");
  }
  if (!/^[a-zA-Z0-9_]+$/.test(newName)) {
    return presentToast(
      "Username can only contain letters, numbers, and underscores."
    );
  }
  const sanitizedName = validators.sanitizeInput(newName);
  // --- VALIDATION END ---

  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("displayName_lowercase", "==", sanitizedName.toLowerCase())
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return presentToast(
      "This username is already taken. Please choose another."
    );
  }

  try {
    const userDocRef = doc(db, "users", user.value.uid);
    await setDoc(
      userDocRef,
      {
        displayName: sanitizedName,
        displayName_lowercase: sanitizedName.toLowerCase(),
      },
      { merge: true }
    );

    displayName.value = sanitizedName;
    newDisplayName.value = "";
    isEditProfileModalVisible.value = false;
    await presentToast("Username updated successfully!", "success");
  } catch (error) {
    console.error("Error updating username:", error);
    await presentToast("Failed to update username.", "danger");
  }
}

async function handleGoogleSignIn() {
  authMessage.value = "";
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        displayName: user.displayName,
        displayName_lowercase: user.displayName.toLowerCase(),
        email: user.email.toLowerCase(),
        photoURL: user.photoURL,
      });
    }

    // The onAuthStateChanged listener will now handle the UI update automatically.
    // We do NOT need to reload the page here.
  } catch (error) {
    // Add specific checks for common popup errors
    if (error.code === "auth/popup-blocked") {
      authMessage.value =
        "Popup was blocked by the browser. Please allow popups for this site.";
      await presentToast(
        "Popup was blocked by the browser. Please allow popups.",
        "danger"
      );
    } else if (error.code === "auth/popup-closed-by-user") {
      authMessage.value = "Sign-in window was closed before completing.";
      await presentToast("Sign-in cancelled.", "warning");
    } else {
      console.error("Google Sign-In Error:", error);
      authMessage.value = `Error with Google Sign-In: ${error.message}`;
    }
  }
}

// --- Scroll handler for 3D card effect ---
let scrollEl = null;
const handleScroll = () => {
  requestAnimationFrame(() => {
    const cards = document.querySelectorAll(".styled-card");
    const viewportHeight = window.innerHeight;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenterY = rect.top + rect.height / 2;
      const distanceFromCenter = cardCenterY - viewportHeight / 2;
      const rotation = distanceFromCenter / 40;

      card.style.transform = `perspective(800px) rotateX(${rotation}deg)`;
    });
  });
};

// --- LIFECYCLE HOOKS ---
onMounted(() => {
  onAuthStateChanged(auth, async (authUser) => {
    if (authUser) {
      // --- THE FIX ---
      // 1. Close the modal IMMEDIATELY for instant UI feedback.
      closeAuthModal(); // <--- ADD THIS LINE
      isLoading.value = true; // Show the main loading overlay.

      try {
        // 2. Set the user state and fetch all data in the background.
        user.value = authUser;
        const userDoc = await getDoc(doc(db, "users", authUser.uid));
        if (userDoc.exists()) {
          displayName.value = userDoc.data().displayName;
          photoURL.value = userDoc.data().photoURL;
        }

        // Fetch primary data
        await fetchUserRuns(authUser.uid);
        await fetchUserShoes(authUser.uid);

        // Setup listeners and UI effects
        await setupSocialListeners();
        await nextTick();
        if (contentRef.value) {
          scrollEl = await contentRef.value.$el.getScrollElement();
          scrollEl.addEventListener("scroll", handleScroll);
        }
      } catch (error) {
        console.error("Failed to load user data after login:", error);
        await presentToast(
          "There was an error loading your profile.",
          "danger"
        );
      } finally {
        // 3. ALWAYS turn off the loading screen when all operations are complete.
        isLoading.value = false;
      }
    } else {
      // This is the sign-out logic, it remains mostly the same.
      isLoading.value = true;
      user.value = null;
      displayName.value = "";
      photoURL.value = null;
      runHistory.value = [];
      friends.value = [];
      userShoes.value = [];
      recalculateStatsFromHistory();
      cleanupListeners(); // This is from our previous fix
      if (scrollEl) {
        scrollEl.removeEventListener("scroll", handleScroll);
        scrollEl = null;
      }
      openAuthModal();
      isLoading.value = false;
    }
  });
});

onUnmounted(() => {
  if (scrollEl) {
    scrollEl.removeEventListener("scroll", handleScroll);
  }
});
</script>

<template>
  <ion-app>
    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <img src="/icons/boot.svg" alt="RunItUp Logo" class="loading-logo" />
        <p>Loading your stats...</p>
        <ion-spinner name="crescent"></ion-spinner>
      </div>
    </div>

    <!-- Main Content -->
    <template v-if="!isLoading">
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title>RunItUp</ion-title>
          <ion-buttons slot="end">
            <ion-button
              v-if="currentPage === 'profile'"
              @click="openSettingsMenu"
            >
              <ion-icon slot="icon-only" :icon="settingsOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content :fullscreen="true" ref="contentRef">
        <img
          v-if="photoURL && currentPage === 'home'"
          :src="photoURL"
          class="page-avatar"
        />
        <div v-if="user" class="ion-text-center ion-margin-bottom">
          <img
            src="/icons/boot.svg"
            alt="RunItUp Logo"
            style="width: 100px; height: auto; margin: auto"
          />
          <p class="ion-margin-top welcome-text">Hello, {{ displayName }}!</p>
        </div>

        <!-- Dynamically render the current page component -->
        <Transition name="fade" mode="out-in">
          <div :key="currentPage">
            <HomePage
              v-if="currentPage === 'home'"
              :animatedTotalDistance="animatedTotalDistance"
              :animatedTotalTime="animatedTotalTime"
              :animatedXp="animatedXp"
              :currentLevel="currentLevel"
              :progress="progress"
              :formatTime="formatTime"
              :weeklyChartData="weeklyChartData"
              :weeklyTotalDistance="weeklyTotalDistance"
              :currentWeekStart="currentWeekStart"
              :currentWeekEnd="currentWeekEnd"
              :currentWeekOffset="currentWeekOffset"
              @open-run-action-sheet="openRunActionSheet"
              @go-to-previous-week="goToPreviousWeek"
              @go-to-next-week="goToNextWeek"
            />

            <SocialPage
              v-if="currentPage === 'social'"
              :friends="friends"
              :sortedFriends="sortedFriends"
              :formatTime="formatTime"
              :getLevelForXp="getLevelForXp"
              :getProgressForXp="getProgressForXp"
              :setMapRef="setMapRef"
              @open-follow-modal="openFollowModal"
              @open-user-profile-modal="openUserProfileModal"
              @unfollow-user="unfollowUser"
            />

            <ProfilePage
              v-if="currentPage === 'profile'"
              :displayName="displayName"
              :photoURL="photoURL"
              :currentLevel="currentLevel"
              :xp="xp"
              :progress="progress"
              :totalDistance="totalDistance"
              :totalTime="totalTime"
              :formatTime="formatTime"
              :userShoes="userShoes"
              :displayedRuns="displayedRuns"
              :runHistory="runHistory"
              :visibleRunsCount="visibleRunsCount"
              :setMapRef="setMapRef"
              @open-shoe-detail-modal="openShoeDetailModal"
              @open-add-shoe-modal="isAddShoeModalVisible = true"
              @delete-run="deleteRun"
              @add-shoe-to-past-run="addShoeToPastRun"
              @show-more-runs="showMoreRuns"
            />
          </div>
        </Transition>

        <!-- Footer Tabs -->
        <div v-if="user" class="footer-tabs">
          <button
            @click="currentPage = 'home'"
            :class="{ active: currentPage === 'home' }"
          >
            <ion-icon :icon="home"></ion-icon>
            <ion-label>Home</ion-label>
          </button>
          <button
            @click="currentPage = 'social'"
            :class="{ active: currentPage === 'social' }"
          >
            <ion-icon :icon="people"></ion-icon>
            <ion-label>Social</ion-label>
          </button>
          <button
            @click="currentPage = 'profile'"
            :class="{ active: currentPage === 'profile' }"
          >
            <ion-icon :icon="personCircle"></ion-icon>
            <ion-label>Profile</ion-label>
          </button>
        </div>
      </ion-content>

      <!-- ALL MODALS REMAIN IN THE PARENT App.vue COMPONENT -->
    </template>
    <ion-modal
      :is-open="isAuthModalVisible"
      :backdrop-dismiss="false"
      class="auth-modal"
    >
      <ion-content class="ion-padding">
        <ion-card class="styled-card auth-card">
          <ion-card-header class="auth-card-header">
            <img src="/icons/boot.svg" alt="RunItUp Logo" class="auth-logo" />
            <ion-card-title>{{
              authView === "signin" ? "Welcome Back" : "Create Account"
            }}</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <ion-item
              v-if="authView === 'signup'"
              lines="none"
              class="input-with-icon"
            >
              <ion-icon :icon="personOutline" slot="start"></ion-icon>
              <ion-input
                placeholder="Username"
                v-model="displayName"
              ></ion-input>
            </ion-item>

            <ion-item lines="none" class="input-with-icon">
              <ion-icon :icon="mailOutline" slot="start"></ion-icon>
              <ion-input
                placeholder="Email"
                type="email"
                v-model="email"
              ></ion-input>
            </ion-item>

            <ion-item lines="none" class="input-with-icon">
              <ion-icon :icon="lockClosedOutline" slot="start"></ion-icon>
              <ion-input
                placeholder="Password"
                type="password"
                v-model="password"
              ></ion-input>
            </ion-item>

            <p
              v-if="authMessage"
              class="ion-text-center ion-padding-horizontal"
              style="color: var(--ion-color-warning); font-size: 0.9rem"
            >
              {{ authMessage }}
            </p>

            <ion-button
              expand="block"
              @click="authView === 'signin' ? handleSignIn() : handleSignUp()"
              class="ion-margin-top yellow-button"
            >
              {{ authView === "signin" ? "Sign In" : "Create Account" }}
            </ion-button>

            <div class="auth-separator">
              <span>OR</span>
            </div>

            <ion-button
              expand="block"
              @click="handleGoogleSignIn"
              color="light"
              class="ion-margin-top"
            >
              <ion-icon slot="start" src="/assets/google-icon.svg"></ion-icon>
              Sign In with Google
            </ion-button>

            <div class="auth-toggle">
              <p v-if="authView === 'signin'">
                Don't have an account?
                <a @click="authView = 'signup'">Sign Up</a>
              </p>
              <p v-else>
                Already have an account?
                <a @click="authView = 'signin'">Sign In</a>
              </p>
            </div>
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>

    <!-- Follow User Modal -->
    <ion-modal
      :is-open="isFollowModalVisible"
      @didDismiss="closeFollowModal()"
      class="auth-modal"
    >
      <ion-content class="ion-padding">
        <ion-card class="styled-card auth-card">
          <ion-card-header class="auth-card-header">
            <ion-button
              fill="clear"
              @click="closeFollowModal()"
              class="modal-close-button"
            >
              <ion-icon slot="icon-only" :icon="closeCircle"></ion-icon>
            </ion-button>
            <ion-card-title>Follow a User</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <ion-item lines="none" class="input-with-icon">
              <ion-icon :icon="personOutline" slot="start"></ion-icon>
              <ion-input
                placeholder="Enter username to follow"
                v-model="friendUsername"
              ></ion-input>
            </ion-item>

            <ion-button
              expand="block"
              @click="addFriend"
              class="ion-margin-top yellow-button"
            >
              Follow
            </ion-button>
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>

    <!-- User Profile Summary Modal -->
    <ion-modal
      :is-open="isUserProfileModalVisible"
      @didDismiss="isUserProfileModalVisible = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title v-if="selectedFriendProfile"
            >{{ selectedFriendProfile.displayName }}'s Profile</ion-title
          >
          <ion-buttons slot="end">
            <ion-button @click="isUserProfileModalVisible = false">
              <ion-icon slot="icon-only" :icon="closeCircle"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding" v-if="selectedFriendProfile">
        <!-- Profile Stats Card -->
        <ion-card class="styled-card profile-stats-card">
          <ion-card-content>
            <div class="profile-header">
              <img
                :src="selectedFriendProfile.photoURL || '/default-avatar.png'"
                class="profile-picture-main"
              />
              <div class="profile-info">
                <h2 class="profile-display-name">
                  {{ selectedFriendProfile.displayName }}
                </h2>
                <div class="profile-level" v-if="selectedFriendProfile.stats">
                  <span class="level-icon">{{
                    getLevelForXp(selectedFriendProfile.stats.xp).emoji
                  }}</span>
                  <span
                    >{{ getLevelForXp(selectedFriendProfile.stats.xp).name }}
                    -
                    {{ Math.floor(selectedFriendProfile.stats.xp) }} XP</span
                  >
                </div>
              </div>
            </div>
            <ion-progress-bar
              v-if="selectedFriendProfile.stats"
              :value="getProgressForXp(selectedFriendProfile.stats.xp)"
              color="warning"
              class="ion-margin-vertical"
            ></ion-progress-bar>
            <div
              class="profile-lifetime-stats"
              v-if="selectedFriendProfile.stats"
            >
              <div class="stat-block">
                <p class="stat-title">Total Distance</p>
                <p class="stat-value">
                  {{ selectedFriendProfile.stats.totalDistance.toFixed(2) }}
                  mi
                </p>
              </div>
              <div class="stat-block">
                <p class="stat-title">Total Time</p>
                <p class="stat-value">
                  {{ formatTime(selectedFriendProfile.stats.totalTime, true) }}
                </p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Recent Runs -->
        <ion-card class="styled-card">
          <ion-card-header>
            <ion-card-title>Recent Runs</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div v-if="isFetchingFriendRuns" class="ion-text-center">
              <ion-spinner></ion-spinner>
              <p>Loading runs...</p>
            </div>
            <ion-list
              lines="none"
              v-else-if="
                selectedFriendProfile.runs &&
                selectedFriendProfile.runs.length > 0
              "
            >
              <div
                v-for="run in selectedFriendProfile.runs"
                :key="run.id"
                class="run-history-item"
              >
                <div class="run-history-header">
                  <h2>{{ new Date(run.date).toLocaleDateString() }}</h2>
                </div>
                <p v-if="run.description" class="run-description">
                  "{{ run.description }}"
                </p>
                <div class="run-history-stats">
                  <div>
                    <p class="stat-label">Distance</p>
                    <p class="stat-value small">
                      {{ run.distance.toFixed(2) }}
                      <span class="stat-unit">mi</span>
                    </p>
                  </div>
                  <div>
                    <p class="stat-label">Time</p>
                    <p class="stat-value small">
                      {{ formatTime(run.time, true) }}
                    </p>
                  </div>
                  <div>
                    <p class="stat-label">Avg Pace</p>
                    <p class="stat-value small">{{ formatTime(run.pace) }}</p>
                  </div>
                </div>
              </div>
            </ion-list>
            <p v-else class="ion-text-center no-data-text">
              This user has no logged runs yet.
            </p>
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>

    <!-- Run Summary Modal -->
    <ion-modal
      :is-open="isSummaryModalVisible"
      @didDismiss="handleSummaryModalDismiss"
      class="summary-modal"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Run Complete!</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            @click="isSummaryModalVisible = false"
          >
            <ion-icon :icon="closeCircle"></ion-icon>
          </ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-card class="styled-card" v-if="lastRunSummary">
          <!-- Map Summary -->
          <div
            id="summary-map"
            ref="summaryMapContainer"
            v-if="lastRunSummary.route && lastRunSummary.route.length > 0"
          ></div>
          <ion-card-header>
            <img
              src="/icons/boot.svg"
              alt="RunItUp Logo"
              class="summary-logo-icon"
            />
            <ion-card-title class="summary-title"
              >Great Work, {{ displayName }}!</ion-card-title
            >
          </ion-card-header>
          <ion-card-content>
            <div v-if="lastRunSummary.weather" class="weather-summary">
              <ion-icon
                :icon="getWeatherIcon(lastRunSummary.weather.description)"
                class="weather-icon"
              ></ion-icon>

              <span class="weather-temp"
                >{{ Math.round(lastRunSummary.weather.temp) }}&deg;F</span
              >
            </div>
            <ion-grid class="summary-stats-grid">
              <ion-row>
                <ion-col size="6" class="summary-stat-item">
                  <ion-icon :icon="rocket" color="primary"></ion-icon>
                  <p class="stat-label">Distance</p>
                  <p class="stat-value">
                    {{ lastRunSummary.distance.toFixed(2) }}
                    <span class="stat-unit">mi</span>
                  </p>
                </ion-col>
                <ion-col size="6" class="summary-stat-item">
                  <ion-icon :icon="timeOutline" color="primary"></ion-icon>
                  <p class="stat-label">Time</p>
                  <p class="stat-value">
                    {{ formatTime(lastRunSummary.time, true) }}
                  </p>
                </ion-col>
              </ion-row>
              <ion-row>
                <ion-col size="6" class="summary-stat-item">
                  <ion-icon :icon="speedometer" color="primary"></ion-icon>
                  <p class="stat-label">Avg. Pace</p>
                  <p class="stat-value">
                    {{ formatTime(lastRunSummary.pace) }}
                    <span class="stat-unit">/mi</span>
                  </p>
                </ion-col>
                <ion-col size="6" class="summary-stat-item">
                  <ion-icon :icon="statsChart" color="primary"></ion-icon>
                  <p class="stat-label">XP Gained</p>
                  <p class="stat-value">{{ lastRunXp }}</p>
                </ion-col>
              </ion-row>
            </ion-grid>
            <!-- Run Description Input -->
            <ion-item lines="none" class="input-with-icon ion-margin-top">
              <ion-input
                label="Description"
                label-placement="floating"
                placeholder="(Optional)"
                v-model="runSummaryDescription"
              ></ion-input>
            </ion-item>
            <!-- Shoe Selector Dropdown -->
            <ion-item
              lines="none"
              class="input-with-icon ion-margin-top"
              v-if="userShoes.length > 0"
            >
              <ion-label>Shoe Worn</ion-label>
              <ion-select
                placeholder="Select Shoe"
                v-model="selectedShoeForRun"
              >
                <ion-select-option
                  v-for="shoe in userShoes"
                  :key="shoe.id"
                  :value="shoe.id"
                >
                  {{ shoe.brandName }} {{ shoe.modelName }}
                </ion-select-option>
              </ion-select>
            </ion-item>
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>

    <!-- Live Tracking Modal -->
    <ion-modal
      :is-open="isLiveTrackingModalVisible"
      @ionModalDidDismiss="destroyMap"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Live Run</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            @click="isLiveTrackingModalVisible = false"
          >
            <ion-icon :icon="closeCircle"></ion-icon>
          </ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-card class="styled-card">
          <ion-card-header>
            <ion-card-title>Track a Run</ion-card-title>
          </ion-card-header>
          <div id="map" ref="mapContainer"></div>
          <ion-card-content>
            <ion-button
              v-if="!isTracking"
              expand="block"
              @click="startWorkout"
              class="yellow-button"
              >Start Tracking</ion-button
            >
            <div v-if="isTracking">
              <div class="tracking-stats">
                <div>
                  <p class="tracking-label">DISTANCE</p>
                  <p class="tracking-value">
                    {{ currentDistance.toFixed(2) }} mi
                  </p>
                </div>
                <div>
                  <p class="tracking-label">PACE</p>
                  <p class="tracking-value">
                    {{ formatTime(currentPace) }}
                  </p>
                </div>
                <div>
                  <p class="tracking-label">TIME</p>
                  <p class="tracking-value">
                    {{ formatTime(elapsedTime) }}
                  </p>
                </div>
              </div>
              <!-- Hold to Stop Button -->
              <div
                class="hold-to-stop-button ion-margin-top"
                @mousedown="startHoldStop"
                @mouseup="cancelHoldStop"
                @mouseleave="cancelHoldStop"
                @touchstart.prevent="startHoldStop"
                @touchend="cancelHoldStop"
              >
                <div
                  class="hold-progress"
                  :style="{ transform: `scaleX(${holdProgress})` }"
                ></div>
                <span class="hold-text">HOLD TO STOP</span>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>

    <!-- Log Run Modal -->
    <ion-modal :is-open="isLogRunModalVisible">
      <ion-header>
        <ion-toolbar>
          <ion-title>Log a Past Run</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            @click="isLogRunModalVisible = false"
          >
            <ion-icon :icon="closeCircle"></ion-icon>
          </ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-card class="styled-card">
          <ion-card-header>
            <ion-card-title>Log a Run</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="input-group">
              <ion-input
                class="styled-input"
                placeholder="Distance (miles)"
                type="number"
                v-model="distanceInput"
              ></ion-input>
              <div style="display: flex; gap: 8px" class="ion-margin-top">
                <ion-input
                  class="styled-input"
                  placeholder="Hours"
                  type="number"
                  v-model="hoursInput"
                ></ion-input>
                <ion-input
                  class="styled-input"
                  placeholder="Minutes"
                  type="number"
                  v-model="minutesInput"
                ></ion-input>
                <ion-input
                  class="styled-input"
                  placeholder="Seconds"
                  type="number"
                  v-model="secondsInput"
                ></ion-input>
              </div>
            </div>
            <!-- Run Description Input -->
            <ion-item lines="none" class="input-with-icon ion-margin-top">
              <ion-input
                label="Description"
                label-placement="floating"
                placeholder="(Optional)"
                v-model="logRunDescription"
              ></ion-input>
            </ion-item>
            <!-- Shoe Selector Dropdown -->
            <ion-item
              lines="none"
              class="input-with-icon ion-margin-top"
              v-if="userShoes.length > 0"
            >
              <ion-label>Shoe Worn (Optional)</ion-label>
              <ion-select
                placeholder="Select Shoe"
                v-model="selectedShoeForRun"
              >
                <ion-select-option
                  v-for="shoe in userShoes"
                  :key="shoe.id"
                  :value="shoe.id"
                >
                  {{ shoe.brandName }} {{ shoe.modelName }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-button
              expand="block"
              @click="logRun"
              class="ion-margin-top yellow-button"
              >Log Run</ion-button
            >
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>
    <!-- Profile Settings Dropdown -->
    <ion-modal :is-open="isEditProfileModalVisible">
      <ion-header>
        <ion-toolbar>
          <ion-title>Edit Profile</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isEditProfileModalVisible = false">
              <ion-icon slot="icon-only" :icon="closeCircle"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-card class="styled-card">
          <ion-card-content>
            <ion-list>
              <ion-item lines="none">
                <ion-button
                  expand="block"
                  fill="outline"
                  @click="triggerFileUpload"
                  class="full-width-button"
                >
                  Change Profile Picture
                </ion-button>
                <input
                  type="file"
                  @change="handlePictureUpload"
                  ref="fileInput"
                  style="display: none"
                  accept="image/*"
                />
              </ion-item>
              <ion-item lines="none">
                <ion-input
                  class="styled-input"
                  placeholder="Enter new username"
                  v-model="newDisplayName"
                ></ion-input>
              </ion-item>
              <ion-item lines="none">
                <ion-button
                  expand="block"
                  @click="updateUsername"
                  color="primary"
                  class="full-width-button"
                >
                  Save Username
                </ion-button>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>

    <!-- Add Shoe Modal -->
    <ion-modal :is-open="isAddShoeModalVisible">
      <ion-header>
        <ion-toolbar>
          <ion-title>Add a New Shoe</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isAddShoeModalVisible = false">
              <ion-icon slot="icon-only" :icon="closeCircle"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-card class="styled-card">
          <ion-card-content>
            <ion-item lines="none" class="input-with-icon">
              <ion-input
                label="Brand Name"
                label-placement="floating"
                placeholder="e.g., Hoka"
                v-model="newShoeBrand"
              ></ion-input>
            </ion-item>
            <ion-item lines="none" class="input-with-icon">
              <ion-input
                label="Model Name"
                label-placement="floating"
                placeholder="e.g., Clifton 9"
                v-model="newShoeModel"
              ></ion-input>
            </ion-item>
            <ion-button
              expand="block"
              @click="addShoe"
              class="ion-margin-top yellow-button"
              >Save Shoe</ion-button
            >
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>

    <!-- Shoe Detail Modal -->
    <ion-modal
      :is-open="isShoeDetailModalVisible"
      @didDismiss="isShoeDetailModalVisible = false"
      class="summary-modal"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Shoe Details</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            @click="isShoeDetailModalVisible = false"
          >
            <ion-icon :icon="closeCircle"></ion-icon>
          </ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-card class="styled-card" v-if="selectedShoeDetails">
          <ion-card-header>
            <ion-card-title class="summary-title">
              {{ selectedShoeDetails.brandName }}
            </ion-card-title>
            <p class="ion-text-center">{{ selectedShoeDetails.modelName }}</p>
          </ion-card-header>
          <ion-card-content>
            <ion-grid class="summary-stats-grid">
              <ion-row>
                <ion-col size="6" class="summary-stat-item">
                  <ion-icon :icon="rocket" color="primary"></ion-icon>
                  <p class="stat-label">Total Distance</p>
                  <p class="stat-value">
                    {{ selectedShoeDetails.totalDistance.toFixed(2) }}
                    <span class="stat-unit">mi</span>
                  </p>
                </ion-col>
                <ion-col size="6" class="summary-stat-item">
                  <ion-icon :icon="timeOutline" color="primary"></ion-icon>
                  <p class="stat-label">Total Time</p>
                  <p class="stat-value">
                    {{ formatTime(selectedShoeDetails.totalTime, true) }}
                  </p>
                </ion-col>
              </ion-row>
              <ion-row>
                <ion-col size="6" class="summary-stat-item">
                  <ion-icon :icon="speedometer" color="primary"></ion-icon>
                  <p class="stat-label">Avg. Pace</p>
                  <p class="stat-value">
                    {{ formatTime(averagePaceInSelectedShoe) }}
                    <span class="stat-unit">/mi</span>
                  </p>
                </ion-col>
                <ion-col size="6" class="summary-stat-item">
                  <ion-icon :icon="footsteps" color="primary"></ion-icon>
                  <p class="stat-label">Total Runs</p>
                  <p class="stat-value">{{ selectedShoeDetails.runCount }}</p>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-modal>
  </ion-app>
</template>

<style>
/* This style block is NOT scoped to affect the entire app background */
@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>

<style scoped>
/* --- 3D Glassmorphism & Global Styles --- */
ion-header.ion-no-border ion-toolbar {
  --background: transparent;
}

ion-content {
  --background: none;
  background: linear-gradient(-45deg, #1e3a8a, #0c1a4b, #2a4a9c, #1a2a6c);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite;
}

/* This global selector targets all child components */
:deep(.styled-card) {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0)
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  transition: transform 0.3s ease;
  margin-bottom: 1.5rem;
}

:deep(.yellow-button) {
  --background: #fbbf24;
  --background-activated: #f59e0b;
  --color: #1a202c;
  --box-shadow: 0 4px 15px -5px rgba(251, 191, 36, 0.6);
  --border-radius: 12px;
  font-weight: 700;
  transform: translateY(0);
  transition: transform 0.2s, box-shadow 0.2s;
}

:deep(.yellow-button:active) {
  transform: translateY(2px);
  --box-shadow: 0 2px 10px -5px rgba(251, 191, 36, 0.8);
}
:deep(.stat-label) {
  color: #d1d5db;
  font-size: 0.8rem;
  text-transform: uppercase;
  margin: 0;
}
:deep(.stat-value) {
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.1;
  margin: 4px 0 0 0;
}
:deep(.stat-unit) {
  font-size: 1.25rem;
  font-weight: 400;
  color: #d1d5db;
}
:deep(.stat-value.small) {
  font-size: clamp(1.2rem, 3.5vw, 1.5rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:deep(.run-history-stats) {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  text-align: center;
  margin-top: 1rem;
}
:deep(.run-description) {
  font-style: italic;
  color: #f0f0f0;
  padding: 10px 14px;
  margin: 10px 0 4px 0;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  border-radius: 8px;
  border-left: 3px solid #fbbf24;
}
:deep(.run-card-map) {
  height: 150px;
  width: 100%;
  border-radius: 12px;
  margin-bottom: 1rem;
  background-color: #3a4b7a;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
:deep(.section-title) {
  font-size: 0.8rem;
  font-weight: 600;
  color: #d1d5db;
  text-transform: uppercase;
  margin-top: 0;
  margin-bottom: 0.25rem;
  text-align: center;
}

:deep(.styled-card ion-card-title) {
  color: #ffffff !important; /* Use !important to ensure this rule wins */
  font-weight: 600; /* Let's make it a bit bolder too */
}
:deep(.no-data-text) {
  font-style: italic;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

/* Shared Level/XP Styles */
:deep(.level-display) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fbbf24;
}
:deep(.level-emoji) {
  font-size: 1.5rem;
}
:deep(.xp-text) {
  font-size: 0.8rem;
  color: #d1d5db;
  text-align: right;
  margin-top: 0.5rem;
}
/* Add these new styles inside the <style scoped> tag in src/App.vue */

/* Run Summary Modal Styles */
.summary-logo-icon {
  width: 60px;
  height: auto;
  margin: 0 auto 0.5rem;
  display: block;
}

.summary-title {
  text-align: center;
  font-size: 1.8rem;
  margin-bottom: 1rem;
}

.summary-stats-grid {
  margin-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
}

.summary-stat-item {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.summary-stat-item ion-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.weather-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 16px;
  width: fit-content;
  margin: 0 auto 1.5rem auto;
}

.weather-icon {
  font-size: 1.8rem;
  color: #fbbf24; /* Yellow to match theme */
}

.weather-temp {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
}

/* Log a Past Run Modal Styles */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.styled-input {
  --background: rgba(255, 255, 255, 0.1);
  --padding-start: 12px;
  --placeholder-color: #d1d5db;
  --color: #ffffff;
  border-radius: 8px;
}

.full-width-button {
  width: 100%;
}

/* Auth Modal Specific Styles (Shared with other modals) */
.auth-card {
  --padding-start: 1rem;
  --padding-end: 1rem;
  --padding-top: 1.5rem;
  --padding-bottom: 1.5rem;
  max-width: 400px;
  margin: auto;
}

.auth-card-header {
  text-align: center;
  padding-bottom: 1rem;
}

.auth-logo {
  width: 80px;
  height: auto;
  margin: 0 auto 1rem;
}

.input-with-icon {
  --background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 1rem;
  --padding-start: 12px;
}

.input-with-icon ion-icon {
  margin-right: 8px;
  color: #d1d5db;
}

.auth-separator {
  display: flex;
  align-items: center;
  text-align: center;
  color: #d1d5db;
  margin: 1.5rem 0;
}

.auth-separator::before,
.auth-separator::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.auth-separator:not(:empty)::before {
  margin-right: 0.5em;
}

.auth-separator:not(:empty)::after {
  margin-left: 0.5em;
}

.auth-toggle {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: #d1d5db;
}

.auth-toggle a {
  color: #fbbf24;
  font-weight: 600;
  cursor: pointer;
}

.modal-close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 1.8rem;
}
:deep(.profile-header) {
  display: flex;
  align-items: center;
  gap: 1rem;
}
:deep(.profile-picture-main) {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--ion-color-primary);
  flex-shrink: 0; /* Prevents the image from shrinking */
}
:deep(.profile-info) {
  flex-grow: 1;
}
:deep(.profile-display-name) {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  color: #fff;
}
:deep(.profile-level) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: #fbbf24;
  margin-top: 4px;
}
:deep(.profile-lifetime-stats) {
  display: flex;
  justify-content: space-around;
  text-align: center;
  margin-top: 1rem;
}
:deep(.run-history-item) {
  padding-top: 1rem;
  padding-bottom: 1rem;
  /* This border is key to separating the runs */
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
}
:deep(.run-history-item:last-child) {
  border-bottom: none;
}
:deep(.run-history-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
:deep(.run-history-item h2) {
  font-weight: 600;
  color: #fbbf24;
  margin: 0;
  font-size: 1.1rem;
}

:deep(.styled-card ion-list) {
  --ion-background-color: transparent;
  background: transparent; /* Fallback for older browsers */
  padding: 0; /* Remove default list padding */
}
/* Footer & Navigation */
.footer-tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 75px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: env(safe-area-inset-bottom);
}
.footer-tabs button {
  background: none;
  border: none;
  color: #bbb;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  transition: color 0.2s;
  position: relative;
}
.footer-tabs button.active {
  color: #fbbf24;
  text-shadow: 0 0 10px #fbbf24;
}
.footer-tabs button.active ion-icon {
  animation: bounce 0.5s;
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
.footer-tabs ion-icon {
  font-size: 26px;
  margin-bottom: 2px;
}
ion-content {
  --padding-bottom: 80px;
}
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Other Global Styles */
.welcome-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
}
.page-avatar {
  position: absolute;
  top: 65px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--ion-color-primary);
  z-index: 10;
  object-fit: cover;
}
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--ion-background-color);
  z-index: 9999;
  flex-direction: column;
}
.loading-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-family: "Orbitron", sans-serif;
}
.loading-content p {
  color: var(--ion-text-color);
  font-size: 1.2rem;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}
.loading-logo {
  width: 120px;
  height: auto;
  animation: pulse 2s infinite ease-in-out;
}
ion-spinner {
  width: 50px;
  height: 50px;
  color: var(--ion-color-primary);
}
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.85;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Modal Styles */
.auth-modal,
.summary-modal {
  --background: transparent;
}
.auth-modal ion-content,
.summary-modal ion-content {
  --background: transparent;
}
#map,
#summary-map {
  height: 250px;
  width: auto;
  margin-bottom: 1rem;
  border-radius: 12px;
  margin-left: 16px;
  margin-right: 16px;
}
#summary-map {
  height: 200px;
  margin: 1rem;
}

/* Live Tracking Modal Styles */
.tracking-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  text-align: center;
  margin-top: 1rem;
  margin-bottom: 1.5rem;
}
.tracking-label {
  color: #d1d5db;
  font-size: 0.8rem;
  text-transform: uppercase;
  margin: 0;
}
.tracking-value {
  color: #ffffff;
  font-size: clamp(1.5rem, 5vw, 2rem);
  font-weight: 700;
  line-height: 1.1;
  margin: 4px 0 0 0;
}

/* Hold to Stop Button Styles */
.hold-to-stop-button {
  position: relative;
  width: 100%;
  height: 60px;
  background-color: #ef4444;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none; /* For Safari */
  box-shadow: 0 4px 15px -5px rgba(239, 68, 68, 0.6);
}
.hold-progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background-color: #b91c1c;
  width: 100%;
  transform-origin: left;
  transform: scaleX(0);
}
.hold-text {
  position: relative;
  color: white;
  font-weight: bold;
  font-size: 1.1rem;
  z-index: 1;
}
</style>
