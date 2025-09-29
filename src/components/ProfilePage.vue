<template>
  <div class="ion-padding">
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
              <span>{{ currentLevel.name }} - {{ Math.floor(xp) }} XP</span>
            </div>
          </div>
        </div>
        <ion-progress-bar
          :value="progress"
          color="warning"
          class="ion-margin-vertical"
        ></ion-progress-bar>
        <!-- Unified Stats Section -->
        <div class="profile-stats-grid">
          <!-- Lifetime Stats -->
          <div class="stat-block">
            <p class="stat-title">Total Distance</p>
            <p class="stat-value">{{ totalDistance.toFixed(2) }} mi</p>
          </div>
          <div class="stat-block">
            <p class="stat-title">Total Time</p>
            <p class="stat-value">{{ formatTime(totalTime, true) }}</p>
          </div>

          <!-- Divider / Subheader -->
          <div class="stats-divider">
            <span>Personal Records</span>
          </div>

          <!-- Personal Records -->
          <div class="stat-block">
            <p class="stat-title">Longest Run</p>
            <p class="stat-value">
              {{ personalRecords.longestDistance.toFixed(2) }} mi
            </p>
          </div>
          <div class="stat-block">
            <p class="stat-title">Fastest Mile</p>
            <p class="stat-value" v-if="personalRecords.fastestMile">
              {{ formatTime(personalRecords.fastestMile, true) }}
            </p>
            <p class="stat-value" v-else>-</p>
          </div>
          <div class="stat-block">
            <p class="stat-title">Fastest 5K</p>
            <p class="stat-value" v-if="personalRecords.fastest5k">
              {{ formatTime(personalRecords.fastest5k, true) }}
            </p>
            <p class="stat-value" v-else>-</p>
          </div>
          <div class="stat-block">
            <p class="stat-title">Fastest 10K</p>
            <p class="stat-value" v-if="personalRecords.fastest10k">
              {{ formatTime(personalRecords.fastest10k, true) }}
            </p>
            <p class="stat-value" v-else>-</p>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <!-- Shoes Card -->
    <ion-card class="styled-card">
      <ion-card-header>
        <ion-card-title>My Shoes</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list lines="none" v-if="userShoes.length > 0">
          <ion-item
            v-for="shoe in userShoes"
            :key="shoe.id"
            button
            @click="$emit('openShoeDetailModal', shoe)"
            class="run-history-item"
          >
            <ion-label>
              <h2>{{ shoe.brandName }}</h2>
              <p>{{ shoe.modelName }}</p>
            </ion-label>
            <ion-note slot="end" class="shoe-mileage-note"
              >{{ shoe.totalDistance.toFixed(2) }} mi</ion-note
            >
          </ion-item>
        </ion-list>
        <p v-else class="ion-text-center no-data-text">
          You haven't added any shoes yet.
        </p>
        <ion-button
          expand="block"
          fill="outline"
          @click="$emit('openAddShoeModal')"
          class="ion-margin-top"
          >Add New Shoe</ion-button
        >
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
                @click="$emit('deleteRun', index)"
              >
                <ion-icon slot="icon-only" :icon="trash"></ion-icon>
              </ion-button>
            </div>
            <p v-if="run.description" class="run-description">
              "{{ run.description }}"
            </p>
            <!-- MAP CONTAINER -->
            <div
              v-if="run.route && run.route.length > 0"
              :ref="(el) => setMapRef('run-' + run.id, el)"
              class="run-card-map"
            ></div>
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

            <div v-if="run.shoeName" class="run-shoe-tag">
              <ion-icon :icon="footsteps"></ion-icon>
              <span>{{ run.shoeName }}</span>
            </div>
            <!-- Run History Shoe Dropdown -->
            <div
              v-else-if="userShoes.length > 0"
              class="add-shoe-to-run-container"
            >
              <ion-item lines="none" class="add-shoe-select-item">
                <ion-select
                  interface="popover"
                  placeholder="Add a shoe"
                  @ionChange="
                    (event) =>
                      $emit('addShoeToPastRun', run, event.detail.value)
                  "
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
            </div>
          </div>
        </ion-list>
        <ion-button
          v-if="visibleRunsCount < runHistory.length"
          @click="$emit('showMoreRuns')"
          expand="block"
          fill="outline"
          class="ion-margin-top"
          >See More</ion-button
        >
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script setup>
import { computed } from "vue";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonNote,
} from "@ionic/vue";
import { trash, footsteps } from "ionicons/icons";

// Capture Props
const props = defineProps({
  displayName: String,
  photoURL: String,
  currentLevel: Object,
  xp: Number,
  progress: Number,
  totalDistance: Number,
  totalTime: Number,
  formatTime: Function,
  userShoes: Array,
  displayedRuns: Array,
  runHistory: Array,
  visibleRunsCount: Number,
  setMapRef: Function,
});

defineEmits([
  "openShoeDetailModal",
  "openAddShoeModal",
  "deleteRun",
  "addShoeToPastRun",
  "showMoreRuns",
]);

// --- Personal Records Computed ---
const personalRecords = computed(() => {
  const runs = props.runHistory || [];
  if (runs.length === 0) {
    return {
      longestDistance: 0,
      fastestMile: null,
      fastest5k: null,
      fastest10k: null,
    };
  }

  // Longest distance
  const longest = Math.max(...runs.map((r) => r.distance || 0));

  // Helper to find fastest time for a target distance
  const getFastestTime = (targetDist, tolerance = 0.2) => {
    const candidates = runs.filter(
      (r) =>
        r.distance >= targetDist - tolerance &&
        r.distance <= targetDist + tolerance &&
        r.time
    );
    if (candidates.length === 0) return null;
    return Math.min(...candidates.map((r) => r.time));
  };

  return {
    longestDistance: longest,
    fastestMile: getFastestTime(1),
    fastest5k: getFastestTime(3.1),
    fastest10k: getFastestTime(6.2),
  };
});
</script>

<style scoped>
/* Profile Page Specific Styles */
.profile-stats-card {
  --padding-start: 1rem;
  --padding-end: 1rem;
  --padding-top: 1.5rem;
  --padding-bottom: 1.5rem;
}

.stat-block .stat-title {
  font-size: 0.8rem;
  color: #d1d5db;
  text-transform: uppercase;
}
.stat-block .stat-value {
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
}
/* Shoe Specific Styles */
.run-shoe-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #d1d5db;
  margin-top: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 12px;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}
.add-shoe-to-run-container {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
.add-shoe-select-item {
  --background: rgba(255, 255, 255, 0.1);
  --padding-start: 0;
  --inner-padding-end: 0;
  --inner-padding-top: 0;
  --inner-padding-bottom: 0;
  --min-height: unset;
  border-radius: 12px;
  width: fit-content;
}
.add-shoe-select-item ion-select {
  font-size: 0.8rem;
  --padding-start: 8px;
  --padding-end: 8px;
  --padding-top: 4px;
  --padding-bottom: 4px;
  color: #d1d5db;
}
.shoe-mileage-note {
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
}
/* Style for the shoe list items */
.run-history-item ion-label h2 {
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.run-history-item ion-label p {
  color: #f0f0f0;
  font-size: 0.9rem;
}

/* PR Styles */
.profile-pr-stats {
  margin-top: 1.5rem;
}

.pr-header {
  font-size: 1rem;
  font-weight: 600;
  color: #ffc409;
  margin-bottom: 0.5rem;
}

.pr-blocks {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.pr-block .stat-title {
  font-size: 0.75rem;
  color: #d1d5db;
  text-transform: uppercase;
}

.pr-block .stat-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
}

.profile-stats-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
}

.profile-stats-grid .stat-block {
  flex: 1 1 40%;
  min-width: 120px;
}

/* Unified Stats Grid */
.profile-stats-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
  text-align: center;
}

/* Divider label inside grid */
.stats-divider {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 1.25rem 0 0.5rem;
}

.stats-divider::before,
.stats-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
}

.stats-divider::before {
  margin-right: 0.75rem;
}

.stats-divider::after {
  margin-left: 0.75rem;
}

.stats-divider span {
  font-size: 1rem;
  font-weight: 600;
  color: #facc15;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
</style>
