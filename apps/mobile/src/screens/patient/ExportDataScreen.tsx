import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { getDb, getFirebaseStorage } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type SummaryData = {
  medicines: number;
  vitals: number;
  doseLogs: number;
  vaccinations: number;
  sideEffects: number;
};

type MedRow      = { name: string; dosage: string; form: string; expiryDate: string; stock: number };
type VitalRow    = { type: string; value: string; recordedAt: string };
type DoseRow     = { medicineName: string; status: string; date: string };
type VaccRow     = { name: string; vaccinatedDate: string; validUntil: string };
type SEffectRow  = { medicineName: string; symptom: string; severity: string; recordedAt: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

function vitalLabel(type: string): string {
  const m: Record<string, string> = {
    bloodPressure: "Blood Pressure", bloodSugar: "Blood Sugar",
    temperature: "Temperature",     weight: "Weight",
  };
  return m[type] ?? type;
}

function vitalUnit(type: string): string {
  const m: Record<string, string> = {
    bloodPressure: "mmHg", bloodSugar: "mg/dL", temperature: "°C", weight: "kg",
  };
  return m[type] ?? "";
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildHtml(
  user: any,
  meds: MedRow[],
  vitals: VitalRow[],
  doses: DoseRow[],
  vaccs: VaccRow[],
  effects: SEffectRow[],
): string {
  const now = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const takenCount  = doses.filter((d) => d.status === "taken").length;
  const missedCount = doses.filter((d) => d.status === "missed").length;
  const adherence   = doses.length > 0 ? Math.round((takenCount / doses.length) * 100) : 0;
  const adherenceColor = adherence >= 80 ? "#2E7D32" : adherence >= 50 ? "#FB8C00" : "#E53935";
  const adherenceBg    = adherence >= 80 ? "#E8F5E9" : adherence >= 50 ? "#FFF7E6" : "#FFF2F2";

  const medRows = meds.map((m) => `
    <tr>
      <td>${m.name}</td>
      <td>${m.dosage || "—"}</td>
      <td>${m.form || "—"}</td>
      <td>${m.expiryDate || "—"}</td>
      <td>${m.stock ?? "—"}</td>
    </tr>`).join("");

  const vitalRows = vitals.map((v) => `
    <tr>
      <td>${vitalLabel(v.type)}</td>
      <td>${v.value} ${vitalUnit(v.type)}</td>
      <td>${fmtDate(v.recordedAt)}</td>
    </tr>`).join("");

  const vaccRows = vaccs.map((v) => `
    <tr>
      <td>${v.name}</td>
      <td>${v.vaccinatedDate || "—"}</td>
      <td>${v.validUntil || "—"}</td>
    </tr>`).join("");

  const effectRows = effects.map((e) => {
    const col = e.severity === "severe" ? "#E53935" : e.severity === "moderate" ? "#FB8C00" : "#2E7D32";
    return `<tr>
      <td>${e.medicineName}</td>
      <td>${e.symptom}</td>
      <td style="color:${col};font-weight:700">${e.severity}</td>
      <td>${fmtDate(e.recordedAt)}</td>
    </tr>`;
  }).join("");

  const tableStyle = `width:100%;border-collapse:collapse;margin-top:8px`;
  const thStyle    = `background:#F4F7F4;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#6B6B6B;font-weight:700;text-align:left;padding:8px 10px;border-bottom:2px solid #E0E0E0`;
  const tdStyle    = `padding:9px 10px;border-bottom:1px solid #F5F5F5;font-size:13px`;

  function table(headers: string[], rows: string, emptyMsg: string) {
    if (!rows.trim()) return `<p style="color:#9E9E9E;font-style:italic;font-size:13px;margin-top:6px">${emptyMsg}</p>`;
    return `<table style="${tableStyle}">
      <thead><tr>${headers.map((h) => `<th style="${thStyle}">${h}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;color:#1B1B1B;background:#fff;font-size:13px}
  .hdr{background:#2E7D32;color:#fff;padding:22px 28px}
  .hdr h1{font-size:22px;font-weight:700;letter-spacing:-.3px}
  .hdr p{font-size:11px;opacity:.8;margin-top:3px}
  .meta{background:#F4F7F4;padding:14px 28px;border-bottom:1px solid #E0E0E0;display:flex;gap:32px;flex-wrap:wrap}
  .mi label{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#6B6B6B}
  .mi p{font-size:14px;font-weight:600;color:#1B1B1B;margin-top:2px}
  .sec{padding:18px 28px;border-bottom:1px solid #F0F0F0}
  .sec h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#2E7D32;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #E8F5E9}
  .badge{display:inline-block;border-radius:20px;padding:2px 12px;font-size:13px;font-weight:700}
  .ftr{background:#F4F7F4;padding:14px 28px;text-align:center;font-size:11px;color:#9E9E9E;line-height:1.7}
</style>
</head>
<body>

<div class="hdr">
  <h1>&#x1F6E1;&#xFE0F; MediGuard Health Report</h1>
  <p>Personal Medicine &amp; Health Summary — Generated ${now}</p>
</div>

<div class="meta">
  <div class="mi"><label>Patient</label><p>${user?.name || "—"}</p></div>
  <div class="mi"><label>Email</label><p>${user?.email || "—"}</p></div>
  <div class="mi"><label>Blood Group</label><p>${(user as any)?.bloodGroup || "—"}</p></div>
  <div class="mi">
    <label>30-Day Adherence</label>
    <p><span class="badge" style="background:${adherenceBg};color:${adherenceColor}">${adherence}%</span></p>
  </div>
</div>

<div class="sec">
  <h2>Medicine Inventory (${meds.length})</h2>
  ${table(["Name", "Dosage", "Form", "Expiry Date", "Stock"], medRows, "No medicines recorded.")}
</div>

<div class="sec">
  <h2>Recent Vitals (${vitals.length})</h2>
  ${table(["Type", "Reading", "Recorded On"], vitalRows, "No vitals recorded.")}
</div>

<div class="sec">
  <h2>Dose History — Last 30 Days</h2>
  <p style="font-size:13px;color:#1B1B1B;margin-top:4px">
    Total: <strong>${doses.length}</strong> &nbsp;|&nbsp;
    Taken: <strong style="color:#2E7D32">${takenCount}</strong> &nbsp;|&nbsp;
    Missed: <strong style="color:#E53935">${missedCount}</strong> &nbsp;|&nbsp;
    Adherence: <strong style="color:${adherenceColor}">${adherence}%</strong>
  </p>
</div>

<div class="sec">
  <h2>Vaccination Records (${vaccs.length})</h2>
  ${table(["Vaccine", "Date Given", "Valid Until"], vaccRows, "No vaccinations recorded.")}
</div>

<div class="sec">
  <h2>Reported Side Effects (${effects.length})</h2>
  ${table(["Medicine", "Symptom", "Severity", "Date"], effectRows, "No side effects recorded.")}
</div>

<div class="ftr">
  <p><strong>MediGuard</strong> — Your Personal Medicine Guardian</p>
  <p>This report is for personal reference only. Always consult your doctor for medical decisions.</p>
  <p>Report generated on ${now}</p>
</div>

</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportDataScreen() {
  const navigation = useNavigation();
  const user       = useAuthStore((s) => s.user);

  const [summary,        setSummary]        = useState<SummaryData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [generating,     setGenerating]     = useState(false);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  // ── Load summary counts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoadingPreview(false); return; }
    Promise.all([
      getDocs(query(collection(getDb(), FIRESTORE.MEDICINES),   where("userId", "==", user.id))),
      getDocs(query(collection(getDb(), FIRESTORE.VITALS),      where("userId", "==", user.id))),
      getDocs(query(collection(getDb(), FIRESTORE.DOSE_LOGS),   where("userId", "==", user.id), where("date", ">=", thirtyDaysAgo))),
      getDocs(query(collection(getDb(), FIRESTORE.VACCINATIONS),where("userId", "==", user.id))),
      getDocs(query(collection(getDb(), FIRESTORE.SIDE_EFFECTS),where("userId", "==", user.id))),
    ])
      .then(([meds, vitals, doses, vaccs, effects]) =>
        setSummary({
          medicines: meds.size, vitals: vitals.size, doseLogs: doses.size,
          vaccinations: vaccs.size, sideEffects: effects.size,
        }),
      )
      .catch(() =>
        setSummary({ medicines: 0, vitals: 0, doseLogs: 0, vaccinations: 0, sideEffects: 0 }),
      )
      .finally(() => setLoadingPreview(false));
  }, [user]);

  // ── Generate and share PDF ───────────────────────────────────────────────────
  async function handleGeneratePDF() {
    if (!user) return;
    setGenerating(true);
    try {
      const [medsSnap, vitalsSnap, dosesSnap, vaccsSnap, effectsSnap] = await Promise.all([
        getDocs(query(collection(getDb(), FIRESTORE.MEDICINES),    where("userId", "==", user.id))),
        getDocs(query(collection(getDb(), FIRESTORE.VITALS),       where("userId", "==", user.id))),
        getDocs(query(collection(getDb(), FIRESTORE.DOSE_LOGS),    where("userId", "==", user.id), where("date", ">=", thirtyDaysAgo))),
        getDocs(query(collection(getDb(), FIRESTORE.VACCINATIONS), where("userId", "==", user.id))),
        getDocs(query(collection(getDb(), FIRESTORE.SIDE_EFFECTS), where("userId", "==", user.id))),
      ]);

      const meds: MedRow[] = medsSnap.docs.map((d) => {
        const x = d.data();
        return { name: x.name, dosage: x.dosage, form: x.form, expiryDate: x.expiryDate, stock: x.stock };
      });

      const vitals: VitalRow[] = vitalsSnap.docs
        .map((d) => { const x = d.data(); return { type: x.type, value: x.value, recordedAt: x.recordedAt }; })
        .sort((a, b) => (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""))
        .slice(0, 20);

      const doses: DoseRow[] = dosesSnap.docs.map((d) => {
        const x = d.data();
        return { medicineName: x.medicineName, status: x.status, date: x.date };
      });

      const vaccs: VaccRow[] = vaccsSnap.docs.map((d) => {
        const x = d.data();
        return { name: x.name, vaccinatedDate: x.vaccinatedDate, validUntil: x.validUntil };
      });

      const effects: SEffectRow[] = effectsSnap.docs
        .map((d) => { const x = d.data(); return { medicineName: x.medicineName, symptom: x.symptom, severity: x.severity, recordedAt: x.recordedAt }; })
        .sort((a, b) => (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""))
        .slice(0, 20);

      const html = buildHtml(user, meds, vitals, doses, vaccs, effects);
      const result = await Print.printToFileAsync({ html, base64: false });

      // Try to backup to Firebase Storage — non-blocking
      try {
        const blob = await fetch(result.uri).then((r) => r.blob());
        const storageRef = ref(getFirebaseStorage(), `reports/${user.id}/report_${Date.now()}.pdf`);
        await uploadBytes(storageRef, blob);
      } catch {
        // Storage backup failed — continue, share still works
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share MediGuard Health Report",
        UTI: "com.adobe.pdf",
      });
    } catch (err: any) {
      console.error("[ExportPDF] error:", err?.message ?? err);
      Alert.alert("Error", "Could not generate the PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const SUMMARY_ITEMS = [
    { icon: "medkit-outline" as const,            label: "Medicines",        key: "medicines",    color: Colors.primary },
    { icon: "heart-outline" as const,             label: "Vitals",           key: "vitals",       color: "#E53935" },
    { icon: "checkmark-circle-outline" as const,  label: "Dose Logs (30d)", key: "doseLogs",     color: "#1565C0" },
    { icon: "shield-checkmark-outline" as const,  label: "Vaccinations",     key: "vaccinations", color: "#6A1B9A" },
    { icon: "warning-outline" as const,           label: "Side Effects",     key: "sideEffects",  color: Colors.orange },
  ] as const;

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
        <Text style={s.headerTitle}>Export Health Data</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name="document-text" size={38} color={Colors.primary} />
          </View>
          <Text style={s.bannerTitle}>MediGuard Health Report</Text>
          <Text style={s.bannerSub}>
            Generate a professional PDF of your complete health data — medicines, vitals, dose history, vaccinations, and more.
          </Text>
        </View>

        {/* Summary counts */}
        <Text style={s.sectionLabel}>REPORT CONTENTS</Text>

        {loadingPreview ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={s.grid}>
            {SUMMARY_ITEMS.map((item) => (
              <View key={item.key} style={s.gridCard}>
                <View style={[s.gridIcon, { backgroundColor: item.color + "1A" }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={s.gridCount}>{summary?.[item.key] ?? 0}</Text>
                <Text style={s.gridLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* What's included */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>WHAT'S INSIDE THE PDF</Text>
        <View style={s.includeCard}>
          {[
            "Full medicine inventory with dosage, form, expiry and stock",
            "Recent vitals — blood pressure, sugar, temperature, weight",
            "30-day dose adherence summary with taken / missed counts",
            "Complete vaccination records with validity dates",
            "Reported side effects categorised by severity",
          ].map((line, i) => (
            <View key={i} style={s.includeRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={s.includeText}>{line}</Text>
            </View>
          ))}
        </View>

        {/* Info note */}
        <View style={s.noteCard}>
          <Ionicons name="information-circle-outline" size={18} color="#1565C0" />
          <Text style={s.noteText}>
            The PDF is saved to your device and a share sheet opens so you can send it via WhatsApp, email, or Google Drive.
          </Text>
        </View>
      </ScrollView>

      {/* Generate button pinned at bottom */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.genBtn, generating && s.genBtnDisabled]}
          onPress={handleGeneratePDF}
          disabled={generating}
          activeOpacity={0.85}
        >
          {generating ? (
            <>
              <ActivityIndicator color={Colors.white} size="small" />
              <Text style={s.genBtnText}>Generating PDF…</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={22} color={Colors.white} />
              <Text style={s.genBtnText}>Generate &amp; Share PDF</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={s.footerNote}>Data sourced from your MediGuard account · For personal use only</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.white, flex: 1, textAlign: "center" },

  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 20 },

  // Banner
  banner: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  bannerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  bannerSub:   { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 19 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 2,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCard: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  gridIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  gridCount: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  gridLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: "center" },

  // Includes
  includeCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  includeRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  includeText: { flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },

  // Note
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBDEFB",
    padding: 14,
  },
  noteText: { flex: 1, fontSize: 13, color: "#1565C0", lineHeight: 19 },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 10,
    alignItems: "center",
  },
  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignSelf: "stretch",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  genBtnDisabled: { backgroundColor: "#A5D6A7", shadowOpacity: 0, elevation: 0 },
  genBtnText:     { fontSize: 15, fontWeight: "700", color: Colors.white, letterSpacing: 0.5 },
  footerNote:     { fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
});
