<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
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
  chevronForward,
  chevronBack,
  chevronDown,
  walk,
  settingsOutline,
} from "ionicons/icons";
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { gsap } from "gsap";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from "./firebase-config.js";

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
let friendsListenerUnsubscribe = null;
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

/*Map State*/
const mapContainer = ref(null); // To get a reference to the div
let map = null; // We use 'let' because the map instance itself isn't reactive
let userMarker = null;
let routePolyline = null;
const summaryMapContainer = ref(null);
let summaryMap = null;
let summaryRoutePolyline = null;

// --- WATCHERS ---

watch(isLiveTrackingModalVisible, (isNowVisible) => {
  // This function will run whenever 'isLiveTrackingModalVisible' changes.
  if (isNowVisible) {
    // When the modal is set to open, wait a brief moment for the
    // modal's animation to start and for the DOM to be ready.
    // Then, call initMap.
    setTimeout(() => {
      initMap();
    }, 200); // 200ms is a safe delay to ensure the container exists.
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

// --- COMPUTED ---
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

// --- METHODS ---
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
    const toast = await toastController.create({
      message: "Could not load runs for this user.",
      duration: 3000,
      color: "danger",
    });
    await toast.present();
  } finally {
    isFetchingFriendRuns.value = false;
  }
}

/* Map Methods */

async function initMap() {
  // Guard against re-initialization and ensure container exists.
  if (map || !mapContainer.value) {
    // If the container isn't ready, the timeout in the watcher will handle it.
    // We can add a log here for extra debugging if needed.
    if (!mapContainer.value) {
      console.error("initMap called, but mapContainer div not found!");
    }
    return;
  }

  try {
    console.log("Container found. Initializing map...");
    map = L.map(mapContainer.value).setView([51.505, -0.09], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

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

  try {
    summaryMap = L.map(summaryMapContainer.value);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(summaryMap);

    const routeLatLngs = lastRunSummary.value.route.map((p) => [p.lat, p.lng]);
    const polyline = L.polyline(routeLatLngs, { color: "#fbbf24" }).addTo(
      summaryMap
    );

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
            routePolyline = L.polyline([latlng], { color: "#fbbf24" }).addTo(
              map
            );
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

  if (currentDistance.value > 0.01) {
    if (!user.value) {
      alert("Please log in to save your workout data.");
      return;
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
    };
    try {
      await addDoc(collection(db, "runs"), newRunData);
      await fetchUserRuns(user.value.uid);
      lastRunSummary.value = newRunData;
      isSummaryModalVisible.value = true;
    } catch (error) {
      console.error("Error saving run:", error);
      // Create and present the toast on error
      const toast = await toastController.create({
        message: "There was an error saving your run.",
        duration: 3000,
        color: "danger",
        position: "top",
      });
      await toast.present();
    }
  }
  currentDistance.value = 0;
  currentPace.value = 0;
  lastPosition = null;
  startTime = null;
}

async function logRun() {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  if (!user.value) {
    alert("Please log in.");
    return;
  }
  const dist = parseFloat(distanceInput.value);
  const timeInSeconds =
    (parseInt(hoursInput.value) || 0) * 3600 +
    (parseInt(minutesInput.value) || 0) * 60 +
    (parseInt(secondsInput.value) || 0);
  if (dist > 0 && timeInSeconds > 0) {
    const newRunData = {
      userId: user.value.uid,
      date: new Date().toISOString(),
      distance: dist,
      time: timeInSeconds,
      pace: timeInSeconds / dist,
      timestamp: new Date(),
    };
    await addDoc(collection(db, "runs"), newRunData);
    await fetchUserRuns(user.value.uid); // This also triggers recalculateStats and updateUserStats
    distanceInput.value = null;
    hoursInput.value = null;
    minutesInput.value = null;
    secondsInput.value = null;
    isLogRunModalVisible.value = false;
  } else {
    alert("Please enter a valid distance and time.");
  }
}

async function deleteRun(index) {
  if (navigator.vibrate) navigator.vibrate(50);
  if (!user.value) return;

  // Create the alert using the controller
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
              await deleteDoc(doc(db, "runs", runToDelete.id));
              await fetchUserRuns(user.value.uid);

              // Create and present a success toast
              const toast = await toastController.create({
                message: "Run deleted successfully.",
                duration: 2000,
                color: "success",
                position: "top",
              });
              await toast.present();
            } catch (error) {
              console.error("Error deleting run:", error);

              // Create and present an error toast
              const toast = await toastController.create({
                message: "Failed to delete run. Please try again.",
                duration: 3000,
                color: "danger",
                position: "top",
              });
              await toast.present();
            }
          }
        },
      },
    ],
  });

  // Present the alert
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
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    // Reload the page to refresh the app state
    window.location.reload();
  } catch (error) {
    authMessage.value = `Error signing in: ${error.message}`;
  }
}

async function handleSignUp() {
  authMessage.value = "";
  if (!displayName.value || !email.value || !password.value) {
    authMessage.value = "Please fill out all fields.";
    return;
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    );
    const newUser = userCredential.user;
    await setDoc(doc(db, "users", newUser.uid), {
      displayName: displayName.value,
      displayName_lowercase: displayName.value.toLowerCase(),
      email: email.value.toLowerCase(),
    });

    window.location.reload();
  } catch (error) {
    authMessage.value = `Error signing up: ${error.message}`;
  }
}

async function handleSignOut() {
  if (friendsListenerUnsubscribe) {
    friendsListenerUnsubscribe();
    friendsListenerUnsubscribe = null;
  }
  await signOut(auth);
}

async function addFriend() {
  if (!friendUsername.value) {
    const toast = await toastController.create({
      message: "Please enter a username.",
      duration: 2000,
      color: "warning",
    });
    await toast.present();
    return;
  }
  const q = query(
    collection(db, "users"),
    where("displayName_lowercase", "==", friendUsername.value.toLowerCase())
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    const toast = await toastController.create({
      message: "User not found.",
      duration: 2000,
      color: "danger",
    });
    await toast.present();
    return;
  }
  const friendDoc = querySnapshot.docs[0];
  const friendUid = friendDoc.id;
  const friendData = friendDoc.data();
  if (friendUid === user.value.uid) {
    const toast = await toastController.create({
      message: "You can't follow yourself.",
      duration: 2000,
      color: "warning",
    });
    await toast.present();
    return;
  }
  await setDoc(doc(db, `users/${user.value.uid}/friends`, friendUid), {
    displayName: friendData.displayName,
    followedAt: new Date(),
  });

  const toast = await toastController.create({
    message: `You are now following ${friendData.displayName}!`,
    duration: 2000,
    color: "success",
  });
  await toast.present();

  closeFollowModal();
}

async function unfollowUser(friendToUnfollow) {
  if (
    !confirm(
      `Are you sure you want to unfollow ${friendToUnfollow.displayName}?`
    )
  )
    return;
  await deleteDoc(
    doc(db, `users/${user.value.uid}/friends`, friendToUnfollow.uid)
  );
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
  if (!user.value || friendsListenerUnsubscribe) return;
  const q = query(collection(db, `users/${user.value.uid}/friends`));
  friendsListenerUnsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const friendUid = change.doc.id;
      const friendData = change.doc.data();

      if (change.type === "added") {
        const statsDocRef = doc(db, "userStats", friendUid);
        onSnapshot(statsDocRef, (statsDoc) => {
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

        const userDocRef = doc(db, "users", friendUid);
        onSnapshot(userDocRef, (userDoc) => {
          const userData = userDoc.data();
          const existingFriendIndex = friends.value.findIndex(
            (f) => f.uid === friendUid
          );
          if (existingFriendIndex > -1) {
            friends.value[existingFriendIndex].photoURL = userData.photoURL;
          }
        });
      }

      if (change.type === "removed") {
        friends.value = friends.value.filter((f) => f.uid !== friendUid);
      }
    });
  });
}

function triggerFileUpload() {
  fileInput.value.click();
}

// Replace the old handlePictureUpload with this one
async function handlePictureUpload(event) {
  const file = event.target.files[0];
  if (!file || !user.value) return;

  const filePath = `profile-pictures/${user.value.uid}`;
  const fileRef = storageRef(storage, filePath);

  try {
    // Upload the file to Firebase Storage
    await uploadBytes(fileRef, file);

    // Get the public URL for the image
    const url = await getDownloadURL(fileRef);

    // Save that URL to the user's profile in Firestore
    await setDoc(
      doc(db, "users", user.value.uid),
      { photoURL: url },
      { merge: true }
    );

    // Update the picture in the app instantly
    photoURL.value = url;
    alert("Profile picture updated!");
  } catch (error) {
    console.error("Error uploading picture:", error);
    alert("Failed to upload picture.");
  }
}

// Replace the old updateUsername with this one
async function updateUsername() {
  const newName = newDisplayName.value.trim();
  if (!newName || newName === displayName.value) {
    return; // Do nothing if name is empty or unchanged
  }

  // Check if the new username is already taken by another user
  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("displayName_lowercase", "==", newName.toLowerCase())
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    alert("This username is already taken. Please choose another.");
    return;
  }

  // If it's unique, update the document
  try {
    const userDocRef = doc(db, "users", user.value.uid);
    await setDoc(
      userDocRef,
      {
        displayName: newName,
        displayName_lowercase: newName.toLowerCase(),
      },
      { merge: true }
    );

    displayName.value = newName; // Update the name in the app
    newDisplayName.value = ""; // Clear the input field
    alert("Username updated successfully!");
  } catch (error) {
    console.error("Error updating username:", error);
    alert("Failed to update username.");
  }
}

// --- ON MOUNTED ---
onMounted(() => {
  onAuthStateChanged(auth, async (authUser) => {
    isLoading.value = true;
    if (authUser) {
      user.value = authUser;
      const userDoc = await getDoc(doc(db, "users", authUser.uid));
      if (userDoc.exists()) {
        displayName.value = userDoc.data().displayName;
        photoURL.value = userDoc.data().photoURL;
      }
      closeAuthModal();
      await fetchUserRuns(authUser.uid);
      await setupSocialListeners();
    } else {
      user.value = null;
      displayName.value = "";
      photoURL.value = null;
      runHistory.value = [];
      friends.value = [];
      recalculateStatsFromHistory();
      openAuthModal();
      if (friendsListenerUnsubscribe) {
        friendsListenerUnsubscribe();
        friendsListenerUnsubscribe = null;
      }
    }
    isLoading.value = false;
  });
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
        <ion-toolbar color="#1e3a8a">
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

      <ion-content :fullscreen="true">
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

        <!-- Home Page -->
        <Transition name="fade">
          <div v-if="currentPage === 'home'" class="ion-padding">
            <!-- Overall Stats Card (Redesigned) -->
            <ion-card class="styled-card">
              <ion-card-header>
                <ion-card-title>All-Time Stats</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-grid class="summary-stats-grid">
                  <ion-row>
                    <ion-col size="6" class="summary-stat-item">
                      <ion-icon :icon="rocket" color="primary"></ion-icon>
                      <p class="stat-label">Total Distance</p>
                      <p class="stat-value small">
                        {{ animatedTotalDistance.toFixed(2) }}
                        <span class="stat-unit">mi</span>
                      </p>
                    </ion-col>
                    <ion-col size="6" class="summary-stat-item">
                      <ion-icon :icon="timeOutline" color="primary"></ion-icon>
                      <p class="stat-label">Total Time</p>
                      <p class="stat-value small">
                        {{ formatTime(animatedTotalTime, true) }}
                      </p>
                    </ion-col>
                  </ion-row>
                </ion-grid>
                <div class="ion-margin-top">
                  <div class="level-display">
                    <span class="level-emoji">{{ currentLevel.emoji }}</span>
                    <span>Level: {{ currentLevel.name }}</span>
                    <span style="margin-left: auto; font-size: 1.2rem"
                      >{{ Math.floor(animatedXp) }} XP</span
                    >
                  </div>
                  <ion-progress-bar
                    :value="progress"
                    color="warning"
                    class="ion-margin-top"
                  ></ion-progress-bar>
                  <p class="xp-text">
                    Next Level:
                    {{ currentLevel.xp === Infinity ? "Max" : currentLevel.xp }}
                    XP
                  </p>
                </div>
              </ion-card-content>
            </ion-card>

            <!-- Reactive Run Button -->
            <ion-card class="styled-card run-action-card">
              <ion-card-content>
                <ion-button
                  expand="block"
                  class="yellow-button run-button"
                  @click="openRunActionSheet"
                >
                  <ion-icon :icon="walk" slot="start"></ion-icon>
                  New Run
                </ion-button>
              </ion-card-content>
            </ion-card>

            <!-- Weekly Activity Chart (Corrected Layout) -->
            <ion-card class="styled-card">
              <ion-card-header class="weekly-header">
                <ion-card-title>Weekly Activity</ion-card-title>
                <!-- Button container -->
                <div class="week-nav-buttons">
                  <ion-button fill="clear" @click="goToPreviousWeek">
                    <ion-icon slot="icon-only" :icon="chevronBack"></ion-icon>
                  </ion-button>
                  <ion-button
                    fill="clear"
                    @click="goToNextWeek"
                    :disabled="currentWeekOffset === 0"
                  >
                    <ion-icon
                      slot="icon-only"
                      :icon="chevronForward"
                    ></ion-icon>
                  </ion-button>
                </div>
              </ion-card-header>

              <ion-card-content>
                <!-- Date is now below the header -->
                <h3 class="week-dates">
                  {{ currentWeekStart.toLocaleDateString() }} -
                  {{ new Date(currentWeekEnd - 1).toLocaleDateString() }}
                </h3>

                <p class="weekly-total">
                  Total: {{ weeklyTotalDistance.toFixed(2) }} mi
                </p>
                <div class="chart-container">
                  <!-- Chart bars remain the same -->
                  <div
                    v-for="data in weeklyChartData"
                    :key="data.day"
                    class="chart-bar-wrapper"
                  >
                    <div
                      class="chart-bar"
                      :style="{ height: data.height + '%' }"
                    >
                      <span class="bar-value">{{
                        data.distance.toFixed(1)
                      }}</span>
                    </div>
                    <p class="chart-label">{{ data.day }}</p>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </div>
        </Transition>

        <!-- Social Page (New Refined Card Layout) -->
        <Transition name="fade">
          <div v-if="currentPage === 'social'" class="ion-padding">
            <ion-button
              expand="block"
              @click="openFollowModal"
              class="ion-margin-bottom"
              color="primary"
            >
              <ion-icon slot="start" :icon="people"></ion-icon>
              Follow a New User
            </ion-button>

            <div v-if="friends.length > 0" class="friend-list">
              <div
                v-for="friend in friends"
                :key="friend.uid"
                class="friend-card-refined"
              >
                <!-- Card Header -->
                <div class="friend-main-info">
                  <img
                    :src="friend.photoURL || '/default-avatar.png'"
                    class="friend-avatar"
                    @click="openUserProfileModal(friend)"
                  />
                  <div
                    class="friend-details"
                    @click="openUserProfileModal(friend)"
                  >
                    <h2 class="friend-name">{{ friend.displayName }}</h2>
                    <div v-if="friend.stats" class="friend-level">
                      <span class="level-icon">{{
                        getLevelForXp(friend.stats.xp).emoji
                      }}</span>
                      <span>{{ getLevelForXp(friend.stats.xp).name }}</span>
                    </div>
                  </div>
                  <ion-button
                    fill="clear"
                    color="danger"
                    size="small"
                    class="unfollow-button"
                    @click="unfollowUser(friend)"
                  >
                    <ion-icon slot="icon-only" :icon="trash"></ion-icon>
                  </ion-button>
                </div>

                <!-- Progress Bar -->
                <div v-if="friend.stats" class="friend-progress">
                  <ion-progress-bar
                    :value="getProgressForXp(friend.stats.xp)"
                    color="warning"
                  ></ion-progress-bar>
                </div>

                <!-- Latest Run -->
                <div class="friend-latest-run">
                  <h3 class="section-title">Latest Run</h3>
                  <div
                    v-if="friend.stats && friend.stats.lastRun"
                    class="run-history-stats"
                  >
                    <div>
                      <p class="stat-label">Distance</p>
                      <p class="stat-value small">
                        {{ friend.stats.lastRun.distance.toFixed(2) }}
                        <span class="stat-unit">mi</span>
                      </p>
                    </div>
                    <div>
                      <p class="stat-label">Time</p>
                      <p class="stat-value small">
                        {{ formatTime(friend.stats.lastRun.time, true) }}
                      </p>
                    </div>
                    <div>
                      <p class="stat-label">Avg Pace</p>
                      <p class="stat-value small">
                        {{ formatTime(friend.stats.lastRun.pace) }}
                      </p>
                    </div>
                  </div>
                  <div v-else class="ion-text-center">
                    <p class="no-data-text">No recent runs</p>
                  </div>
                </div>

                <!-- Lifetime Stats -->
                <div class="friend-lifetime-stats">
                  <div class="lifetime-stat-item">
                    <ion-icon :icon="rocket" class="stat-icon"></ion-icon>
                    <span
                      >{{
                        friend.stats ? friend.stats.totalDistance.toFixed(2) : 0
                      }}
                      mi</span
                    >
                  </div>
                  <div class="lifetime-stat-item">
                    <ion-icon :icon="timeOutline" class="stat-icon"></ion-icon>
                    <span>{{
                      friend.stats
                        ? formatTime(friend.stats.totalTime, true)
                        : "00:00:00"
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <p v-else class="ion-text-center ion-padding">
              You aren't following anyone yet.
            </p>
          </div>
        </Transition>

        <!-- Profile Page -->
        <Transition name="fade">
          <div v-if="currentPage === 'profile'" class="ion-padding">
            <!-- Main Profile Stats Card -->
            <ion-card class="styled-card profile-stats-card">
              <ion-card-content>
                <div class="profile-header">
                  <img
                    :src="photoURL || '/default-avatar.png'"
                    class="profile-picture-main"
                  />
                  <div class="profile-info">
                    <h2 class="profile-display-name">{{ displayName }}</h2>
                    <div class="profile-level">
                      <span class="level-icon">{{ currentLevel.emoji }}</span>
                      <span
                        >{{ currentLevel.name }} - {{ Math.floor(xp) }} XP</span
                      >
                    </div>
                  </div>
                </div>
                <ion-progress-bar
                  :value="progress"
                  color="warning"
                  class="ion-margin-vertical"
                ></ion-progress-bar>
                <div class="profile-lifetime-stats">
                  <div class="stat-block">
                    <p class="stat-title">Total Distance</p>
                    <p class="stat-value">{{ totalDistance.toFixed(2) }} mi</p>
                  </div>
                  <div class="stat-block">
                    <p class="stat-title">Total Time</p>
                    <p class="stat-value">{{ formatTime(totalTime, true) }}</p>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <!-- Run History Card -->
            <ion-card class="styled-card" v-if="runHistory.length > 0">
              <ion-card-header>
                <ion-card-title>Run History</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="none">
                  <div
                    v-for="(run, index) in displayedRuns"
                    :key="run.id"
                    class="run-history-item"
                  >
                    <div class="run-history-header">
                      <h2>{{ new Date(run.date).toLocaleDateString() }}</h2>
                      <ion-button
                        fill="clear"
                        color="danger"
                        size="small"
                        @click="deleteRun(index)"
                      >
                        <ion-icon slot="icon-only" :icon="trash"></ion-icon>
                      </ion-button>
                    </div>
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
                        <p class="stat-value small">
                          {{ formatTime(run.pace) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </ion-list>
                <ion-button
                  v-if="visibleRunsCount < runHistory.length"
                  @click="showMoreRuns"
                  expand="block"
                  fill="outline"
                  class="ion-margin-top"
                  >See More</ion-button
                >
              </ion-card-content>
            </ion-card>
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

      <!-- Auth Modal -->
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
              <!-- Username Input (Only for Sign Up) -->
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

              <!-- Email Input -->
              <ion-item lines="none" class="input-with-icon">
                <ion-icon :icon="mailOutline" slot="start"></ion-icon>
                <ion-input
                  placeholder="Email"
                  type="email"
                  v-model="email"
                ></ion-input>
              </ion-item>

              <!-- Password Input -->
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
          <ion-toolbar color="#1e3a8a">
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
                    {{
                      formatTime(selectedFriendProfile.stats.totalTime, true)
                    }}
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
        @didDismiss="isSummaryModalVisible = false"
        @ionModalDidDismiss="destroySummaryMap"
        class="summary-modal"
      >
        <ion-header>
          <ion-toolbar color="#1e3a8a">
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
          <ion-toolbar color="#1e3a8a">
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
          <ion-toolbar color="#1e3a8a">
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
          <ion-toolbar color="#1e3a8a">
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
    </template>
  </ion-app>
</template>

<style scoped>
.run-action-card {
  padding: 8px;
}
.run-button {
  --padding-top: 20px;
  --padding-bottom: 20px;
  font-size: 1.2rem;
}
.stat-value.small {
  font-size: clamp(1.2rem, 3.5vw, 1.5rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.summary-stat-item .stat-value.small {
  font-size: 1.5rem; /* Override for stats grid */
}
.xp-text {
  font-size: 0.8rem;
  color: #d1d5db;
  text-align: right;
  margin-top: 0.5rem;
}

/* Weekly Chart Styles */
.weekly-header {
  display: flex;
}
.weekly-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.week-nav-buttons {
  display: flex;
  align-items: center;
}
.week-dates {
  color: #ffffff;
  font-size: 1.1em;
  font-weight: 600;
  text-align: center;
  margin: 0 0 0.5rem 0;
}
.weekly-total {
  text-align: center;
  font-size: 1.1em;
  font-weight: 600;
  margin-bottom: 1rem;
}
.chart-container {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 150px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}
.chart-bar {
  width: 70%;
  background-color: var(--ion-color-primary);
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease-out;
  position: relative;
  min-height: 2px; /* Show a sliver for 0-distance days */
}
.bar-value {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 2px 4px;
  border-radius: 3px;
}
.chart-bar:hover .bar-value {
  opacity: 1;
}
.chart-label {
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}

ion-header ion-toolbar {
  --background: #1e3a8a;
}
ion-content {
  --background: linear-gradient(170deg, #1e3a8a 0%, #0c1a4b 100%);
}

.welcome-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
}
.styled-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 1.5rem;
}
.styled-card ion-card-title {
  font-weight: 700;
  color: #fff;
}
.styled-card p {
  color: #eee;
}
.styled-card ion-list {
  background: transparent;
}
.styled-input {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  color: #fff;
  margin-bottom: 8px;
  --padding-start: 16px;
}
.yellow-button {
  --background: #fbbf24;
  --background-activated: #f59e0b;
  --color: #1a202c;
  font-weight: 700;
}
.stat-item {
  margin-bottom: 1rem;
}
.stat-item:last-child {
  margin-bottom: 0;
}
.stat-label {
  color: #d1d5db;
  font-size: 0.8rem;
  text-transform: uppercase;
}
.stat-value {
  color: #ffffff;
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.1;
}
.stat-value.small {
  /* Replaced fixed font-size with a responsive one */
  font-size: clamp(1.1rem, 4.2vw, 1.5rem);

  /* Added overflow protection as a safeguard */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block; /* Ensures overflow rules apply correctly */
  max-width: 100%;
}
.stat-unit {
  font-size: 1.25rem;
  font-weight: 400;
  color: #d1d5db;
}
.level-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fbbf24;
}
.level-emoji {
  font-size: 1.5rem;
}
.xp-text {
  font-size: 0.8rem;
  color: #d1d5db;
  margin-top: 0.5rem;
}
.footer-tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 75px; /* Increased from 65px */
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
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
  font-size: 12px; /* Increased from 10px */
  transition: color 0.2s;
}
.footer-tabs button.active {
  color: #fbbf24;
}
.footer-tabs ion-icon {
  font-size: 26px; /* Increased from 24px */
  margin-bottom: 2px;
}
ion-content {
  --padding-bottom: 80px;
}
.auth-modal ion-content {
  --background: #1e3a8a;
}
.auth-modal .input-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.auth-modal h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}
.tracking-stats {
  display: flex;
  justify-content: space-around;
  text-align: center;
  margin: 1rem 0;
}
.tracking-label {
  font-size: 0.75rem;
  color: #d1d5db;
  text-transform: uppercase;
}
.tracking-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
}
.run-history-item {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.run-history-item:last-child {
  border-bottom: none;
}
.run-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.run-history-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  text-align: center;
}
.friend-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.friend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}

.run-history-item h2,
.friend-card h2 {
  font-weight: 600;
  color: #fbbf24;
}
.friend-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #fbbf24;
}
.friend-total-stats {
  margin-top: 1rem;
  font-size: 0.9rem;
}
.run-history-item.mini {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
  margin: 0.5rem 0;
}
.run-history-item.mini .stat-value.small {
  font-size: 1.2rem;
}
/* This controls the animation timing */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease-out;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
.profile-picture {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--ion-color-primary);
  margin: auto;
  margin-bottom: 0.5rem;
  cursor: pointer;
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
.friend-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.friend-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}
/* Custom Alert Styles for Dark Theme */
.custom-alert {
  /* Set the main background of the alert box */
  --background: #2b499b; /* A slightly lighter shade of your app's blue for contrast */
  --backdrop-opacity: 0.6;
}

/* Style the header/title text */
.custom-alert .alert-title {
  color: #ffffff !important;
}

/* Style the message text */
.custom-alert .alert-message {
  color: #e0e0e0 !important; /* A slightly off-white for the body text */
}

/* Style the buttons */
.custom-alert .alert-button {
  color: #fbbf24 !important; /* Your yellow accent color for buttons */
  font-weight: 600;
  text-transform: uppercase;
}

/* Specifically color the "Delete" button to be more dangerous */
.custom-alert .alert-button-role-destructive {
  color: #ff4961 !important; /* A typical red for destructive actions */
}

.loading-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-family: "Orbitron", sans-serif;
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
.friend-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.friend-card-refined {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.friend-main-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.friend-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--ion-color-primary);
  flex-shrink: 0;
}

.friend-details {
  flex-grow: 1;
}

.friend-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.friend-level {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #fbbf24;
}

.level-icon {
  font-size: 1.1rem;
}

.unfollow-button {
  --padding-start: 8px;
  --padding-end: 8px;
  margin-left: auto;
}

.friend-progress {
  width: 100%;
}

ion-progress-bar {
  height: 6px;
  border-radius: 3px;
}

.friend-latest-run {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #d1d5db;
  text-transform: uppercase;
  margin-top: 0;
  margin-bottom: 0.75rem;
  text-align: center;
}

.no-data-text {
  font-style: italic;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.friend-lifetime-stats {
  display: flex;
  justify-content: space-around;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
}

.lifetime-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
}

.stat-icon {
  color: #fbbf24;
  font-size: 1.2rem;
}

/* Styles for Run Summary Modal */

.summary-modal ion-card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-modal ion-content {
  --background: linear-gradient(170deg, #1e3a8a 0%, #0c1a4b 100%);
}

.summary-logo-icon {
  width: 80px;
  height: auto;
  margin-bottom: 0.75rem;
}

.summary-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.5rem;
}

.summary-stats-grid {
  margin-top: 1.5rem;
}

.summary-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem 0.5rem;
  min-height: 120px;
  /* Removed background and border-radius to create a single card feel */
}

.summary-stat-item ion-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.summary-stat-item .stat-label {
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.summary-stat-item .stat-value {
  font-size: 1.75rem;
  line-height: 1.2;
}

.summary-stat-item .stat-unit {
  font-size: 1rem;
}

.auth-modal {
  --background: transparent;
}

.auth-modal ion-content {
  --background: linear-gradient(170deg, #1e3a8a 0%, #0c1a4b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-card {
  width: 100%;
  max-width: 400px; /* Or adjust as needed */
  margin: auto;
}

.auth-card-header {
  position: relative;
  text-align: center;
  padding-bottom: 1rem;
}

.auth-card-header ion-card-title {
  font-size: 1.6rem;
}

.auth-logo {
  width: 70px;
  height: auto;
  margin: 0 auto 1rem auto;
}

.input-with-icon {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 1rem;
  --padding-start: 12px;
  --inner-padding-end: 12px;
  --min-height: 50px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.input-with-icon ion-icon {
  font-size: 1.2rem;
  color: #d1d5db;
  margin-right: 8px;
}

.input-with-icon ion-input {
  color: #fff;
}

.auth-toggle {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
}

.auth-toggle a {
  color: var(--ion-color-primary);
  font-weight: bold;
  cursor: pointer;
}
.modal-close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  --color: var(--ion-color-medium);
}

/* Profile Page Styles */
.profile-stats-card {
  --padding-start: 1rem;
  --padding-end: 1rem;
  --padding-top: 1.5rem;
  --padding-bottom: 1.5rem;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.profile-picture-main {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--ion-color-primary);
  flex-shrink: 0;
}
.profile-info {
  flex-grow: 1;
}
.profile-display-name {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  color: #fff;
}
.profile-level {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: #fbbf24;
  margin-top: 4px;
}
.profile-lifetime-stats {
  display: flex;
  justify-content: space-around;
  text-align: center;
}
.stat-block .stat-title {
  font-size: 0.8rem;
  color: #d1d5db;
  text-transform: uppercase;
  margin: 0;
}
.stat-block .stat-value {
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
  margin: 4px 0 0 0;
}

/* Accordion Styles */
.accordion-card {
  padding: 0;
  overflow: hidden;
}
.accordion-header {
  --background: transparent;
  --padding-start: 1rem;
  --padding-end: 1rem;
  cursor: pointer;
  font-weight: 600;
}
.accordion-header ion-label {
  font-weight: bold;
}
.accordion-header ion-icon {
  transition: transform 0.3s ease-in-out;
}
.accordion-header ion-icon.rotate-icon {
  transform: rotate(180deg);
}
.accordion-content {
  padding: 0 1rem 1rem 1rem;
  background-color: rgba(0, 0, 0, 0.1);
}
.full-width-button {
  width: 100%;
}

/* Map Styles */
#map {
  height: 250px;
  width: auto;
  margin-bottom: 1rem;
  border-radius: 12px;
  margin-left: 16px;
  margin-right: 16px;
}

#summary-map {
  height: 200px;
  width: auto;
  border-radius: 12px;
  margin: 1rem;
}

/* Hold-to-Stop Button Styles */
.hold-to-stop-button {
  position: relative;
  width: 100%;
  height: 50px;
  background-color: var(--ion-color-danger-shade);
  border-radius: var(--ion-border-radius-lg, 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  user-select: none; /* Prevent text selection while holding */
  -webkit-user-select: none;
  transition: background-color 0.2s;
}

.hold-to-stop-button:active {
  background-color: var(--ion-color-danger);
}

.hold-progress {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--ion-color-danger);
  transform-origin: left;
  transform: scaleX(0); /* Starts with no fill */
}

.hold-text {
  position: relative;
  color: #fff;
  font-weight: bold;
  font-size: 1rem;
  z-index: 1;
}
</style>
