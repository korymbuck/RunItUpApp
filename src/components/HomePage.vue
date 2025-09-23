<template>
  <div class="ion-padding">
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
          @click="$emit('openRunActionSheet')"
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
          <ion-button fill="clear" @click="$emit('goToPreviousWeek')">
            <ion-icon slot="icon-only" :icon="chevronBack"></ion-icon>
          </ion-button>
          <ion-button
            fill="clear"
            @click="$emit('goToNextWeek')"
            :disabled="currentWeekOffset === 0"
          >
            <ion-icon slot="icon-only" :icon="chevronForward"></ion-icon>
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
          <!-- Chart Bars -->
          <div
            v-for="data in weeklyChartData"
            :key="data.day"
            class="chart-bar-wrapper"
          >
            <div class="chart-bar" :style="{ height: data.height + '%' }">
              <span v-if="data.distance > 0" class="bar-value">
                {{ data.distance.toFixed(1) }}
              </span>
            </div>
            <p class="chart-label">{{ data.day }}</p>
          </div>
        </div>
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
  IonIcon,
  IonProgressBar,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/vue";
import {
  rocket,
  timeOutline,
  chevronForward,
  chevronBack,
  walk,
} from "ionicons/icons";

defineProps({
  animatedTotalDistance: Number,
  animatedTotalTime: Number,
  animatedXp: Number,
  currentLevel: Object,
  progress: Number,
  formatTime: Function,
  weeklyChartData: Array,
  weeklyTotalDistance: Number,
  currentWeekStart: Date,
  currentWeekEnd: Date,
  currentWeekOffset: Number,
});

defineEmits(["openRunActionSheet", "goToPreviousWeek", "goToNextWeek"]);
</script>

<style scoped>
:deep(.profile-stats-card) {
  --padding-start: 1rem;
  --padding-end: 1rem;
  --padding-top: 1.5rem;
  --padding-bottom: 1.5rem;
}

:deep(.stat-block .stat-title) {
  font-size: 0.8rem;
  color: #d1d5db;
  text-transform: uppercase;
}

:deep(.stat-block .stat-value) {
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
}
.styled-card ion-card-title {
  color: #ffffff; /* Explicitly set the title color to white */
}

.run-action-card {
  padding: 8px;
}
.run-button {
  --padding-top: 20px;
  --padding-bottom: 20px;
  font-size: 1.2rem;
}
.summary-stat-item .stat-value.small {
  font-size: 1.5rem;
}

/* Weekly Chart Styles */
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
  color: #ffffff;
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
  min-height: 2px;
}
.bar-value {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: white;
  opacity: 1;
  transition: opacity 0.3s;
  padding: 2px 4px;
  border-radius: 3px;
}
.chart-label {
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}
</style>
