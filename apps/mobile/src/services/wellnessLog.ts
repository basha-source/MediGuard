import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { FIRESTORE, WellnessLog } from "@mediguard/shared";

// Local-time YYYY-MM-DD. Built manually from get*() so we don't depend on the
// device's locale string format (toLocaleDateString output varies on Android).
export function todayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function shiftDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Doc id is `${userId}_${date}` so re-saving the same day overwrites.
export async function saveWellnessLog(
  input: Omit<WellnessLog, "id" | "createdAt">
): Promise<void> {
  const id = `${input.userId}_${input.date}`;
  await setDoc(doc(getDb(), FIRESTORE.WELLNESS_LOGS, id), {
    ...input,
    createdAt: new Date().toISOString(),
  });
}

export async function getTodayLog(userId: string): Promise<WellnessLog | null> {
  const id = `${userId}_${todayDateString()}`;
  const snap = await getDoc(doc(getDb(), FIRESTORE.WELLNESS_LOGS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<WellnessLog, "id">) };
}

// Returns logs for the last N days (inclusive of today), sorted by date ASC.
export async function getLogsRange(
  userId: string,
  days: number
): Promise<WellnessLog[]> {
  const today = todayDateString();
  const startDate = shiftDays(today, -(days - 1));
  const q = query(
    collection(getDb(), FIRESTORE.WELLNESS_LOGS),
    where("userId", "==", userId),
    where("date", ">=", startDate),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WellnessLog, "id">),
  }));
}

export async function getAllLogs(userId: string): Promise<WellnessLog[]> {
  const q = query(
    collection(getDb(), FIRESTORE.WELLNESS_LOGS),
    where("userId", "==", userId),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WellnessLog, "id">),
  }));
}

// Consecutive days from today backward where a log exists. Today not logged => 0.
export function computeStreak(logs: WellnessLog[]): number {
  if (logs.length === 0) return 0;
  const dateSet = new Set(logs.map((l) => l.date));
  let streak = 0;
  let cursor = todayDateString();
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

export type WellnessStats = {
  avgMood: number;       // rounded to 1 decimal; 0 if no logs
  avgEnergy: number;
  avgPain: number;
  avgSleep: number;
  totalLogs: number;
  bestDay: string | null;   // date of highest mood (ties: most recent)
  worstDay: string | null;  // date of lowest mood (ties: most recent)
};

export function computeStats(logs: WellnessLog[]): WellnessStats {
  if (logs.length === 0) {
    return {
      avgMood: 0,
      avgEnergy: 0,
      avgPain: 0,
      avgSleep: 0,
      totalLogs: 0,
      bestDay: null,
      worstDay: null,
    };
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  const n = logs.length;
  const sum = logs.reduce(
    (acc, l) => {
      acc.mood += l.mood;
      acc.energy += l.energy;
      acc.pain += l.pain;
      acc.sleep += l.sleepHours;
      return acc;
    },
    { mood: 0, energy: 0, pain: 0, sleep: 0 }
  );

  // For ties on mood, prefer the most recent date.
  let bestDay: string | null = null;
  let worstDay: string | null = null;
  let bestMood = -Infinity;
  let worstMood = Infinity;
  for (const l of logs) {
    if (
      l.mood > bestMood ||
      (l.mood === bestMood && bestDay !== null && l.date >= bestDay)
    ) {
      bestMood = l.mood;
      bestDay = l.date;
    }
    if (
      l.mood < worstMood ||
      (l.mood === worstMood && worstDay !== null && l.date >= worstDay)
    ) {
      worstMood = l.mood;
      worstDay = l.date;
    }
  }

  return {
    avgMood: round1(sum.mood / n),
    avgEnergy: round1(sum.energy / n),
    avgPain: round1(sum.pain / n),
    avgSleep: round1(sum.sleep / n),
    totalLogs: n,
    bestDay,
    worstDay,
  };
}
