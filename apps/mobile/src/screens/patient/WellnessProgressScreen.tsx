import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { Colors } from "@mediguard/shared";
import type { WellnessLog } from "@mediguard/shared";
import { useWellnessLogs } from "@/hooks/useWellnessLogs";
import { computeStreak } from "@/services/wellnessLog";

// ─── Constants ───────────────────────────────────────────────────────────────

const MOOD_EMOJI = ["😢", "😟", "😐", "🙂", "😄"] as const;
const SCREEN_W = Dimensions.get("window").width;

type Range = 7 | 30;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function notesPreview(notes: string): string {
  const trimmed = notes.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 60) return trimmed;
  return trimmed.slice(0, 57) + "...";
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function WellnessProgressScreen() {
  const navigation = useNavigation<any>();
  const [range, setRange] = useState<Range>(30);
  const { logs, loading, refresh } = useWellnessLogs(range);
  const [refreshing, setRefreshing] = useState(false);

  const streak = useMemo(() => computeStreak(logs), [logs]);

  // Sort ascending by date for chart, descending for list
  const ascLogs = useMemo<WellnessLog[]>(
    () => [...logs].sort((a, b) => a.date.localeCompare(b.date)),
    [logs],
  );
  const descLogs = useMemo<WellnessLog[]>(
    () => [...logs].sort((a, b) => b.date.localeCompare(a.date)),
    [logs],
  );

  const stats = useMemo(() => {
    return {
      mood: avg(logs.map((l) => l.mood)),
      energy: avg(logs.map((l) => l.energy)),
      pain: avg(logs.map((l) => l.pain)),
      sleep: avg(logs.map((l) => l.sleepHours)),
    };
  }, [logs]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  // ── Chart data ───────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const labels = ascLogs.map((l, idx) => {
      if (range === 7) return shortDate(l.date);
      // For 30d, show every 5th label
      return idx % 5 === 0 ? shortDate(l.date) : "";
    });
    return {
      labels,
      datasets: [
        {
          data: ascLogs.map((l) => l.mood),
          color: () => Colors.primary,
          strokeWidth: 2,
        },
      ],
    };
  }, [ascLogs, range]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wellness Progress</Text>
        <TouchableOpacity
          style={styles.logTodayBtn}
          onPress={() => navigation.navigate("DailyLog")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={14} color={Colors.primary} />
          <Text style={styles.logTodayText}>Log today</Text>
        </TouchableOpacity>
      </View>

      {loading && logs.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Streak card */}
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
            {streak === 0 && (
              <Text style={styles.streakHint}>
                Log today to start your streak!
              </Text>
            )}
          </View>

          {/* Range toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                range === 7 && styles.toggleBtnActive,
              ]}
              onPress={() => setRange(7)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  range === 7 && styles.toggleTextActive,
                ]}
              >
                7 days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                range === 30 && styles.toggleBtnActive,
              ]}
              onPress={() => setRange(30)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  range === 30 && styles.toggleTextActive,
                ]}
              >
                30 days
              </Text>
            </TouchableOpacity>
          </View>

          {logs.length === 0 ? (
            // Empty state
            <View style={styles.emptyCard}>
              <Ionicons
                name="leaf-outline"
                size={48}
                color={Colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No wellness logs yet</Text>
              <Text style={styles.emptySub}>
                Start tracking how you feel each day to see your progress.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate("DailyLog")}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Log today</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Stats grid */}
              <View style={styles.statsGrid}>
                <StatBox
                  label="Avg Mood"
                  value={stats.mood.toFixed(1)}
                  suffix="/5"
                  accent={Colors.primary}
                />
                <StatBox
                  label="Avg Energy"
                  value={stats.energy.toFixed(1)}
                  suffix="/5"
                  accent={Colors.primary}
                />
                <StatBox
                  label="Avg Pain"
                  value={stats.pain.toFixed(1)}
                  suffix="/10"
                  accent={Colors.orange}
                />
                <StatBox
                  label="Avg Sleep"
                  value={stats.sleep.toFixed(1)}
                  suffix="h"
                  accent={Colors.primary}
                />
              </View>

              {/* Chart */}
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Mood Trend</Text>
                {ascLogs.length < 2 ? (
                  <View style={styles.chartPlaceholder}>
                    <Ionicons
                      name="analytics-outline"
                      size={36}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.chartPlaceholderText}>
                      Log at least 2 days to see a trend
                    </Text>
                  </View>
                ) : (
                  <LineChart
                    data={chartData}
                    width={SCREEN_W - 40 - 24}
                    height={200}
                    fromZero={false}
                    yAxisInterval={1}
                    segments={4}
                    chartConfig={{
                      backgroundColor: Colors.card,
                      backgroundGradientFrom: Colors.card,
                      backgroundGradientTo: Colors.card,
                      decimalPlaces: 1,
                      color: (opacity = 1) =>
                        `rgba(46, 125, 50, ${opacity})`,
                      labelColor: () => Colors.textSecondary,
                      propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: Colors.primary,
                      },
                      propsForBackgroundLines: {
                        stroke: "#ECEFF1",
                      },
                    }}
                    bezier
                    style={styles.chart}
                  />
                )}
                <Text style={styles.chartLegend}>
                  Mood (1=😢 · 5=😄) over the last {range} days
                </Text>
              </View>

              {/* Recent entries */}
              <Text style={styles.sectionLabel}>RECENT ENTRIES</Text>
              {descLogs.slice(0, 10).map((log) => (
                <View key={log.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryEmoji}>
                      {MOOD_EMOJI[Math.max(0, Math.min(4, log.mood - 1))]}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryDate}>
                        {shortDate(log.date)}
                      </Text>
                      <Text style={styles.entryMeta}>
                        Energy {log.energy}/5 · Pain {log.pain}/10 ·{" "}
                        {log.sleepHours}h sleep
                      </Text>
                    </View>
                  </View>
                  {log.notes?.trim() ? (
                    <Text style={styles.entryNotes} numberOfLines={2}>
                      {notesPreview(log.notes)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix: string;
  accent: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
        <Text style={styles.statSuffix}>{suffix}</Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
    marginHorizontal: 6,
  },
  logTodayBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 2,
  },
  logTodayText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
  },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  scroll: { padding: 16, paddingBottom: 32 },

  // Streak
  streakCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
    borderTopWidth: 4,
    borderTopColor: Colors.primary,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  streakEmoji: { fontSize: 30, marginBottom: 4 },
  streakNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: 54,
  },
  streakLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  streakHint: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 10,
    fontWeight: "500",
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  toggleTextActive: { color: Colors.white },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  statValueRow: { flexDirection: "row", alignItems: "baseline" },
  statValue: { fontSize: 24, fontWeight: "800" },
  statSuffix: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginLeft: 3,
  },

  // Chart
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  chart: { borderRadius: 10, marginLeft: -6 },
  chartLegend: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    fontStyle: "italic",
  },
  chartPlaceholder: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  chartPlaceholderText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },

  // Entry
  entryCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  entryHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  entryEmoji: { fontSize: 26 },
  entryDate: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  entryMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  entryNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    paddingLeft: 38,
    fontStyle: "italic",
  },

  // Empty
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
  },
  emptyBtnText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
