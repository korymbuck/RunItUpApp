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

defineProps({
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
  color: #ffffff; /* Ensure brand name is white */
  font-size: 1.1rem; /* Increase font size */
  font-weight: 600;
  margin-bottom: 4px; /* Add a little space between brand and model */
}

.run-history-item ion-label p {
  color: #f0f0f0; /* Change model name from grey to a bright off-white */
  font-size: 0.9rem; /* Increase font size */
}
</style>
