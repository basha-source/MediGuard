import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { getDb } from "@mediguard/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { useAuthStore } from "@/store/authStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL = "#00695C";

// ─── Types ────────────────────────────────────────────────────────────────────
type AlertItem = {
  id: string;
  type: "dose" | "expiry" | "refill" | "sos" | "careGuardian";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

type AlertConfig = {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAlertConfig(alert: AlertItem): AlertConfig {
  const { type, title } = alert;

  if (type === "dose") {
    if (title.toLowerCase().includes("missed")) {
      return { color: Colors.alertRed, icon: "close-circle", label: "Missed Dose" };
    }
    return { color: "#2E7D32", icon: "checkmark-circle", label: "Dose Taken" };
  }
  if (type === "expiry") {
    return { color: Colors.orange, icon: "time-outline", label: "Expiry Alert" };
  }
  if (type === "refill") {
    return { color: Colors.orange, icon: "warning-outline", label: "Low Stock" };
  }
  if (type === "careGuardian") {
    return { color: TEAL, icon: "people-outline", label: "Care Guardian" };
  }
  return { color: Colors.textSecondary, icon: "notifications-outline", label: "Notification" };
}

function formatAlertTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function AlertCard({
  item,
  onPress,
}: {
  item: AlertItem;
  onPress: (id: string) => void;
}) {
  const config = getAlertConfig(item);

  return (
    <TouchableOpacity
      style={[
        s.card,
        item.read
          ? s.cardRead
          : { borderLeftWidth: 3, borderLeftColor: config.color },
      ]}
      onPress={() => !item.read && onPress(item.id)}
      activeOpacity={item.read ? 1 : 0.7}
    >
      {/* Icon circle */}
      <View style={[s.iconCircle, { backgroundColor: config.color + "20" }]}>
        <Ionicons name={config.icon} size={22} color={config.color} />
      </View>

      {/* Text block */}
      <View style={s.cardContent}>
        <Text style={[s.cardLabel, { color: config.color }]}>{config.label}</Text>
        <Text style={s.cardBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={s.cardTime}>{formatAlertTime(item.createdAt)}</Text>
      </View>

      {/* Unread dot */}
      {!item.read && <View style={[s.unreadDot, { backgroundColor: config.color }]} />}
    </TouchableOpacity>
  );
}

function EmptyState({ patientLinked }: { patientLinked: boolean }) {
  if (!patientLinked) {
    return (
      <View style={s.emptyContainer}>
        <Ionicons name="people-outline" size={56} color={Colors.textSecondary} />
        <Text style={s.emptyTitle}>No patient linked</Text>
        <Text style={s.emptySub}>Ask your patient for their MG-XXXX code</Text>
      </View>
    );
  }
  return (
    <View style={s.emptyContainer}>
      <Ionicons name="notifications-outline" size={56} color={Colors.textSecondary} />
      <Text style={s.emptyTitle}>No alerts yet</Text>
      <Text style={s.emptySub}>Your patient's alerts will appear here</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function CGAlertScreen() {
  const user = useAuthStore((s) => s.user);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("Patient");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = alerts.filter((a) => !a.read).length;

  // ── Fetch linked patient + alerts ─────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const db = getDb();

      // Step 1: resolve linked patient
      const linksSnap = await getDocs(
        query(
          collection(db, FIRESTORE.CG_LINKS),
          where("guardianId", "==", user.id)
        )
      );

      const linkedPatientId = linksSnap.docs[0]?.data().patientId ?? null;
      setPatientId(linkedPatientId);

      if (!linkedPatientId) {
        setAlerts([]);
        return;
      }

      // Step 2: resolve patient name
      const patientSnap = await getDoc(doc(db, FIRESTORE.USERS, linkedPatientId));
      setPatientName(patientSnap.data()?.name ?? "Patient");

      // Step 3: fetch patient's notifications
      const notifsSnap = await getDocs(
        query(
          collection(db, FIRESTORE.NOTIFICATIONS),
          where("userId", "==", linkedPatientId),
          orderBy("createdAt", "desc"),
          limit(50)
        )
      );

      const fetched: AlertItem[] = notifsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type ?? "dose",
          title: data.title ?? "",
          body: data.body ?? "",
          read: data.read ?? false,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt ?? new Date().toISOString(),
        };
      });

      setAlerts(fetched);
    } catch (err) {
      console.error("[CGAlertScreen] fetchData error:", err);
      Alert.alert("Error", "Could not load alerts. Please try again.");
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Mark single alert read ────────────────────────────────────────────────
  const markRead = useCallback(async (notifId: string) => {
    // Optimistic update
    setAlerts((prev) =>
      prev.map((a) => (a.id === notifId ? { ...a, read: true } : a))
    );
    try {
      const db = getDb();
      await updateDoc(doc(db, FIRESTORE.NOTIFICATIONS, notifId), { read: true });
    } catch (err) {
      console.error("[CGAlertScreen] markRead error:", err);
      // Revert optimistic update on failure
      setAlerts((prev) =>
        prev.map((a) => (a.id === notifId ? { ...a, read: false } : a))
      );
    }
  }, []);

  // ── Batch mark all read ───────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    const unread = alerts.filter((a) => !a.read);
    if (unread.length === 0) return;

    // Optimistic update
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setMarkingAll(true);

    try {
      const db = getDb();
      await Promise.all(
        unread.map((a) =>
          updateDoc(doc(db, FIRESTORE.NOTIFICATIONS, a.id), { read: true })
        )
      );
    } catch (err) {
      console.error("[CGAlertScreen] markAllRead error:", err);
      // Revert on failure
      setAlerts((prev) =>
        prev.map((a) => {
          const wasUnread = unread.some((u) => u.id === a.id);
          return wasUnread ? { ...a, read: false } : a;
        })
      );
      Alert.alert("Error", "Could not mark all as read. Please try again.");
    } finally {
      setMarkingAll(false);
    }
  }, [alerts]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Patient Alerts</Text>
          <Text style={s.headerSub}>Monitoring: {patientName}</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={s.markAllBtn}
            onPress={markAllRead}
            disabled={markingAll}
            activeOpacity={0.7}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={s.markAllText}>Mark All Read</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Unread badge bar */}
      {unreadCount > 0 && !loading && (
        <View style={s.badgeBar}>
          <View style={s.badge}>
            <Text style={s.badgeText}>
              {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={s.loadingText}>Loading alerts…</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            alerts.length === 0 ? s.listEmpty : s.listContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={TEAL}
              colors={[TEAL]}
            />
          }
          ListEmptyComponent={
            <EmptyState patientLinked={patientId !== null} />
          }
          renderItem={({ item }) => (
            <AlertCard item={item} onPress={markRead} />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
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
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.white,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  markAllBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 108,
    alignItems: "center",
    justifyContent: "center",
  },
  markAllText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.white,
  },

  // Unread badge bar
  badgeBar: {
    backgroundColor: TEAL + "12",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: TEAL + "20",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: TEAL + "18",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: TEAL,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  listEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  separator: {
    height: 10,
  },

  // Alert card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRead: {
    opacity: 0.75,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardBody: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "500",
    lineHeight: 18,
  },
  cardTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    flexShrink: 0,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
});
