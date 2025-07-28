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
} from "@ionic/vue";
import {
  home,
  people,
  logOut,
  closeCircle,
  trophy,
  trash,
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
import RunMap from "./components/RunMap.vue";

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
  if (seconds === 0 || isNaN(seconds)) return "00:00";
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
  if ("vibrate" in navigator) navigator.vibrate(50);
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
  if ("vibrate" in navigator) navigator.vibrate(50);
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
      alert("There was an error saving your run.");
    }
  }
  currentDistance.value = 0;
  currentPace.value = 0;
  lastPosition = null;
  startTime = null;
}

async function deleteRun(index) {
  if (!user.value) {
    alert("Please log in to delete runs.");
    return;
  }
  if (confirm("Are you sure you want to delete this run?")) {
    const runToDelete = runHistory.value[index];
    if (runToDelete.id) {
      await deleteDoc(doc(db, "runs", runToDelete.id));
      await fetchUserRuns(user.value.uid);
      if ("vibrate" in navigator) navigator.vibrate(50);
    } else {
      alert("Error: Run ID not found for deletion.");
    }
  }
}

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

async function logRun() {
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
    await addDoc(collection(db, "runs"), {
      userId: user.value.uid,
      date: new Date().toISOString(),
      distance: dist,
      time: timeInSeconds,
      pace: timeInSeconds / dist,
      timestamp: new Date(),
    });
    await fetchUserRuns(user.value.uid);
    distanceInput.value = null;
    hoursInput.value = null;
    minutesInput.value = null;
    secondsInput.value = null;
  } else {
    alert("Please enter a valid distance and time.");
  }
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
    const userStatsDocRef = doc(db, "userStats", user.value.uid);
    await setDoc(
      userStatsDocRef,
      {
        totalDistance: totalDistance.value,
        totalTime: totalTime.value,
        xp: xp.value,
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
      }
      if (change.type === "removed") {
        friends.value = friends.value.filter((f) => f.uid !== friendUid);
      }
    });
  });
}

// --- ON MOUNTED ---
onMounted(() => {
  onAuthStateChanged(auth, async (authUser) => {
    if (authUser) {
      user.value = authUser;
      const userDoc = await getDoc(doc(db, "users", authUser.uid));
      if (userDoc.exists()) {
        displayName.value = userDoc.data().displayName;
      }
      closeAuthModal();
      await fetchUserRuns(authUser.uid);
      await setupSocialListeners();
    } else {
      user.value = null;
      displayName.value = "";
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
    <ion-content :fullscreen="true">
      <div
        v-if="user"
        class="ion-text-center ion-margin-bottom"
        style="margin-top: 1rem"
      >
        <img
          src="/icons/boot.svg"
          alt="RunItUp Logo"
          style="width: 100px; height: auto; margin: auto"
        />
        <p class="ion-margin-top welcome-text">Hello, {{ displayName }}!</p>
      </div>

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
                {{ currentLevel.xp === Infinity ? "∞" : currentLevel.xp }} XP{{
                  nextLevel.name !== currentLevel.name
                    ? ` to ${nextLevel.emoji} ${nextLevel.name}`
                    : ""
                }}
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
            <ion-list lines="full">
              <ion-item v-for="(run, index) in displayedRuns" :key="run.id">
                <ion-label>
                  <h2>{{ new Date(run.date).toLocaleDateString() }}</h2>
                  <p>
                    {{ run.distance.toFixed(2) }} miles in
                    {{ formatTime(run.time, true) }}
                  </p>
                </ion-label>

                <ion-button
                  slot="end"
                  color="danger"
                  fill="clear"
                  @click="deleteRun(index)"
                >
                  <ion-icon slot="icon-only" :icon="trash"></ion-icon>
                </ion-button>
              </ion-item>
            </ion-list>

            <ion-button
              v-if="visibleRunsCount < runHistory.length"
              @click="showMoreRuns"
              expand="block"
              fill="outline"
              class="ion-margin-top"
            >
              See More
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>

      <div v-if="currentPage === 'social'" class="ion-padding">
        <ion-button
          expand="block"
          @click="openFollowModal"
          class="ion-margin-bottom"
          color="primary"
          >Follow a New User</ion-button
        >
        <ion-card class="styled-card">
          <ion-card-header>
            <ion-card-title>Following</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list v-if="friends.length > 0" lines="full">
              <ion-item v-for="friend in friends" :key="friend.uid">
                <ion-label>
                  <h2>{{ friend.displayName }}</h2>
                  <p>
                    Total Distance:
                    {{
                      friend.stats ? friend.stats.totalDistance.toFixed(2) : 0
                    }}
                    miles
                  </p>
                  <p>
                    Total Time:
                    {{
                      friend.stats
                        ? formatTime(friend.stats.totalTime, true)
                        : "00:00:00"
                    }}
                  </p>
                </ion-label>
                <ion-button
                  slot="end"
                  color="danger"
                  @click="unfollowUser(friend)"
                  >Unfollow</ion-button
                >
              </ion-item>
            </ion-list>
            <p v-else class="ion-text-center ion-padding">
              You aren't following anyone yet.
            </p>
          </ion-card-content>
        </ion-card>
      </div>

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
        <button @click="handleSignOut">
          <ion-icon :icon="logOut"></ion-icon>
          <ion-label>Sign Out</ion-label>
        </button>
      </div>
    </ion-content>

    <ion-modal
      :is-open="isAuthModalVisible"
      :backdrop-dismiss="false"
      class="auth-modal"
    >
      <ion-content class="ion-padding">
        <h2 class="ion-text-center">Account</h2>
        <div class="input-group ion-margin-top">
          <ion-input
            class="styled-input"
            placeholder="Username"
            v-model="displayName"
          ></ion-input>
          <ion-input
            class="styled-input"
            placeholder="Email"
            type="email"
            v-model="email"
          ></ion-input>
          <ion-input
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
        >
        <ion-button expand="block" @click="handleSignUp" color="success"
          >Sign Up</ion-button
        >
        <p
          v-if="authMessage"
          class="ion-text-center ion-padding"
          style="color: var(--ion-color-warning)"
        >
          {{ authMessage }}
        </p>
      </ion-content>
    </ion-modal>

    <ion-modal
      :is-open="isFollowModalVisible"
      @didDismiss="closeFollowModal()"
      class="auth-modal"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Follow a User</ion-title>
          <ion-button slot="end" fill="clear" @click="closeFollowModal()">
            <ion-icon :icon="closeCircle"></ion-icon>
          </ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-input
          class="styled-input"
          placeholder="Username"
          v-model="friendUsername"
        ></ion-input>
        <ion-button
          expand="block"
          @click="addFriend"
          class="ion-margin-top"
          color="success"
          >Follow User</ion-button
        >
      </ion-content>
    </ion-modal>

    <ion-modal
      :is-open="isSummaryModalVisible"
      @didDismiss="isSummaryModalVisible = false"
    >
      <ion-header>
        <ion-toolbar>
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
          <RunMap
            :route="lastRunSummary.route"
            v-if="lastRunSummary.route && lastRunSummary.route.length > 0"
          />
          <ion-card-header class="ion-text-center">
            <ion-card-title
              color="warning"
              style="font-size: 2.5rem; font-weight: 700"
            >
              {{ lastRunSummary.distance.toFixed(2) }} miles
            </ion-card-title>
          </ion-card-header>
          <ion-list lines="none" class="ion-margin-top">
            <ion-item>
              <ion-label>Time</ion-label>
              <p slot="end">{{ formatTime(lastRunSummary.time, true) }}</p>
            </ion-item>
            <ion-item>
              <ion-label>Avg. Pace</ion-label>
              <p slot="end">{{ formatTime(lastRunSummary.pace) }} / mile</p>
            </ion-item>
          </ion-list>
        </div>
      </ion-content>
    </ion-modal>
  </ion-app>
</template>

<style scoped>
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
  color: #ffffff;
}
.level-emoji {
  font-size: 1.5rem;
}
.xp-text {
  font-size: 0.8rem;
  color: #d1d5db;
  margin-top: 0.5rem;
}

/* Updated Footer Styles */
.footer-tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 65px;
  background: rgba(0, 0, 0, 0.2); /* Restored transparent background */
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
  font-size: 10px;
  transition: color 0.2s;
}
.footer-tabs button.active {
  color: #fbbf24;
}
.footer-tabs ion-icon {
  font-size: 24px;
  margin-bottom: 2px;
}
ion-content {
  --padding-bottom: 70px;
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
</style>
