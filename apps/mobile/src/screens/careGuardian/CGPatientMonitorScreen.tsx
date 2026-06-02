import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { getDb } from "@mediguard/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  getDoc,
  doc,
} from "firebase/firestore";
import { useAuthStore } from "@/store/authStore";

// ─── Constants ───────────────────────────────────────────────────────────────

const TEAL = "#00695C";

// ─── Types ────────────────────────────────────────────────────────────────────

type DoseEntry = {
  id: string;
  medicineName: string;
  scheduledTime: string; // "08:00"
  status: "taken" | "missed" | "pending" | "snoozed";
  takenAt?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

/** Convert "08:00" → "8:00 AM" / "14:00" → "2:00 PM" */
function formatScheduledTime(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

/** Convert ISO takenAt → "8:03 AM" */
function formatTakenAt(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

/** Derive today's date string for Firestore query */
function todayString(): string {
  return new Date().toISOString().split("T")[0]!;
}

/** Returns true if scheduledTime "HH:MM" was more than 30 minutes ago */
function isOverdue(scheduledTime: string): boolean {
  const [hStr, mStr] = scheduledTime.split(":");
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
  return now.getTime() - scheduled.getTime() > 30 * 60 * 1000;
}

/** Effective display status: treat overdue pending as missed */
function effectiveStatus(entry: DoseEntry): "taken" | "missed" | "pending" | "snoozed" {
  if (entry.status === "pending" && isOverdue(entry.scheduledTime)) return "missed";
  return entry.status;
}

/** Human-readable today label, e.g. "Today — Tuesday 27 May" */
function todayLabel(): string {
  return (
    "Today — " +
    new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  );
}

// ─── Dose Card ────────────────────────────────────────────────────────────────

function DoseCard({ entry }: { entry: DoseEntry }) {
  const status = effectiveStatus(entry);

  const statusConfig = {
    taken: {
      icon: "✅",
      color: Colors.primary,
      label: entry.takenAt ? `Taken at ${formatTakenAt(entry.takenAt)}` : "Taken",
      badgeBg: Colors.primaryPale,
    },
    missed: {
      icon: "❌",
      color: Colors.alertRed,
      label: "Missed",
      badgeBg: Colors.redPale,
    },
    pending: {
      icon: "⏳",
      color: Colors.orange,
      label: "Pending",
      badgeBg: Colors.orangePale,
    },
    snoozed: {
      icon: "⏰",
      color: Colors.orange,
      label: "Snoozed",
      badgeBg: Colors.orangePale,
    },
  }[status];

  return (
    <View style={[s.card, status === "missed" && s.cardMissed]}>
      {/* Left: clock icon + time + medicine */}
      <View style={s.cardIconWrap}>
        <Ionicons name="time-outline" size={22} color={TEAL} />
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardTime}>{formatScheduledTime(entry.scheduledTime)}</Text>
        <Text style={s.cardMedicine}>{entry.medicineName}</Text>
        {/* Status badge */}
        <View style={[s.badge, { backgroundColor: statusConfig.badgeBg }]}>
          <Text style={[s.badgeText, { color: statusConfig.color }]}>
            {statusConfig.icon} {statusConfig.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function CGPatientMonitorScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("Patient");
  const [doseLogs, setDoseLogs] = useState<DoseEntry[]>([]);
  const [lastActive, setLastActive] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);

  // ── Step 1: Fetch linked patient ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    let unsubscribeDoses: (() => void) | null = null;

    async function fetchPatient() {
      try {
        const db = getDb();
        const linksSnap = await getDocs(
          query(
            collection(db, FIRESTORE.CG_LINKS),
            where("guardianId", "==", user!.id)
          )
        );

        if (linksSnap.empty) {
          setPatientId(null);
          setLoading(false);
          return;
        }

        const linkedPatientId = linksSnap.docs[0]!.data().patientId as string;
        setPatientId(linkedPatientId);

        // Get patient name
        const patientDoc = await getDoc(doc(db, FIRESTORE.USERS, linkedPatientId));
        const name = (patientDoc.data()?.name as string) ?? "Patient";
        setPatientName(name);

        // ── Step 2: Live dose logs for today ────────────────────────────────
        const today = todayString();
        unsubscribeDoses = onSnapshot(
          query(
            collection(db, FIRESTORE.DOSE_LOGS),
            where("userId", "==", linkedPatientId),
            where("date", "==", today)
          ),
          (snap) => {
            const logs = snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<DoseEntry, "id">),
            })) as DoseEntry[];

            // Sort by scheduledTime ascending
            logs.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
            setDoseLogs(logs);

            // Compute lastActive from most recent takenAt
            const takenLogs = logs.filter((l) => l.takenAt);
            if (takenLogs.length > 0) {
              const latest = takenLogs.reduce((prev, cur) =>
                (cur.takenAt ?? "") > (prev.takenAt ?? "") ? cur : prev
              );
              setLastActive(latest.takenAt ?? null);
            }

            setLoading(false);
          },
          () => {
            setLoading(false);
          }
        );
      } catch {
        setLoading(false);
      }
    }

    fetchPatient();

    return () => {
      unsubscribeDoses?.();
    };
  }, [user?.id]);

  // ── Step 3: Send Reminder ─────────────────────────────────────────────────
  const handleSendReminder = useCallback(() => {
    if (!patientId) return;

    Alert.alert(
      "Send Reminder",
      `Send a medicine reminder to ${patientName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          style: "default",
          onPress: async () => {
            setSendingReminder(true);
            try {
              const db = getDb();
              await addDoc(collection(db, FIRESTORE.NOTIFICATIONS), {
                userId: patientId,
                title: "Reminder from Care Guardian",
                body: "Your Care Guardian is reminding you to take your medicine.",
                type: "careGuardian",
                read: false,
                createdAt: new Date().toISOString(),
              });
              Alert.alert("Sent!", `Reminder delivered to ${patientName}.`);
            } catch {
              Alert.alert("Error", "Failed to send reminder. Please try again.");
            } finally {
              setSendingReminder(false);
            }
          },
        },
      ]
    );
  }, [patientId, patientName]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const lastActiveLabel = lastActive
    ? `Last active: ${getTimeAgo(lastActive)}`
    : "Last active: unknown";

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={s.headerTexts}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {patientId ? `Monitoring: ${patientName}` : "No Patient Linked"}
          </Text>
          {patientId ? (
            <Text style={s.headerSubtitle}>{lastActiveLabel}</Text>
          ) : null}
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : !patientId ? (
        /* No patient state */
        <View style={s.centered}>
          <View style={s.emptyCard}>
            <Ionicons name="person-add-outline" size={48} color={Colors.textSecondary} />
            <Text style={s.emptyTitle}>No patient linked yet</Text>
            <Text style={s.emptyBody}>
              Ask your patient for their MG-XXXX code and link via Care Guardian Login.
            </Text>
          </View>
        </View>
      ) : (
        /* Dose list + button */
        <View style={s.listContainer}>
          <FlatList
            data={doseLogs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={s.dateLabel}>{todayLabel()}</Text>
            }
            ListEmptyComponent={
              <View style={s.emptyCard}>
                <Ionicons name="calendar-outline" size={44} color={Colors.textSecondary} />
                <Text style={s.emptyTitle}>No doses scheduled today</Text>
                <Text style={s.emptyBody}>
                  Dose entries will appear here once the patient has medicines added.
                </Text>
              </View>
            }
            renderItem={({ item }) => <DoseCard entry={item} />}
          />

          {/* Send Reminder — fixed below list */}
          <View style={s.reminderWrap}>
            <TouchableOpacity
              style={[s.reminderBtn, sendingReminder && s.reminderBtnDisabled]}
              onPress={handleSendReminder}
              activeOpacity={0.8}
              disabled={sendingReminder}
            >
              {sendingReminder ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="notifications-outline" size={18} color={Colors.white} style={s.reminderIcon} />
                  <Text style={s.reminderText}>SEND REMINDER TO PATIENT</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    backgroundColor: TEAL,
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 2,
  },
  headerTexts: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  // Loading / empty
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 16,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // Dose card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardMissed: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.alertRed,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEAL + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTime: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  cardMedicine: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Reminder button
  reminderWrap: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  reminderBtn: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  reminderBtnDisabled: {
    opacity: 0.65,
  },
  reminderIcon: {
    marginRight: 2,
  },
  reminderText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
