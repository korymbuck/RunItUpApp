<template>
  <div class="ion-padding">
    <ion-button
      expand="block"
      @click="$emit('openFollowModal')"
      class="ion-margin-bottom yellow-button"
    >
      <ion-icon slot="start" :icon="people"></ion-icon>
      Follow a New User
    </ion-button>

    <div v-if="friends.length > 0" class="friend-list">
      <div
        v-for="friend in sortedFriends"
        :key="friend.uid"
        class="friend-card-refined styled-card"
      >
        <!-- Card Header -->
        <div class="friend-main-info">
          <img
            :src="friend.photoURL || '/default-avatar.png'"
            class="friend-avatar"
            @click="$emit('openUserProfileModal', friend)"
          />
          <div
            class="friend-details"
            @click="$emit('openUserProfileModal', friend)"
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
            @click="$emit('unfollowUser', friend)"
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
          <p
            v-if="friend.stats?.lastRun?.date"
            class="latest-run-date-subtitle"
          >
            {{
              new Date(friend.stats.lastRun.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            }}
          </p>
          <!-- Run Description -->
          <p
            v-if="
              friend.stats &&
              friend.stats.lastRun &&
              friend.stats.lastRun.description
            "
            class="run-description"
          >
            "{{ friend.stats.lastRun.description }}"
          </p>
          <!-- MAP CONTAINER-->
          <div
            v-if="
              friend.stats?.lastRun?.route &&
              friend.stats.lastRun.route.length > 0
            "
            :ref="(el) => setMapRef('friend-' + friend.uid, el)"
            class="run-card-map"
          ></div>

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
</template>

<script setup>
import { IonButton, IonIcon, IonProgressBar } from "@ionic/vue";
import { people, trash, rocket, timeOutline } from "ionicons/icons";

defineProps({
  friends: Array,
  sortedFriends: Array,
  formatTime: Function,
  getLevelForXp: Function,
  getProgressForXp: Function,
  setMapRef: Function,
});

defineEmits(["openFollowModal", "openUserProfileModal", "unfollowUser"]);
</script>

<style scoped>
/* Friend Card Specific Styles */
.friend-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.friend-card-refined {
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
  cursor: pointer;
}

.friend-details {
  flex-grow: 1;
  cursor: pointer;
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

.friend-latest-run {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
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

.latest-run-date-subtitle {
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fbbf24;
  margin-top: 0;
  margin-bottom: 0.75rem;
}
</style>
