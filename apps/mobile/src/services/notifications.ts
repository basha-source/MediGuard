import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, updateDoc, collection, addDoc } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { FIRESTORE } from "@mediguard/shared";

// In Expo Go SDK 53+, importing expo-notifications itself crashes because the
// module calls addPushTokenListener during init. So we only require it outside
// Expo Go. In Expo Go all push helpers become no-ops; Firestore in-app
// notifications keep working.
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";

let Notifications: typeof import("expo-notifications") | null = null;
if (!IS_EXPO_GO) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require("expo-notifications");
    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  false,
      }),
    });
  } catch {
    Notifications = null;
  }
}

export async function registerForPushNotifications() {
  if (!Notifications) return null;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export async function scheduleDoseReminder(medicineName: string, scheduledTime: Date) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "💊 Dose Reminder",
        body:  `Time to take ${medicineName}`,
        sound: true,
      },
      trigger: {
        hour:    scheduledTime.getHours(),
        minute:  scheduledTime.getMinutes(),
        repeats: true,
      },
    });
  } catch { /* silently skip */ }
}

export async function scheduleExpiryAlert(medicineName: string, daysLeft: number) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚠️ Expiry Alert",
        body:  `${medicineName} expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
        sound: true,
      },
      trigger: { seconds: 60 },
    });
  } catch { /* silently skip */ }
}

export async function saveFcmToken(userId: string, token: string) {
  try {
    await updateDoc(doc(getDb(), FIRESTORE.USERS, userId), { fcmToken: token });
  } catch {
    // non-critical — silently fail
  }
}

export async function scheduleSnoozeReminder(medicineName: string, seconds = 1800) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: "💊 Dose Reminder", body: `Take ${medicineName} now`, sound: true },
      trigger: { seconds },
    });
  } catch { /* silently skip */ }
}

export async function scheduleLowStockAlert(medicineName: string) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📦 Low Stock Alert",
        body:  `${medicineName} is running low. Time to reorder.`,
        sound: true,
      },
      trigger: { seconds: 5 },
    });
  } catch { /* silently skip */ }
}

export async function addInAppNotification(
  userId: string,
  title: string,
  body: string,
  type: "dose" | "expiry" | "refill" | "sos" | "careGuardian",
) {
  try {
    await addDoc(collection(getDb(), FIRESTORE.NOTIFICATIONS), {
      userId,
      title,
      body,
      type,
      read:      false,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // non-critical
  }
}

export async function checkAndScheduleExpiryAlerts(
  medicines: Array<{ id: string; name: string; expiryDate?: string }>,
  userId: string,
) {
  const now = Date.now();
  for (const med of medicines) {
    if (!med.expiryDate) continue;
    const daysLeft = Math.floor((new Date(med.expiryDate).getTime() - now) / 86_400_000);
    if (daysLeft >= 0 && daysLeft <= 7) {
      await scheduleExpiryAlert(med.name, daysLeft).catch(() => {});
      await addInAppNotification(
        userId,
        "⚠️ Expiry Alert",
        `${med.name} expires ${daysLeft === 0 ? "today" : `in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`}`,
        "expiry",
      ).catch(() => {});
    }
  }
}

// ── Daily Wellness Reminder ───────────────────────────────────────────────────
const WELLNESS_REMINDER_ID_KEY   = "wellnessReminderNotifId";
const WELLNESS_REMINDER_TIME_KEY = "wellnessReminderTime"; // stored as "HH:MM"

/**
 * Cancels any previously-scheduled wellness reminder, then schedules a NEW
 * repeating daily local notification at the given hour:minute.
 * Stores the new notification id and time in AsyncStorage.
 * No-op in Expo Go (matches existing pattern in this file).
 */
export async function scheduleDailyWellnessReminder(hour: number, minute: number): Promise<void> {
  if (!Notifications) return;
  // TODO: A background "check if already logged today" suppression would require
  //       a background task (expo-task-manager) — out of scope for MVP. Foreground
  //       handler may suppress when app is open and today's log exists.
  try {
    await cancelDailyWellnessReminder();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "💚 Daily Wellness Check-In",
        body:  "How are you feeling today? Take a moment to log your wellness.",
        sound: true,
      },
      trigger: { hour, minute, repeats: true },
    });
    const hh = hour.toString().padStart(2, "0");
    const mm = minute.toString().padStart(2, "0");
    await AsyncStorage.setItem(WELLNESS_REMINDER_ID_KEY, id);
    await AsyncStorage.setItem(WELLNESS_REMINDER_TIME_KEY, `${hh}:${mm}`);
  } catch { /* silently skip */ }
}

/**
 * Cancels the stored wellness reminder if any. Safe to call when none scheduled.
 */
export async function cancelDailyWellnessReminder(): Promise<void> {
  if (!Notifications) return;
  try {
    const id = await AsyncStorage.getItem(WELLNESS_REMINDER_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    await AsyncStorage.removeItem(WELLNESS_REMINDER_ID_KEY);
    await AsyncStorage.removeItem(WELLNESS_REMINDER_TIME_KEY);
  } catch { /* silently skip */ }
}

/**
 * Returns the stored time (HH:MM) or null if no reminder set.
 */
export async function getWellnessReminderTime(): Promise<{ hour: number; minute: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(WELLNESS_REMINDER_TIME_KEY);
    if (!raw) return null;
    const [hStr, mStr] = raw.split(":");
    const hour   = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);
    if (
      Number.isNaN(hour) || Number.isNaN(minute) ||
      hour < 0 || hour > 23 || minute < 0 || minute > 59
    ) {
      return null;
    }
    return { hour, minute };
  } catch {
    return null;
  }
}
