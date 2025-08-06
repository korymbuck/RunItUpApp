<script setup>
import { ref, computed, onMounted } from "vue";
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
} from "@ionic/vue";
import {
  home,
  people,
  logOut,
  closeCircle,
  trophy,
  trash,
  personCircle,
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
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { gsap } from "gsap";
import { GoogleMap } from "@capacitor/google-maps";
import { nextTick, watch } from "vue";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from "./firebase-config.js";

// --- STATE ---
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
const showMap = ref(false);
let map = null;
const mapRef = ref(null);
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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

// --- METHODS ---
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

  if (currentDistance.value > 0) {
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

// --- MAP LOGIC ---
watch(isSummaryModalVisible, async (isVisible) => {
  if (isVisible && lastRunSummary.value?.route?.length > 0) {
    // Use nextTick to ensure the DOM element is available
    await nextTick();
    if (mapRef.value) {
      try {
        map = await GoogleMap.create({
          id: "run-summary-map",
          element: mapRef.value,
          apiKey: apiKey,
          config: {
            center: {
              lat: lastRunSummary.value.route[0].lat,
              lng: lastRunSummary.value.route[0].lng,
            },
            zoom: 16,
            disableDefaultUI: true,
          },
        });
        if (lastRunSummary.value.route.length > 1) {
          await map.addPolyline({
            path: lastRunSummary.value.route,
            strokeColor: "#3B82F6",
            strokeWeight: 5,
          });
          await map.moveCamera({
            target: lastRunSummary.value.route,
            padding: 40,
          });
        }
      } catch (e) {
        alert("Map Error: " + e.message);
        console.error("Error creating map", e);
      }
    }
  } else if (!isVisible && map) {
    // Destroy the map when the modal is closed
    await map.destroy();
    map = null;
  }
});

const createMap = async () => {
  console.log("ionModalDidPresent event fired, attempting to create map...");

  if (!mapRef.value) {
    console.error("Map container (mapRef) is not available.");
    return;
  }

  if (!lastRunSummary.value?.route || lastRunSummary.value.route.length === 0) {
    console.error("No route data found in lastRunSummary.");
    return;
  }

  console.log("API Key:", apiKey ? "Loaded" : "MISSING!");
  console.log("Map container element:", mapRef.value);
  console.log("Route data:", JSON.stringify(lastRunSummary.value.route));

  try {
    map = await GoogleMap.create({
      id: "run-summary-map",
      element: mapRef.value,
      apiKey: apiKey,
      config: {
        center: {
          lat: lastRunSummary.value.route[0].lat,
          lng: lastRunSummary.value.route[0].lng,
        },
        zoom: 16,
        disableDefaultUI: true,
      },
    });

    console.log("GoogleMap.create was called successfully.");

    if (lastRunSummary.value.route.length > 1) {
      await map.addPolyline({
        path: lastRunSummary.value.route,
        strokeColor: "#3B82F6",
        strokeWeight: 5,
      });
      console.log("Polyline added to the map.");

      await map.moveCamera({
        target: lastRunSummary.value.route,
        padding: 40,
      });
      console.log("Camera moved.");
    }
  } catch (e) {
    // This is the most important log!
    console.error("MAP CREATION FAILED:", e);
    alert(`Map Error: ${e.message}`);
  }
};

const destroyMap = async () => {
  if (map) {
    await map.destroy();
    map = null;
  }
};

// --- FIREBASE METHODS ---
async function handleSignIn() {
  authMessage.value = "";
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    closeAuthModal();
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
    closeAuthModal();
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
    alert("Please enter a username.");
    return;
  }
  const q = query(
    collection(db, "users"),
    where("displayName_lowercase", "==", friendUsername.value.toLowerCase())
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    alert("User not found.");
    return;
  }
  const friendDoc = querySnapshot.docs[0];
  const friendUid = friendDoc.id;
  const friendData = friendDoc.data();
  if (friendUid === user.value.uid) {
    alert("You can't follow yourself.");
    return;
  }
  await setDoc(doc(db, `users/${user.value.uid}/friends`, friendUid), {
    displayName: friendData.displayName,
    followedAt: new Date(),
  });
  alert(`You are now following ${friendData.displayName}!`);
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
  });
});
</script>

<template>
  <ion-app>
    <ion-header class="ion-no-border">
      <ion-toolbar color="#1e3a8a">
        <ion-title>RunItUp</ion-title>
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
      <Transition name="fade">
        <div v-if="currentPage === 'home'" class="ion-padding">
          <ion-card class="styled-card">
            <ion-card-header>
              <ion-card-title>Overall Stats</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="stat-item">
                <p class="stat-label">Total Distance</p>
                <p class="stat-value">
                  {{ animatedTotalDistance.toFixed(2) }}
                  <span class="stat-unit">miles</span>
                </p>
              </div>
              <div class="stat-item">
                <p class="stat-label">Total Time</p>
                <p class="stat-value">
                  {{ formatTime(animatedTotalTime, true) }}
                </p>
              </div>
              <div class="stat-item">
                <p class="stat-label">XP</p>
                <p class="stat-value">{{ Math.floor(animatedXp) }}</p>
              </div>

              <div class="ion-margin-top">
                <div class="level-display">
                  <span class="level-emoji">{{ currentLevel.emoji }}</span>
                  <span>Level: {{ currentLevel.name }}</span>
                </div>
                <ion-progress-bar
                  :value="progress"
                  color="warning"
                  class="ion-margin-top"
                ></ion-progress-bar>
                <p class="xp-text">
                  {{ Math.floor(xp) }} /
                  {{ currentLevel.xp === Infinity ? "∞" : currentLevel.xp }} XP
                  to
                  {{ nextLevel.name }}
                </p>
              </div>
            </ion-card-content>
          </ion-card>

          <ion-card class="styled-card">
            <ion-card-header>
              <ion-card-title>Track a Run</ion-card-title>
            </ion-card-header>
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
                    <p class="tracking-value">{{ formatTime(currentPace) }}</p>
                  </div>
                  <div>
                    <p class="tracking-label">TIME</p>
                    <p class="tracking-value">{{ formatTime(elapsedTime) }}</p>
                  </div>
                </div>
                <ion-button
                  expand="block"
                  @click="stopWorkout"
                  color="danger"
                  class="ion-margin-top"
                  >Stop Workout</ion-button
                >
              </div>
            </ion-card-content>
          </ion-card>

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
                      <p class="stat-value small">{{ formatTime(run.pace) }}</p>
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
      <Transition name="fade">
        <div v-if="currentPage === 'social'" class="ion-padding">
          <img v-if="photoURL" :src="photoURL" class="page-avatar" />
          <ion-button
            expand="block"
            @click="openFollowModal"
            class="ion-margin-bottom"
            color="primary"
            >Follow a New User</ion-button
          >
          <ion-card class="styled-card" v-if="friends.length > 0">
            <ion-card-header>
              <ion-card-title>Following</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div
                v-for="friend in friends"
                :key="friend.uid"
                class="friend-card"
              >
                <div class="friend-header">
                  <div class="friend-identity">
                    <img
                      :src="friend.photoURL || '/default-avatar.png'"
                      class="friend-avatar"
                    />
                    <h2>{{ friend.displayName }}</h2>
                  </div>
                  <ion-button
                    color="danger"
                    size="small"
                    @click="unfollowUser(friend)"
                    >Unfollow</ion-button
                  >
                </div>

                <div
                  v-if="friend.stats && friend.stats.lastRun"
                  class="run-history-item mini"
                >
                  <p class="ion-text-center"><small>LATEST RUN</small></p>
                  <div class="run-history-stats">
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
                </div>
                <div class="friend-total-stats">
                  <p>
                    <strong>Total Distance:</strong>
                    {{
                      friend.stats ? friend.stats.totalDistance.toFixed(2) : 0
                    }}
                    miles
                  </p>
                  <p>
                    <strong>Total Time:</strong>
                    {{
                      friend.stats
                        ? formatTime(friend.stats.totalTime, true)
                        : "00:00:00"
                    }}
                  </p>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
          <p v-else class="ion-text-center ion-padding">
            You aren't following anyone yet.
          </p>
        </div>
      </Transition>
      <Transition name="fade">
        <div v-if="currentPage === 'profile'" class="ion-padding">
          <ion-card class="styled-card">
            <ion-card-header>
              <ion-card-title class="ion-text-center"
                >Your Profile</ion-card-title
              >
            </ion-card-header>
            <ion-card-content class="ion-text-center">
              <img
                :src="photoURL || '/default-avatar.png'"
                class="profile-picture"
                @click="triggerFileUpload"
              />
              <input
                type="file"
                @change="handlePictureUpload"
                ref="fileInput"
                style="display: none"
                accept="image/*"
              />
              <p><small>Tap picture to change</small></p>

              <div class="ion-margin-top">
                <ion-input
                  class="styled-input"
                  placeholder="Enter new username"
                  v-model="newDisplayName"
                ></ion-input>
                <ion-button
                  expand="block"
                  @click="updateUsername"
                  color="primary"
                  class="ion-margin-top"
                  >Save Username</ion-button
                >
              </div>

              <ion-button
                expand="block"
                @click="handleSignOut"
                color="danger"
                class="ion-margin-top"
                >Sign Out</ion-button
              >
            </ion-card-content>
          </ion-card>
        </div>
      </Transition>
      <div v-if="user" class="footer-tabs">
        <button
          @click="currentPage = 'home'"
          :class="{ active: currentPage === 'home' }"
        >
          <ion-icon :icon="home"></ion-icon><ion-label>Home</ion-label>
        </button>
        <button
          @click="currentPage = 'social'"
          :class="{ active: currentPage === 'social' }"
        >
          <ion-icon :icon="people"></ion-icon><ion-label>Social</ion-label>
        </button>
        <button
          @click="currentPage = 'profile'"
          :class="{ active: currentPage === 'profile' }"
        >
          <ion-icon :icon="personCircle"></ion-icon
          ><ion-label>Profile</ion-label>
        </button>
      </div>
    </ion-content>

    <ion-modal
      :is-open="isAuthModalVisible"
      :backdrop-dismiss="false"
      class="auth-modal"
      ><ion-content class="ion-padding"
        ><h2 class="ion-text-center">Account</h2>
        <div class="input-group ion-margin-top">
          <ion-input
            class="styled-input"
            placeholder="Username"
            v-model="displayName"
          ></ion-input
          ><ion-input
            class="styled-input"
            placeholder="Email"
            type="email"
            v-model="email"
          ></ion-input
          ><ion-input
            class="styled-input"
            placeholder="Password"
            type="password"
            v-model="password"
          ></ion-input>
        </div>
        <ion-button
          expand="block"
          @click="handleSignIn"
          class="ion-margin-top"
          color="primary"
          >Sign In</ion-button
        ><ion-button expand="block" @click="handleSignUp" color="success"
          >Sign Up</ion-button
        >
        <p
          v-if="authMessage"
          class="ion-text-center ion-padding"
          style="color: var(--ion-color-warning)"
        >
          {{ authMessage }}
        </p></ion-content
      ></ion-modal
    >
    <ion-modal
      :is-open="isFollowModalVisible"
      @didDismiss="closeFollowModal()"
      class="auth-modal"
      ><ion-header
        ><ion-toolbar color="#1e3a8a"
          ><ion-title>Follow a User</ion-title
          ><ion-button slot="end" fill="clear" @click="closeFollowModal()"
            ><ion-icon
              :icon="closeCircle"
            ></ion-icon></ion-button></ion-toolbar></ion-header
      ><ion-content class="ion-padding"
        ><ion-input
          class="styled-input"
          placeholder="Username"
          v-model="friendUsername"
        ></ion-input
        ><ion-button
          expand="block"
          @click="addFriend"
          class="ion-margin-top"
          color="success"
          >Follow User</ion-button
        ></ion-content
      ></ion-modal
    >
    <ion-modal
      :is-open="isSummaryModalVisible"
      @didDismiss="
        isSummaryModalVisible = false;
        destroyMap();
      "
      @ionModalDidPresent="createMap"
    >
      <ion-header>
        <ion-toolbar color="dark">
          <ion-title>Run Summary</ion-title>
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
        <div v-if="lastRunSummary">
          <capacitor-google-map
            ref="mapRef"
            style="
              display: block;
              height: 300px;
              width: 100%;
              border-radius: 10px;
            "
          ></capacitor-google-map>

          <div class="ion-text-center ion-margin-top">
            <div class="stat-item">
              <p class="stat-label">Distance</p>
              <p class="stat-value">
                {{ lastRunSummary.distance.toFixed(2) }}
                <span class="stat-unit">miles</span>
              </p>
            </div>
            <div class="stat-item">
              <p class="stat-label">Time</p>
              <p class="stat-value">
                {{ formatTime(lastRunSummary.time, true) }}
              </p>
            </div>
            <div class="stat-item">
              <p class="stat-label">Avg. Pace</p>
              <p class="stat-value">
                {{ formatTime(lastRunSummary.pace) }}
                <span class="stat-unit">/ mile</span>
              </p>
            </div>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </ion-app>
</template>

<style scoped>
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
  font-size: 1.5rem;
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
</style>
