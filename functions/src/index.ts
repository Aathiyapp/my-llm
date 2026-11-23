import {setGlobalOptions} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {initializeApp} from "firebase-admin/app";
import {FieldValue, Timestamp, getFirestore} from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();
const REGION = "asia-south1";
const INACTIVITY_MS = 30 * 24 * 60 * 60 * 1000;

setGlobalOptions({maxInstances: 10, region: REGION});

/**
 * Update the creator's last genuine recorded storefront-view timestamp.
 * The Firestore rules restrict event creation to published profiles and
 * require the event username to match the profile username.
 */
export const recordCreatorStoreView = onDocumentCreated(
  {document: "analyticsEvents/{eventId}", region: REGION},
  async (event) => {
    const data = event.data?.data();
    if (!data || data.type !== "store_view" || typeof data.creatorId !== "string" || typeof data.username !== "string") return;
    const profileRef = db.collection("creatorProfiles").doc(data.creatorId);
    const profile = await profileRef.get();
    if (!profile.exists || profile.get("published") !== true || profile.get("username") !== data.username) return;
    await profileRef.update({
      lastStoreViewAt: event.data?.createTime ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
);

/**
 * Unpublish creator stores with no recorded storefront views for 30 days.
 * The clock starts at the last recorded view, or account creation for a store
 * that has never received a view. Profiles without a valid creation timestamp
 * are skipped for manual review rather than being suspended unexpectedly.
 */
export const suspendInactiveCreatorStores = onSchedule(
  {schedule: "every day 03:00", timeZone: "Asia/Kolkata", region: REGION},
  async () => {
    const snapshot = await db.collection("creatorProfiles").where("published", "==", true).get();
    const now = Date.now();
    let suspended = 0;
    let skipped = 0;
    let batch = db.batch();
    let pending = 0;

    for (const profile of snapshot.docs) {
      const lastView = profile.get("lastStoreViewAt");
      const createdAt = profile.get("createdAt");
      const activity = lastView instanceof Timestamp ? lastView : createdAt instanceof Timestamp ? createdAt : null;
      if (!activity) {
        skipped++;
        continue;
      }
      if (now - activity.toMillis() < INACTIVITY_MS) continue;

      batch.update(profile.ref, {
        published: false,
        suspendedAt: FieldValue.serverTimestamp(),
        suspensionReason: "no_store_views_30_days",
        updatedAt: FieldValue.serverTimestamp(),
      });
      suspended++;
      pending++;
      if (pending === 400) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }

    if (pending > 0) await batch.commit();
    console.info("Inactive storefront sweep completed", {suspended, skipped, scanned: snapshot.size});
  },
);
