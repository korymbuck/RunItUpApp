const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { log } = require("firebase-functions/logger");

initializeApp();
const db = getFirestore();

// THIS FUNCTION IS CORRECT AND REMAINS THE SAME
exports.calculateWeeklyWinner = onSchedule(
  {
    schedule: "every sunday 00:05",
    // CHANGED: Timezone updated to Central Time
    timeZone: "America/Chicago",
  },
  async (event) => {
    log("Starting weekly winner calculation job for Central Time.");

    const scheduledTimeInCT = new Date(event.scheduleTime);
    const [todayStr] = scheduledTimeInCT
      .toLocaleString("en-CA", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .split(", ");

    const todayInCT = new Date(`${todayStr}T12:00:00Z`);
    const dayOfWeek = todayInCT.getUTCDay();

    const endOfLastWeek = new Date(todayInCT);
    endOfLastWeek.setUTCDate(todayInCT.getUTCDate() - dayOfWeek);
    // CHANGED: UTC offset for Central Time (CDT is UTC-5)
    endOfLastWeek.setUTCHours(5, 0, 0, 0); // 5 AM UTC = Midnight CDT

    const startOfLastWeek = new Date(endOfLastWeek);
    startOfLastWeek.setDate(endOfLastWeek.getDate() - 7);

    const logDateRange =
      `Calculating for week: ` +
      `${startOfLastWeek.toISOString()} to ${endOfLastWeek.toISOString()}`;
    log(logDateRange);

    const clubsSnapshot = await db.collection("runClubs").get();
    if (clubsSnapshot.empty) {
      log("No run clubs found.");
      return null;
    }

    for (const clubDoc of clubsSnapshot.docs) {
      const clubId = clubDoc.id;
      const clubData = clubDoc.data();
      log(`Processing club: ${clubData.name} (${clubId})`);

      const membersSnapshot = await db
        .collection(`runClubs/${clubId}/members`)
        .get();
      if (membersSnapshot.empty) {
        log(`Club ${clubData.name} has no members. Skipping.`);
        continue;
      }

      const weeklyDistances = [];
      for (const memberDoc of membersSnapshot.docs) {
        const memberId = memberDoc.id;
        const memberData = memberDoc.data();
        const runsSnapshot = await db
          .collection("runs")
          .where("userId", "==", memberId)
          .where("timestamp", ">=", startOfLastWeek)
          .where("timestamp", "<", endOfLastWeek)
          .get();
        const totalDistance = runsSnapshot.docs.reduce(
          (sum, doc) => sum + doc.data().distance,
          0
        );
        if (totalDistance > 0) {
          weeklyDistances.push({
            userId: memberId,
            displayName: memberData.displayName,
            photoURL: memberData.photoURL || null,
            distance: totalDistance,
          });
        }
      }

      if (weeklyDistances.length > 0) {
        weeklyDistances.sort((a, b) => b.distance - a.distance);
        const winner = weeklyDistances[0];
        const logMessage =
          `Winner for ${clubData.name} is ` +
          `${winner.displayName} with ${winner.distance} miles.`;
        log(logMessage);

        const weekIdentifier = startOfLastWeek.toISOString().split("T")[0];
        await db
          .collection(`runClubs/${clubId}/weeklyWinners`)
          .doc(weekIdentifier)
          .set({
            ...winner,
            weekOf: startOfLastWeek,
          });
      } else {
        const logMessage =
          "No runs recorded for any member in " + `${clubData.name} last week.`;
        log(logMessage);
      }
    }
    log("Weekly winner calculation job finished.");
    return null;
  }
);

// THIS IS THE NEW, ROBUST BACKFILL FUNCTION
exports.backfillLastWinner = onCall(async (request) => {
  log("Starting FINAL MANUAL Central Time backfill job.");

  const now = new Date();
  const [todayStr] = now
    .toLocaleString("en-CA", {
      // CHANGED: Timezone updated to Central Time
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split(", ");

  const todayInCT = new Date(`${todayStr}T12:00:00Z`);
  const dayOfWeek = todayInCT.getUTCDay();

  const endOfLastWeek = new Date(todayInCT);
  endOfLastWeek.setUTCDate(todayInCT.getUTCDate() - dayOfWeek);
  // CHANGED: UTC offset for Central Time (CDT is UTC-5)
  endOfLastWeek.setUTCHours(5, 0, 0, 0); // 5 AM UTC = Midnight CDT

  const startOfLastWeek = new Date(endOfLastWeek);
  startOfLastWeek.setDate(endOfLastWeek.getDate() - 7);

  const logDateRange =
    `Backfilling for week: ` +
    `${startOfLastWeek.toISOString()} to ${endOfLastWeek.toISOString()}`;
  log(logDateRange);

  const clubsSnapshot = await db.collection("runClubs").get();
  if (clubsSnapshot.empty) {
    return { success: true, message: "No clubs to process." };
  }

  for (const clubDoc of clubsSnapshot.docs) {
    const clubId = clubDoc.id;
    const clubData = clubDoc.data();
    log(`Backfilling for club: ${clubData.name}`);

    const membersSnapshot = await db
      .collection(`runClubs/${clubId}/members`)
      .get();
    if (membersSnapshot.empty) continue;

    const weeklyDistances = [];
    for (const memberDoc of membersSnapshot.docs) {
      const memberId = memberDoc.id;
      const memberData = memberDoc.data();
      const runsSnapshot = await db
        .collection("runs")
        .where("userId", "==", memberId)
        .where("timestamp", ">=", startOfLastWeek)
        .where("timestamp", "<", endOfLastWeek)
        .get();
      const totalDistance = runsSnapshot.docs.reduce(
        (sum, doc) => sum + doc.data().distance,
        0
      );
      if (totalDistance > 0) {
        weeklyDistances.push({
          userId: memberId,
          displayName: memberData.displayName,
          photoURL: memberData.photoURL || null,
          distance: totalDistance,
        });
      }
    }

    if (weeklyDistances.length > 0) {
      weeklyDistances.sort((a, b) => b.distance - a.distance);
      const winner = weeklyDistances[0];
      log(`Winner for ${clubData.name} is ${winner.displayName}`);
      const weekIdentifier = startOfLastWeek.toISOString().split("T")[0];
      await db
        .collection(`runClubs/${clubId}/weeklyWinners`)
        .doc(weekIdentifier)
        .set({
          ...winner,
          weekOf: startOfLastWeek,
        });
    }
  }
  log("Manual backfill job finished.");
  return { success: true, message: "Backfill complete." };
});
