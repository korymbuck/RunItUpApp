<template>
  <div class="ion-padding">
    <!-- Run Clubs Section -->
    <ion-card class="styled-card">
      <ion-card-header>
        <ion-card-title>Run Clubs</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div class="run-club-actions">
          <ion-button
            @click="$emit('openCreateClubModal')"
            class="yellow-button"
            ><ion-icon :icon="addCircleOutline" slot="start"></ion-icon>Create
            Club</ion-button
          >
          <ion-button fill="outline" @click="$emit('openJoinClubModal')"
            ><ion-icon :icon="logInOutline" slot="start"></ion-icon>Join
            Club</ion-button
          >
        </div>

        <ion-list v-if="runClubs.length > 0" lines="none">
          <ion-item
            v-for="club in runClubs"
            :key="club.id"
            button
            @click="$emit('openRunClubDetailModal', club)"
            class="run-club-item"
          >
            <ion-avatar slot="start" class="run-club-avatar">
              <img :src="club.clubPictureURL || '/default-avatar.png'" />
            </ion-avatar>
            <ion-label>
              <h2>{{ club.clubName }}</h2>
            </ion-label>
          </ion-item>
        </ion-list>

        <p v-else class="ion-text-center ion-padding-top no-data-text">
          You haven't joined any run clubs yet.
        </p>
      </ion-card-content>
    </ion-card>

    <!-- Social Feed Header -->
    <div class="feed-header">
      <h2 class="feed-title">Your Feed</h2>
      <ion-button @click="$emit('openFollowModal')" class="follow-icon-button">
        <ion-icon slot="icon-only" :icon="personAddOutline"></ion-icon>
      </ion-button>
    </div>

    <!-- Friend Feed List -->
    <div v-if="friends.length > 0" class="friend-list">
      <ion-card
        v-for="friend in sortedFriends"
        :key="friend.uid"
        class="styled-card friend-card"
      >
        <ion-card-content>
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

          <div v-if="friend.stats" class="friend-progress">
            <ion-progress-bar
              :value="getProgressForXp(friend.stats.xp)"
              color="warning"
            ></ion-progress-bar>
          </div>

          <div class="stats-divider">
            <span>Latest Run</span>
          </div>

          <div v-if="friend.stats && friend.stats.lastRun" class="latest-run">
            <div class="run-history-header">
              <h2>
                {{ new Date(friend.stats.lastRun.date).toLocaleDateString() }}
              </h2>
            </div>
            <p v-if="friend.stats.lastRun.description" class="run-description">
              "{{ friend.stats.lastRun.description }}"
            </p>
            <div
              v-if="
                friend.stats.lastRun.route &&
                friend.stats.lastRun.route.length > 0
              "
              :ref="(el) => setMapRef('friend-' + friend.uid, el)"
              class="run-card-map"
            ></div>
            <div class="run-stats-grid">
              <div class="stat-block">
                <p class="stat-title">Distance</p>
                <p class="stat-value">
                  {{ friend.stats.lastRun.distance.toFixed(2) }} mi
                </p>
              </div>
              <div class="stat-block">
                <p class="stat-title">Time</p>
                <p class="stat-value">
                  {{ formatTime(friend.stats.lastRun.time, true) }}
                </p>
              </div>
              <div class="stat-block">
                <p class="stat-title">Avg Pace</p>
                <p class="stat-value">
                  {{ formatTime(friend.stats.lastRun.pace) }}
                </p>
              </div>
            </div>
          </div>
          <p v-else class="ion-text-center no-data-text">No recent runs</p>

          <div class="stats-divider">
            <span>Lifetime Stats</span>
          </div>

          <div class="lifetime-stats-grid">
            <div class="stat-block">
              <p class="stat-title">Total Distance</p>
              <p class="stat-value">
                {{ friend.stats ? friend.stats.totalDistance.toFixed(2) : 0 }}
                mi
              </p>
            </div>
            <div class="stat-block">
              <p class="stat-title">Total Time</p>
              <p class="stat-value">
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
    </div>

    <!-- Empty State -->
    <div v-else class="empty-feed">
      <ion-icon :icon="peopleCircleOutline" class="empty-feed-icon"></ion-icon>
      <h3>Your feed is looking empty</h3>
      <p>Follow other runners to see their activity here!</p>
    </div>
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
  IonAvatar,
} from "@ionic/vue";
import {
  trash,
  addCircleOutline,
  logInOutline,
  personAddOutline,
  peopleCircleOutline,
} from "ionicons/icons";

defineProps({
  friends: Array,
  sortedFriends: Array,
  formatTime: Function,
  getLevelForXp: Function,
  getProgressForXp: Function,
  setMapRef: Function,
  runClubs: Array,
});

defineEmits([
  "openFollowModal",
  "openUserProfileModal",
  "unfollowUser",
  "openCreateClubModal",
  "openJoinClubModal",
  "openRunClubDetailModal",
]);
</script>

<style scoped>
/* GENERAL & INHERITED STYLES */
.styled-card {
  margin-bottom: 1.5rem;
}
.styled-card ion-card-title {
  color: #ffffff;
}
.yellow-button {
  --background: #fbbf24;
  --color: #1a1a1a;
  --border-radius: 12px;
  font-weight: 600;
}
.no-data-text {
  color: rgba(255, 255, 255, 0.6);
}
.stat-block {
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
  line-height: 1.2;
}

/* RUN CLUBS SECTION */
.run-club-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.run-club-item {
  --background: rgba(255, 255, 255, 0.1);
  --border-radius: 12px;
  margin-bottom: 0.5rem;
}
.run-club-item h2 {
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 600;
}
.run-club-avatar {
  border: 2px solid var(--ion-color-primary);
}

/* FEED HEADER */
.feed-header {
  position: relative;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2.5rem 0 1.5rem 0;
}
.feed-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}
.follow-icon-button {
  --background: #fbbf24;
  --color: #1a1a1a;
  --border-radius: 12px;
  --box-shadow: none;
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
}

/* FRIEND CARD */
.friend-list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
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
.unfollow-button {
  margin-left: auto;
}
.friend-progress {
  width: 100%;
  margin-top: 1rem;
}

/* DIVIDER */
.stats-divider {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 1.5rem 0 1rem 0;
}
.stats-divider::before,
.stats-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
}
.stats-divider span {
  font-size: 0.9rem;
  font-weight: 600;
  color: #facc15;
  padding: 0 0.75rem;
  text-transform: uppercase;
}

/* LATEST RUN */
.run-history-header {
  margin-bottom: 0.5rem;
}
.run-history-header h2 {
  color: #ffffff;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  width: 100%;
  text-align: center;
  margin-bottom: 0.5rem;
}
.run-description {
  font-style: italic;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1rem;
  text-align: center;
}
.run-card-map {
  height: 150px;
  border-radius: 8px;
  background-color: #333;
  margin-bottom: 1rem;
}
.run-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.lifetime-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  text-align: center;
}

/* EMPTY FEED STATE */
.empty-feed {
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(255, 255, 255, 0.6);
}
.empty-feed-icon {
  font-size: 4rem;
  color: rgba(255, 255, 255, 0.3);
}
.empty-feed h3 {
  margin-top: 1rem;
  font-size: 1.2rem;
  color: #fff;
}
</style>
