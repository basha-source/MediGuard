import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type DayStatus = "missed" | "perfect" | "partial" | "none";

type MedMissed = { name: string; count: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeOfDay(hhmm: string): string {
  const h = parseInt(hhmm.split(":")[0], 10);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

function dotColor(status: DayStatus): string {
  switch (status) {
    case "missed":
      return Colors.alertRed;
    case "perfect":
      return Colors.primary;
    case "partial":
      return Colors.orange;
    default:
      return "#E0E0E0";
  }
}

function dotBg(status: DayStatus): string {
  switch (status) {
    case "missed":
      return Colors.redPale;
    case "perfect":
      return Colors.primaryPale;
    case "partial":
      return Colors.orangePale;
    default:
      return "#F4F4F4";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  color,
  sub,
}: {
  value: string;
  label: string;
  color: string;
  sub?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function CalendarGrid({
  calDates,
  getDayStatus,
}: {
  calDates: string[];
  getDayStatus: (date: string) => DayStatus;
}) {
  const rows: string[][] = [];
  for (let i = 0; i < calDates.length; i += 7) {
    rows.push(calDates.slice(i, i + 7));
  }

  return (
    <View style={styles.calGrid}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.calRow}>
          {row.map((date, ci) => {
            const status = getDayStatus(date);
            const day = new Date(date + "T12:00:00").getDate();
            return (
              <View
                key={ci}
                style={[
                  styles.calCell,
                  {
                    backgroundColor: dotBg(status),
                    borderColor: dotColor(status),
                  },
                ]}
              >
                <Text style={[styles.calDayNum, { color: dotColor(status) }]}>
                  {day}
                </Text>
              </View>
            );
          })}
          {/* Pad last row if < 7 */}
          {row.length < 7 &&
            Array.from({ length: 7 - row.length }).map((_, pi) => (
              <View key={`pad-${pi}`} style={styles.calCellPad} />
            ))}
        </View>
      ))}
    </View>
  );
}

function MedMissedBar({
  med,
  maxMissed,
}: {
  med: MedMissed;
  maxMissed: number;
}) {
  const fillPct = maxMissed === 0 ? 0 : (med.count / maxMissed) * 100;
  return (
    <View style={styles.medRow}>
      <Text style={styles.medName} numberOfLines={1}>
        {med.name}
      </Text>
      <View style={styles.medBarTrack}>
        <View
          style={[
            styles.medBarFill,
            { width: `${fillPct}%` as any },
          ]}
        />
      </View>
      <Text style={styles.medCount}>{med.count}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function MissedDoseInsightsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [totalMissed, setTotalMissed] = useState(0);
  const [worstTime, setWorstTime] = useState("—");
  const [worstMed, setWorstMed] = useState("—");
  const [medArray, setMedArray] = useState<MedMissed[]>([]);
  const [maxMissed, setMaxMissed] = useState(1);
  const [dayStatusMap, setDayStatusMap] = useState<Record<string, DayStatus>>({});
  const [calDates, setCalDates] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const db = getDb();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
          .toISOString()
          .split("T")[0];

        const snap = await getDocs(
          query(
            collection(db, FIRESTORE.DOSE_LOGS),
            where("userId", "==", user!.id),
            where("date", ">=", thirtyDaysAgo)
          )
        );

        const logs = snap.docs.map((d) => d.data() as Record<string, any>);
        const missedLogs = logs.filter(
          (l) => l.status === "missed" || l.status === "snoozed"
        );

        // Total missed
        const total = missedLogs.length;

        // Most missed time of day
        const timeCounts: Record<string, number> = {};
        missedLogs.forEach((l) => {
          const t = getTimeOfDay(l.scheduledTime ?? "12:00");
          timeCounts[t] = (timeCounts[t] ?? 0) + 1;
        });
        const wTime =
          Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

        // Worst medicine
        const medCounts: Record<string, { name: string; count: number }> = {};
        missedLogs.forEach((l) => {
          const id = l.medicineId as string;
          if (!medCounts[id]) {
            medCounts[id] = { name: l.medicineName ?? id, count: 0 };
          }
          medCounts[id].count++;
        });
        const meds = Object.values(medCounts).sort((a, b) => b.count - a.count);
        const wMed = meds[0]?.name ?? "—";
        const maxM = meds[0]?.count ?? 1;

        // Calendar: last 30 days
        const dates = Array.from({ length: 30 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          return d.toISOString().split("T")[0];
        });

        // Build day status map
        const statusMap: Record<string, DayStatus> = {};
        dates.forEach((date) => {
          const dayLogs = logs.filter((l) => l.date === date);
          if (dayLogs.length === 0) {
            statusMap[date] = "none";
          } else {
            const dayMissed = dayLogs.filter((l) => l.status === "missed").length;
            if (dayMissed === 0) statusMap[date] = "perfect";
            else if (dayMissed === dayLogs.length) statusMap[date] = "missed";
            else statusMap[date] = "partial";
          }
        });

        setTotalMissed(total);
        setWorstTime(wTime);
        setWorstMed(wMed);
        setMedArray(meds);
        setMaxMissed(maxM);
        setCalDates(dates);
        setDayStatusMap(statusMap);
      } catch (err) {
        console.error("MissedDoseInsightsScreen load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  function getDayStatus(date: string): DayStatus {
    return dayStatusMap[date] ?? "none";
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={Colors.white}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        />
        <Text style={styles.headerTitle}>Missed Dose Insights</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : totalMissed === 0 ? (
        /* Empty / perfect state */
        <View style={styles.centered}>
          <View style={styles.emptyCard}>
            <Ionicons
              name="checkmark-circle"
              size={56}
              color={Colors.primary}
            />
            <Text style={styles.emptyTitle}>Great job!</Text>
            <Text style={styles.emptyText}>
              No missed doses in the last 30 days. Keep it up!
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary stat cards */}
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.statRow}>
            <StatCard
              value={String(totalMissed)}
              label="Total Missed"
              color={Colors.alertRed}
              sub="last 30 days"
            />
            <StatCard
              value={worstTime}
              label="Worst Time"
              color={Colors.orange}
            />
            <StatCard
              value={worstMed}
              label="Most Missed"
              color={Colors.alertRed}
            />
          </View>

          {/* 30-day calendar */}
          <Text style={styles.sectionTitle}>30-Day Calendar</Text>
          <View style={styles.card}>
            {/* Legend */}
            <View style={styles.legendRow}>
              {(
                [
                  { status: "perfect" as DayStatus, label: "Perfect" },
                  { status: "partial" as DayStatus, label: "Partial" },
                  { status: "missed" as DayStatus, label: "Missed" },
                  { status: "none" as DayStatus, label: "No data" },
                ] as { status: DayStatus; label: string }[]
              ).map((item) => (
                <View key={item.status} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: dotColor(item.status) },
                    ]}
                  />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            <CalendarGrid calDates={calDates} getDayStatus={getDayStatus} />
          </View>

          {/* Per-medicine missed bars */}
          {medArray.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>By Medicine</Text>
              <View style={styles.card}>
                {medArray.map((med, i) => (
                  <View key={i}>
                    <MedMissedBar med={med} maxMissed={maxMissed} />
                    {i < medArray.length - 1 && <View style={styles.divider} />}
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
    justifyContent: "space-between",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Loading / empty
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 36,
    alignItems: "center",
    gap: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  // Scroll
  scroll: {
    padding: 16,
    paddingBottom: 48,
    gap: 10,
  },

  // Section title
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },

  // Generic card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  // Stat row
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statSub: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 1,
    textAlign: "center",
  },

  // Legend
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  // Calendar grid
  calGrid: {
    gap: 5,
  },
  calRow: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "flex-start",
  },
  calCell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  calCellPad: {
    width: 36,
    height: 36,
  },
  calDayNum: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Per-medicine missed bars
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  medName: {
    width: 100,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  medBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: "#F2E0E0",
    borderRadius: 5,
    overflow: "hidden",
  },
  medBarFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.alertRed,
  },
  medCount: {
    width: 28,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.alertRed,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 4,
  },
});
