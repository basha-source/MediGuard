import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import type { WellnessLog } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";
import {
  getLogsRange,
  computeStats,
  computeStreak,
} from "@/services/wellnessLog";

// ─── Types ────────────────────────────────────────────────────────────────────

type MedData = {
  name: string;
  dosage: string;
  form: string;
  expiryDate: string;
};

type VitalData = {
  type: string;
  value: string;
  unit: string;
  status: string;
};

type VaccData = {
  name: string;
  administered: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function vitalLabel(type: string): string {
  const map: Record<string, string> = {
    bloodPressure: "BP",
    bloodSugar: "Sugar",
    temperature: "Temp",
    weight: "Weight",
  };
  return map[type] ?? type;
}

function moodEmoji(mood: number): string {
  if (mood >= 4.5) return "😄";
  if (mood >= 3.5) return "🙂";
  if (mood >= 2.5) return "😐";
  if (mood >= 1.5) return "😕";
  return "😢";
}

function esc(s: unknown): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c]!)
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── PDF Builders ─────────────────────────────────────────────────────────────

function buildMoodSvg(logs: WellnessLog[]): string {
  const W = 540;
  const H = 180;
  const PAD = 30;
  const innerW = W - 2 * PAD;
  const innerH = H - 2 * PAD;

  if (logs.length < 2) {
    return `<div style="padding:20px;text-align:center;color:#666;font-size:12px;border:1px dashed #ccc;border-radius:6px;">Not enough data for chart (need at least 2 logs)</div>`;
  }

  const points = logs.map((l, i) => {
    const x = PAD + (i / (logs.length - 1)) * innerW;
    const y = PAD + (1 - (l.mood - 1) / 4) * innerH;
    return { x, y };
  });

  const pts = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const markers = points
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#2E7D32"/>`
    )
    .join("");

  const gridY = [1, 2, 3, 4, 5]
    .map((m) => {
      const y = PAD + (1 - (m - 1) / 4) * innerH;
      return `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#E0E0E0" stroke-width="1"/><text x="${PAD - 6}" y="${y + 4}" font-size="10" fill="#666" text-anchor="end">${m}</text>`;
    })
    .join("");

  const labelIdx = [
    0,
    Math.floor(logs.length / 4),
    Math.floor(logs.length / 2),
    Math.floor((3 * logs.length) / 4),
    logs.length - 1,
  ];
  const seen = new Set<number>();
  const labelDates = labelIdx
    .filter((i) => {
      if (seen.has(i)) return false;
      seen.add(i);
      return true;
    })
    .map((i) => {
      const x = PAD + (i / (logs.length - 1)) * innerW;
      return `<text x="${x.toFixed(1)}" y="${H - 8}" font-size="9" fill="#666" text-anchor="middle">${esc(logs[i].date)}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${gridY}
    <polyline points="${pts}" fill="none" stroke="#2E7D32" stroke-width="2"/>
    ${markers}
    ${labelDates}
  </svg>`;
}

type BuildHtmlArgs = {
  patient: { name?: string; id?: string } | null | undefined;
  today: string;
  medicines: MedData[];
  adherencePct: number;
  taken: number;
  missed: number;
  vitals: VitalData[];
  vaccinations: VaccData[];
  wellnessLogs: WellnessLog[];
};

function buildReportHtml(args: BuildHtmlArgs): string {
  const {
    patient,
    today,
    medicines,
    adherencePct,
    taken,
    missed,
    vitals,
    vaccinations,
    wellnessLogs,
  } = args;

  const stats = computeStats(wellnessLogs);
  const streak = computeStreak(wellnessLogs);

  const medRows =
    medicines.length === 0
      ? `<tr><td colspan="4" class="empty">No medicines logged.</td></tr>`
      : medicines
          .map(
            (m) =>
              `<tr><td>${esc(m.name)}</td><td>${esc(m.dosage)}</td><td>${esc(m.form)}</td><td>${esc(m.expiryDate)}</td></tr>`
          )
          .join("");

  const vitalRows =
    vitals.length === 0
      ? `<tr><td colspan="4" class="empty">No vitals logged.</td></tr>`
      : vitals
          .map(
            (v) =>
              `<tr><td>${esc(vitalLabel(v.type))}</td><td>${esc(v.value)}</td><td>${esc(v.unit)}</td><td>${esc(v.status)}</td></tr>`
          )
          .join("");

  const vaccRows =
    vaccinations.length === 0
      ? `<tr><td colspan="2" class="empty">No vaccinations logged.</td></tr>`
      : vaccinations
          .map(
            (v) =>
              `<tr><td>${esc(v.name)}</td><td>${v.administered ? "Administered" : "Pending"}</td></tr>`
          )
          .join("");

  const wellnessRows =
    wellnessLogs.length === 0
      ? `<tr><td colspan="6" class="empty">No wellness logs yet.</td></tr>`
      : wellnessLogs
          .map(
            (l) =>
              `<tr><td>${esc(l.date)}</td><td>${esc(l.mood)}</td><td>${esc(l.energy)}</td><td>${esc(l.pain)}</td><td>${esc(l.sleepHours)}</td><td>${esc(l.notes)}</td></tr>`
          )
          .join("");

  const moodChart = buildMoodSvg(wellnessLogs);

  const wellnessBlock =
    wellnessLogs.length === 0
      ? `<p class="empty">No wellness logs yet — patient hasn't started daily check-ins.</p>`
      : `
        <div class="wellness-meta">
          <div><strong>Streak:</strong> ${esc(streak)} days</div>
          <div><strong>Logged:</strong> ${esc(stats.totalLogs)} / 30 days</div>
          <div><strong>Best day:</strong> ${esc(stats.bestDay ?? "—")}</div>
          <div><strong>Worst day:</strong> ${esc(stats.worstDay ?? "—")}</div>
        </div>
        <div class="stats-grid">
          <div class="stat-box"><div class="stat-val">${esc(stats.avgMood.toFixed(1))}</div><div class="stat-lbl">Avg Mood / 5</div></div>
          <div class="stat-box"><div class="stat-val">${esc(stats.avgEnergy.toFixed(1))}</div><div class="stat-lbl">Avg Energy / 5</div></div>
          <div class="stat-box"><div class="stat-val">${esc(stats.avgPain.toFixed(1))}</div><div class="stat-lbl">Avg Pain / 10</div></div>
          <div class="stat-box"><div class="stat-val">${esc(stats.avgSleep.toFixed(1))}h</div><div class="stat-lbl">Avg Sleep</div></div>
        </div>
        <div class="chart-title">Mood Trend</div>
        <div class="chart-wrap">${moodChart}</div>
        <table>
          <thead>
            <tr><th>Date</th><th>Mood</th><th>Energy</th><th>Pain</th><th>Sleep (h)</th><th>Notes</th></tr>
          </thead>
          <tbody>${wellnessRows}</tbody>
        </table>
      `;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>MediGuard Health Report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #222; margin: 0; padding: 24px; font-size: 12px; }
  .hdr { background: #2E7D32; color: #fff; padding: 18px 22px; border-radius: 8px; margin-bottom: 18px; }
  .hdr h1 { margin: 0 0 6px 0; font-size: 20px; letter-spacing: 1px; }
  .hdr .meta { font-size: 12px; opacity: 0.95; }
  h2 { color: #2E7D32; font-size: 13px; letter-spacing: 1.2px; text-transform: uppercase; border-bottom: 2px solid #2E7D32; padding-bottom: 4px; margin: 22px 0 10px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #F0F7F1; color: #2E7D32; font-weight: 700; }
  .empty { color: #888; font-style: italic; text-align: center; }
  .adherence { display: flex; gap: 16px; align-items: center; padding: 10px 0; }
  .adherence .pct { font-size: 36px; font-weight: 800; color: #2E7D32; }
  .adherence .breakdown { font-size: 12px; color: #444; }
  .wellness-meta { display: flex; flex-wrap: wrap; gap: 14px; margin: 8px 0 12px 0; font-size: 12px; }
  .stats-grid { display: flex; gap: 10px; margin: 8px 0 14px 0; }
  .stat-box { flex: 1; border: 1px solid #E0E0E0; border-radius: 6px; padding: 10px; text-align: center; background: #FAFAFA; }
  .stat-val { font-size: 18px; font-weight: 800; color: #2E7D32; }
  .stat-lbl { font-size: 10px; color: #666; margin-top: 2px; }
  .chart-title { font-size: 11px; font-weight: 700; color: #555; margin-top: 10px; }
  .chart-wrap { margin: 6px 0 14px 0; }
  .footer { text-align: center; color: #888; font-size: 10px; margin-top: 28px; padding-top: 10px; border-top: 1px solid #eee; letter-spacing: 0.5px; }
</style>
</head>
<body>
  <div class="hdr">
    <h1>MEDIGUARD HEALTH REPORT</h1>
    <div class="meta"><strong>Patient:</strong> ${esc(patient?.name ?? "Patient")}</div>
    <div class="meta"><strong>Generated:</strong> ${esc(today)}</div>
  </div>

  <h2>Medicines (${esc(medicines.length)})</h2>
  <table>
    <thead><tr><th>Name</th><th>Dosage</th><th>Form</th><th>Expiry</th></tr></thead>
    <tbody>${medRows}</tbody>
  </table>

  <h2>Dose Adherence (Last 30 Days)</h2>
  <div class="adherence">
    <div class="pct">${esc(adherencePct)}%</div>
    <div class="breakdown">
      <div><strong>Taken:</strong> ${esc(taken)} / ${esc(taken + missed)}</div>
      <div><strong>Missed:</strong> ${esc(missed)}</div>
    </div>
  </div>

  <h2>Recent Vitals</h2>
  <table>
    <thead><tr><th>Type</th><th>Value</th><th>Unit</th><th>Status</th></tr></thead>
    <tbody>${vitalRows}</tbody>
  </table>

  <h2>Vaccinations</h2>
  <table>
    <thead><tr><th>Name</th><th>Status</th></tr></thead>
    <tbody>${vaccRows}</tbody>
  </table>

  <h2>Wellness Log (Last 30 Days)</h2>
  ${wellnessBlock}

  <div class="footer">Generated by MediGuard • ${esc(today)}</div>
</body>
</html>`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function DoctorReportScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<MedData[]>([]);
  const [vitals, setVitals] = useState<VitalData[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccData[]>([]);
  const [adherencePct, setAdherencePct] = useState(0);
  const [taken, setTaken] = useState(0);
  const [missed, setMissed] = useState(0);
  const [wellnessLogs, setWellnessLogs] = useState<WellnessLog[]>([]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const db = getDb();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
          .toISOString()
          .split("T")[0];

        const [medSnap, vitalSnap, doseSnap, vaccSnap, wLogs] = await Promise.all([
          getDocs(
            query(
              collection(db, FIRESTORE.MEDICINES),
              where("userId", "==", user!.id)
            )
          ),
          getDocs(
            query(
              collection(db, FIRESTORE.VITALS),
              where("userId", "==", user!.id)
            )
          ),
          getDocs(
            query(
              collection(db, FIRESTORE.DOSE_LOGS),
              where("userId", "==", user!.id),
              where("date", ">=", thirtyDaysAgo)
            )
          ),
          getDocs(
            query(
              collection(db, FIRESTORE.VACCINATIONS),
              where("userId", "==", user!.id)
            )
          ),
          getLogsRange(user!.id, 30),
        ]);

        // Medicines
        const meds: MedData[] = medSnap.docs.map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            name: data.name ?? "Unknown",
            dosage: data.dosage ?? "",
            form: data.form ?? "",
            expiryDate: data.expiryDate ?? "",
          };
        });

        // Vitals
        const vits: VitalData[] = vitalSnap.docs
          .map((d) => {
            const data = d.data() as Record<string, any>;
            return {
              type: data.type ?? "",
              value: data.value ?? "",
              unit: data.unit ?? "",
              status: data.status ?? "",
              recordedAt: data.recordedAt ?? "",
            };
          })
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
          .slice(0, 5)
          .map(({ recordedAt: _r, ...rest }) => rest as VitalData);

        // Adherence
        const doseDocs = doseSnap.docs.map((d) => d.data() as Record<string, any>);
        const takenCount = doseDocs.filter((d) => d.status === "taken").length;
        const totalCount = doseSnap.size;
        const pct = totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100);

        // Vaccinations
        const vaccs: VaccData[] = vaccSnap.docs.map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            name: data.name ?? "Unknown",
            administered: data.administered ?? false,
          };
        });

        setMedicines(meds);
        setVitals(vits);
        setTaken(takenCount);
        setMissed(totalCount - takenCount);
        setAdherencePct(pct);
        setVaccinations(vaccs);
        setWellnessLogs(wLogs);
      } catch (err) {
        console.error("DoctorReportScreen load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  async function shareReport() {
    const html = buildReportHtml({
      patient: user,
      today,
      medicines,
      adherencePct,
      taken,
      missed,
      vitals,
      vaccinations,
      wellnessLogs,
    });
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Health Report",
        });
      } else {
        await Share.share({ message: `Report saved at: ${uri}` });
      }
    } catch (err) {
      console.error("PDF gen failed:", err);
      Alert.alert("Export failed", "Could not generate the PDF. Please try again.");
    }
  }

  const wellnessStats = computeStats(wellnessLogs);
  const wellnessStreak = computeStreak(wellnessLogs);
  const recentWellness = [...wellnessLogs].reverse().slice(0, 7);

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
        <Text style={styles.headerTitle}>Doctor Visit Report</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Report Identity */}
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>MEDIGUARD HEALTH REPORT</Text>
            <Text style={styles.reportMeta}>
              Patient:{" "}
              <Text style={styles.reportMetaBold}>{user?.name ?? "Patient"}</Text>
            </Text>
            <Text style={styles.reportMeta}>Generated: {today}</Text>
          </View>

          <Divider />

          {/* Medicines */}
          <SectionCard>
            <SectionHeader title={`MEDICINES (${medicines.length})`} />
            {medicines.length === 0 ? (
              <Text style={styles.emptyLine}>No medicines added yet.</Text>
            ) : (
              medicines.map((m, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <View style={styles.listContent}>
                    <Text style={styles.itemName}>
                      {m.name} {m.dosage}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {m.expiryDate ? `Exp: ${m.expiryDate}` : ""}
                      {m.expiryDate && m.form ? " • " : ""}
                      {m.form}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </SectionCard>

          <Divider />

          {/* Dose Adherence */}
          <SectionCard>
            <SectionHeader title="DOSE ADHERENCE (Last 30 Days)" />
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{adherencePct}%</Text>
                <Text style={styles.statLabel}>Overall</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.primary }]}>
                  {taken}
                </Text>
                <Text style={styles.statLabel}>Doses Taken</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.alertRed }]}>
                  {missed}
                </Text>
                <Text style={styles.statLabel}>Doses Missed</Text>
              </View>
            </View>
          </SectionCard>

          <Divider />

          {/* Wellness Log */}
          <SectionCard>
            <SectionHeader title="WELLNESS LOG (Last 30 Days)" />
            {wellnessLogs.length === 0 ? (
              <Text style={styles.emptyLine}>
                No wellness logs yet — patient hasn't started daily check-ins.
              </Text>
            ) : (
              <>
                <View style={styles.wellnessTopRow}>
                  <View style={styles.wellnessTopItem}>
                    <Text style={styles.wellnessTopValue}>{wellnessStreak}</Text>
                    <Text style={styles.wellnessTopLabel}>Day Streak</Text>
                  </View>
                  <View style={styles.statSep} />
                  <View style={styles.wellnessTopItem}>
                    <Text style={styles.wellnessTopValue}>
                      {wellnessStats.totalLogs}/30
                    </Text>
                    <Text style={styles.wellnessTopLabel}>Days Logged</Text>
                  </View>
                </View>

                <View style={styles.wellnessStatsGrid}>
                  <View style={styles.wellnessStatBox}>
                    <Text style={styles.wellnessStatValue}>
                      {moodEmoji(wellnessStats.avgMood)}{" "}
                      {wellnessStats.avgMood.toFixed(1)}/5
                    </Text>
                    <Text style={styles.wellnessStatLabel}>Avg Mood</Text>
                  </View>
                  <View style={styles.wellnessStatBox}>
                    <Text style={styles.wellnessStatValue}>
                      {wellnessStats.avgEnergy.toFixed(1)}/5
                    </Text>
                    <Text style={styles.wellnessStatLabel}>Avg Energy</Text>
                  </View>
                  <View style={styles.wellnessStatBox}>
                    <Text style={styles.wellnessStatValue}>
                      {wellnessStats.avgPain.toFixed(1)}/10
                    </Text>
                    <Text style={styles.wellnessStatLabel}>Avg Pain</Text>
                  </View>
                  <View style={styles.wellnessStatBox}>
                    <Text style={styles.wellnessStatValue}>
                      {wellnessStats.avgSleep.toFixed(1)}h
                    </Text>
                    <Text style={styles.wellnessStatLabel}>Avg Sleep</Text>
                  </View>
                </View>

                <View style={styles.wellnessMetaRow}>
                  <Text style={styles.wellnessMetaText}>
                    Best:{" "}
                    <Text style={styles.wellnessMetaBold}>
                      {wellnessStats.bestDay ?? "—"}
                    </Text>
                  </Text>
                  <Text style={styles.wellnessMetaText}>
                    Worst:{" "}
                    <Text style={styles.wellnessMetaBold}>
                      {wellnessStats.worstDay ?? "—"}
                    </Text>
                  </Text>
                </View>

                <Text style={styles.wellnessSubHeader}>Recent Entries</Text>
                {recentWellness.map((l) => (
                  <View key={l.id} style={styles.wellnessEntry}>
                    <Text style={styles.wellnessEntryDate}>{l.date}</Text>
                    <View style={styles.wellnessEntryBody}>
                      <Text style={styles.wellnessEntryLine}>
                        {moodEmoji(l.mood)} Mood {l.mood}/5 • Pain {l.pain} •
                        Sleep {l.sleepHours}h
                      </Text>
                      {l.notes ? (
                        <Text
                          style={styles.wellnessEntryNotes}
                          numberOfLines={1}
                        >
                          {l.notes}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </>
            )}
          </SectionCard>

          <Divider />

          {/* Vitals */}
          <SectionCard>
            <SectionHeader title="RECENT VITALS" />
            {vitals.length === 0 ? (
              <Text style={styles.emptyLine}>No vitals recorded yet.</Text>
            ) : (
              vitals.map((v, i) => (
                <View key={i} style={styles.vitalRow}>
                  <Text style={styles.vitalType}>{vitalLabel(v.type)}:</Text>
                  <Text style={styles.vitalValue}>
                    {v.value} {v.unit}
                  </Text>
                  {v.status ? (
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            v.status === "normal"
                              ? Colors.primaryPale
                              : v.status === "borderline"
                              ? Colors.orangePale
                              : Colors.redPale,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              v.status === "normal"
                                ? Colors.primary
                                : v.status === "borderline"
                                ? Colors.orange
                                : Colors.alertRed,
                          },
                        ]}
                      >
                        {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </SectionCard>

          <Divider />

          {/* Vaccinations */}
          <SectionCard>
            <SectionHeader title="VACCINATIONS" />
            {vaccinations.length === 0 ? (
              <Text style={styles.emptyLine}>No vaccination records found.</Text>
            ) : (
              vaccinations.map((v, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.itemName}>
                    {v.name}{" "}
                    {v.administered ? (
                      <Text style={{ color: Colors.primary }}>✓</Text>
                    ) : (
                      <Text style={{ color: Colors.orange }}>(Pending)</Text>
                    )}
                  </Text>
                </View>
              ))
            )}
          </SectionCard>

          <Divider />

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={shareReport}
            activeOpacity={0.85}
          >
            <Ionicons name="share-outline" size={20} color={Colors.white} />
            <Text style={styles.shareBtnText}>Share Report</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>Generated by MediGuard</Text>
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

  // Loading
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll
  scroll: {
    padding: 16,
    paddingBottom: 48,
    gap: 0,
  },

  // Report header block
  reportHeader: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 18,
    marginBottom: 4,
    borderTopWidth: 4,
    borderTopColor: Colors.primary,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  reportMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  reportMetaBold: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  // Section card
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 4,
  },

  // Section header label
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // Divider
  divider: {
    height: 10,
  },

  // List items (medicines / vaccinations)
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  listContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  emptyLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },

  // Adherence stat row
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    lineHeight: 34,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  statSep: {
    width: 1,
    height: 40,
    backgroundColor: "#E8E8E8",
  },

  // Wellness
  wellnessTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  wellnessTopItem: {
    alignItems: "center",
    flex: 1,
  },
  wellnessTopValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.primary,
    lineHeight: 30,
  },
  wellnessTopLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  wellnessStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  wellnessStatBox: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: Colors.primaryPale,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  wellnessStatValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  wellnessStatLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  wellnessMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  wellnessMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  wellnessMetaBold: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  wellnessSubHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 6,
  },
  wellnessEntry: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F4",
    gap: 10,
  },
  wellnessEntryDate: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    width: 76,
  },
  wellnessEntryBody: {
    flex: 1,
  },
  wellnessEntryLine: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  wellnessEntryNotes: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: "italic",
    marginTop: 1,
  },

  // Vitals
  vitalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F4",
  },
  vitalType: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    width: 56,
  },
  vitalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Share button
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 20,
    letterSpacing: 0.5,
  },
});
