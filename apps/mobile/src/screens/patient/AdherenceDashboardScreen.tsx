import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayData = { label: string; pct: number; date: string };

type MedStat = { name: string; taken: number; total: number; pct: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BAR_MAX = 80;
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function barColor(pct: number): string {
  if (pct === 0) return "#E0E0E0";
  if (pct < 50) return Colors.alertRed;
  if (pct < 100) return Colors.orange;
  return Colors.primary;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  overallPct,
  streak,
  taken,
  missed,
}: {
  overallPct: number;
  streak: number;
  taken: number;
  missed: number;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.bigPct}>{overallPct}%</Text>
      <Text style={styles.statLabel}>Overall adherence (last 7 days)</Text>
      <Text style={styles.streakText}>
        {streak === 0 ? "Start your streak today!" : `🔥 ${streak}-day streak`}
      </Text>
      <Text style={styles.doseCounts}>
        {taken} dose{taken !== 1 ? "s" : ""} taken &bull; {missed} dose
        {missed !== 1 ? "s" : ""} missed
      </Text>
    </View>
  );
}

function BarChart({ dayData }: { dayData: DayData[] }) {
  return (
    <View style={styles.chartContainer}>
      {dayData.map((d, i) => {
        const barH = d.pct === 0 ? 6 : Math.max(6, Math.round((d.pct / 100) * BAR_MAX));
        const color = barColor(d.pct);
        return (
          <View key={i} style={styles.barColumn}>
            {/* spacer pushes bar to bottom */}
            <View style={{ flex: 1 }} />
            <View
              style={[
                styles.bar,
                { height: barH, backgroundColor: color },
              ]}
            />
            <Text style={styles.barLabel}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function MedBar({ med }: { med: MedStat }) {
  const fill = barColor(med.pct);
  return (
    <View style={styles.medRow}>
      <Text style={styles.medName} numberOfLines={1}>
        {med.name}
      </Text>
      <View style={styles.medBarTrack}>
        <View
          style={[
            styles.medBarFill,
            { width: `${med.pct}%` as any, backgroundColor: fill },
          ]}
        />
      </View>
      <Text style={[styles.medPct, { color: fill }]}>{med.pct}%</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function AdherenceDashboardScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [overallPct, setOverallPct] = useState(0);
  const [streak, setStreak] = useState(0);
  const [takenCount, setTakenCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [perMedicine, setPerMedicine] = useState<MedStat[]>([]);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        // Last 7 dates as "YYYY-MM-DD"
        const dates = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split("T")[0];
        });

        const snap = await getDocs(
          query(
            collection(getDb(), FIRESTORE.DOSE_LOGS),
            where("userId", "==", user.id),
            where("date", "in", dates)
          )
        );
        const logs = snap.docs.map((d) => d.data() as Record<string, any>);

        if (logs.length === 0) {
          setEmpty(true);
          setLoading(false);
          return;
        }

        // Overall
        const taken = logs.filter((l) => l.status === "taken").length;
        const missed = logs.filter((l) => l.status !== "taken").length;
        const overall =
          logs.length === 0 ? 0 : Math.round((taken / logs.length) * 100);

        // Per-day chart data
        const days: DayData[] = dates.map((date) => {
          const dayLogs = logs.filter((l) => l.date === date);
          const dayTaken = dayLogs.filter((l) => l.status === "taken").length;
          const pct =
            dayLogs.length === 0
              ? 0
              : Math.round((dayTaken / dayLogs.length) * 100);
          const jsDay = new Date(date + "T12:00:00").getDay(); // 0=Sun
          const idx = jsDay === 0 ? 6 : jsDay - 1;
          return { label: DAY_LABELS[idx], pct, date };
        });

        // Streak: consecutive 100% days going back from today
        let s = 0;
        for (let i = days.length - 1; i >= 0; i--) {
          if (days[i].pct === 100) s++;
          else break;
        }

        // Per-medicine
        const medMap: Record<
          string,
          { name: string; taken: number; total: number }
        > = {};
        logs.forEach((l) => {
          const id = l.medicineId as string;
          if (!medMap[id])
            medMap[id] = { name: l.medicineName ?? id, taken: 0, total: 0 };
          medMap[id].total++;
          if (l.status === "taken") medMap[id].taken++;
        });
        const meds: MedStat[] = Object.values(medMap).map((m) => ({
          ...m,
          pct: Math.round((m.taken / m.total) * 100),
        }));

        setOverallPct(overall);
        setTakenCount(taken);
        setMissedCount(missed);
        setDayData(days);
        setStreak(s);
        setPerMedicine(meds);
        setEmpty(false);
      } catch (err) {
        console.error("AdherenceDashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adherence Dashboard</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : empty ? (
        <View style={styles.centered}>
          <View style={styles.emptyCard}>
            <Ionicons
              name="bar-chart-outline"
              size={48}
              color={Colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              No dose history yet. Start tracking your doses to see adherence
              stats.
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Overall stat card */}
          <StatCard
            overallPct={overallPct}
            streak={streak}
            taken={takenCount}
            missed={missedCount}
          />

          {/* Weekly overview */}
          <Text style={styles.sectionTitle}>Weekly Overview</Text>
          <View style={styles.chartCard}>
            <BarChart dayData={dayData} />
          </View>

          {/* Per-medicine */}
          {perMedicine.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Per-Medicine Adherence</Text>
              <View style={styles.medCard}>
                {perMedicine.map((med, i) => (
                  <View key={i}>
                    <MedBar med={med} />
                    {i < perMedicine.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Loading / empty
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  // Scroll
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // Stat card
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  bigPct: {
    fontSize: 56,
    fontWeight: "800",
    color: Colors.primary,
    lineHeight: 64,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  streakText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  doseCounts: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },

  // Chart card
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  chartContainer: {
    height: 100,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    height: 100,
    flexDirection: "column",
  },
  bar: {
    width: 28,
    borderRadius: 4,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  // Medicine card
  medCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  medName: {
    width: 110,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  medBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: "#E8E8E8",
    borderRadius: 5,
    overflow: "hidden",
  },
  medBarFill: {
    height: 10,
    borderRadius: 5,
  },
  medPct: {
    width: 38,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 4,
  },
});
