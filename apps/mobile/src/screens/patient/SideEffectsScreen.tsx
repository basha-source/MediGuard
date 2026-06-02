import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";
import { useMedicineStore } from "@/store/medicineStore";
import { useMedicines } from "@/hooks/useMedicines";

// ─── Types ────────────────────────────────────────────────────────────────────

type HistoryItem = {
  id: string;
  medicineId: string;
  medicineName: string;
  symptoms: string[];
  severity: string;
  startedAt: string;
  notes?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_SYMPTOMS = [
  "Nausea",
  "Headache",
  "Dizziness",
  "Rash",
  "Drowsiness",
  "Vomiting",
  "Itching",
  "Stomach Pain",
  "Fatigue",
  "Blurred Vision",
  "Dry Mouth",
  "Constipation",
];

const SEVERITY_CONFIG = {
  mild:     { label: "Mild",     color: Colors.primary,  paleColor: Colors.primaryPale },
  moderate: { label: "Moderate", color: Colors.orange,   paleColor: Colors.orangePale },
  severe:   { label: "Severe",   color: Colors.alertRed, paleColor: Colors.redPale },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return "Today, " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function severityColor(severity: string): string {
  if (severity === "moderate") return Colors.orange;
  if (severity === "severe") return Colors.alertRed;
  return Colors.primary;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SideEffectsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const medicines = useMedicineStore((s) => s.medicines);

  // Seed medicine store via hook
  useMedicines();

  // Form state
  const [selectedMedId, setSelectedMedId]       = useState<string>("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherSymptom, setOtherSymptom]         = useState("");
  const [severity, setSeverity]                 = useState<"mild" | "moderate" | "severe">("mild");
  const [saving, setSaving]                     = useState(false);
  const [showMedPicker, setShowMedPicker]       = useState(false);

  // History state
  const [history, setHistory]               = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ── Load history ────────────────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const snap = await getDocs(
        query(
          collection(getDb(), FIRESTORE.SIDE_EFFECTS),
          where("userId", "==", user.id),
          orderBy("startedAt", "desc"),
        ),
      );
      setHistory(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as HistoryItem)),
      );
    } catch {
      // silently fail — list will just stay empty
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const selectedMed = medicines.find((m) => m.id === selectedMedId);
  const canLog      = Boolean(selectedMedId);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function toggleSymptom(symptom: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom],
    );
  }

  async function handleLog() {
    const allSymptoms = [
      ...selectedSymptoms,
      ...(otherSymptom.trim() ? [otherSymptom.trim()] : []),
    ];

    if (allSymptoms.length === 0) {
      Alert.alert("Missing symptoms", "Select at least one symptom.");
      return;
    }
    if (!selectedMedId) {
      Alert.alert("Missing medicine", "Select a medicine.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(getDb(), FIRESTORE.SIDE_EFFECTS), {
        userId:       user!.id,
        medicineId:   selectedMedId,
        medicineName: selectedMed?.name ?? "Unknown",
        symptoms:     allSymptoms,
        severity,
        startedAt:    new Date().toISOString(),
      });

      // Reset form
      setSelectedMedId("");
      setSelectedSymptoms([]);
      setOtherSymptom("");
      setSeverity("mild");

      Alert.alert("Logged", "Side effect has been recorded successfully.");
      await loadHistory();
    } catch {
      Alert.alert("Error", "Could not save side effect. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Sub-renders ─────────────────────────────────────────────────────────────

  function renderHistoryCard({ item }: { item: HistoryItem }) {
    const barColor = severityColor(item.severity);
    return (
      <View style={[s.historyCard, { borderLeftColor: barColor }]}>
        <View style={s.historyCardContent}>
          {/* Left: info */}
          <View style={s.historyInfo}>
            <Text style={s.historyMedName}>{item.medicineName}</Text>
            <Text style={s.historySymptoms} numberOfLines={2}>
              {item.symptoms.join(", ")}
            </Text>
            <Text style={s.historyTime}>{formatTime(item.startedAt)}</Text>
          </View>
          {/* Right: severity badge */}
          <View style={[s.severityBadge, { backgroundColor: barColor + "20", borderColor: barColor }]}>
            <Text style={[s.severityBadgeText, { color: barColor }]}>
              {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Side Effects Tracker</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Log Form ───────────────────────────────────────────────────────── */}
        <Text style={s.sectionHeading}>Log Side Effects</Text>

        {/* Medicine picker row */}
        <Text style={s.fieldLabel}>Medicine</Text>
        <View style={s.pickerWrapper}>
          <TouchableOpacity
            style={s.pickerRow}
            onPress={() => setShowMedPicker((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name="medkit-outline" size={18} color={Colors.primary} style={s.pickerIcon} />
            <Text style={[s.pickerText, !selectedMed && s.pickerPlaceholder]}>
              {selectedMed ? `${selectedMed.name}${selectedMed.dosage ? "  " + selectedMed.dosage : ""}` : "Select a medicine…"}
            </Text>
            <Ionicons
              name={showMedPicker ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Dropdown */}
          {showMedPicker && (
            <View style={s.dropdown}>
              {medicines.length === 0 ? (
                <View style={s.dropdownEmpty}>
                  <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
                  <Text style={s.dropdownEmptyText}>
                    Add medicines first in your inventory
                  </Text>
                </View>
              ) : (
                medicines.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      s.dropdownItem,
                      m.id === selectedMedId && s.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setSelectedMedId(m.id);
                      setShowMedPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        s.dropdownItemText,
                        m.id === selectedMedId && s.dropdownItemTextActive,
                      ]}
                    >
                      {m.name}
                    </Text>
                    {m.dosage ? (
                      <Text style={s.dropdownDosage}>{m.dosage}</Text>
                    ) : null}
                    {m.id === selectedMedId && (
                      <Ionicons name="checkmark" size={16} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* Symptom chips */}
        <Text style={[s.fieldLabel, { marginTop: 20 }]}>Symptoms</Text>
        <View style={s.chipsContainer}>
          {PRESET_SYMPTOMS.map((symptom) => {
            const active = selectedSymptoms.includes(symptom);
            return (
              <TouchableOpacity
                key={symptom}
                style={[s.chip, active && s.chipActive]}
                onPress={() => toggleSymptom(symptom)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {symptom}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Other symptom text input */}
        <Text style={[s.fieldLabel, { marginTop: 12 }]}>Other</Text>
        <TextInput
          style={s.otherInput}
          placeholder="Describe any other symptom…"
          placeholderTextColor={Colors.textSecondary}
          value={otherSymptom}
          onChangeText={setOtherSymptom}
        />

        {/* Severity selector */}
        <Text style={[s.fieldLabel, { marginTop: 20 }]}>Severity</Text>
        <View style={s.severityRow}>
          {(["mild", "moderate", "severe"] as const).map((level) => {
            const cfg    = SEVERITY_CONFIG[level];
            const active = severity === level;
            return (
              <TouchableOpacity
                key={level}
                style={[
                  s.severityBtn,
                  active
                    ? { backgroundColor: cfg.color, borderColor: cfg.color }
                    : s.severityBtnInactive,
                ]}
                onPress={() => setSeverity(level)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.severityBtnText,
                    active ? s.severityBtnTextActive : { color: Colors.textSecondary },
                  ]}
                >
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Log button */}
        <TouchableOpacity
          style={[s.logBtn, !canLog && s.logBtnDisabled]}
          onPress={handleLog}
          disabled={!canLog || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
              <Text style={s.logBtnText}>LOG SIDE EFFECT</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── History ──────────────────────────────────────────────────────────── */}
        <View style={s.historySeparator}>
          <View style={s.historyLine} />
          <Text style={s.historyLabel}>History</Text>
          <View style={s.historyLine} />
        </View>

        {loadingHistory ? (
          <View style={s.centered}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : history.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="clipboard-outline" size={40} color={Colors.textSecondary} />
            <Text style={s.emptyText}>No side effects logged yet.</Text>
          </View>
        ) : (
          history.map((item) => (
            <View key={item.id}>{renderHistoryCard({ item })}</View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: Colors.bg },

  // Header
  header:             { backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn:            { padding: 4 },
  headerTitle:        { fontSize: 18, fontWeight: "700", color: Colors.white, flex: 1, textAlign: "center" },

  // Scroll
  scroll:             { flex: 1 },
  scrollContent:      { padding: 16, paddingBottom: 24 },

  // Section heading
  sectionHeading:     { fontSize: 17, fontWeight: "700", color: Colors.textPrimary, marginBottom: 16 },

  // Field label
  fieldLabel:         { fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8, marginLeft: 2 },

  // Medicine picker
  pickerWrapper:      { zIndex: 20 },
  pickerRow:          { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  pickerIcon:         { marginRight: 10 },
  pickerText:         { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: "500" },
  pickerPlaceholder:  { color: Colors.textSecondary, fontWeight: "400" },

  // Dropdown
  dropdown:           { position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: Colors.card, borderRadius: 14, marginTop: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 10, elevation: 10, zIndex: 20, overflow: "hidden" },
  dropdownItem:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 10, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  dropdownItemActive: { backgroundColor: Colors.primaryPale },
  dropdownItemText:   { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: "500" },
  dropdownItemTextActive: { color: Colors.primary, fontWeight: "600" },
  dropdownDosage:     { fontSize: 12, color: Colors.textSecondary },
  dropdownEmpty:      { flexDirection: "row", alignItems: "center", padding: 16, gap: 10 },
  dropdownEmptyText:  { fontSize: 13, color: Colors.textSecondary, flex: 1 },

  // Symptom chips
  chipsContainer:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:               { backgroundColor: Colors.card, borderWidth: 1.5, borderColor: "#D0D0D0", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive:         { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:           { fontSize: 13, color: Colors.textPrimary, fontWeight: "500" },
  chipTextActive:     { color: Colors.white, fontWeight: "600" },

  // Other input
  otherInput:         { backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.textPrimary, borderWidth: 1.5, borderColor: "#E0E0E0" },

  // Severity
  severityRow:        { flexDirection: "row", gap: 10 },
  severityBtn:        { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 2 },
  severityBtnInactive:{ backgroundColor: Colors.card, borderColor: "#D0D0D0" },
  severityBtnText:    { fontSize: 13, fontWeight: "600" },
  severityBtnTextActive: { color: Colors.white },

  // Log button
  logBtn:             { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  logBtnDisabled:     { backgroundColor: "#A5D6A7", shadowOpacity: 0 },
  logBtnText:         { fontSize: 15, fontWeight: "700", color: Colors.white, letterSpacing: 0.8 },

  // History separator
  historySeparator:   { flexDirection: "row", alignItems: "center", marginTop: 32, marginBottom: 16, gap: 10 },
  historyLine:        { flex: 1, height: 1, backgroundColor: "#D8D8D8" },
  historyLabel:       { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 0.6, textTransform: "uppercase" },

  // History card
  historyCard:        { backgroundColor: Colors.card, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 2, overflow: "hidden" },
  historyCardContent: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  historyInfo:        { flex: 1, gap: 4 },
  historyMedName:     { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  historySymptoms:    { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  historyTime:        { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // Severity badge
  severityBadge:      { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1.5, alignSelf: "flex-start" },
  severityBadgeText:  { fontSize: 11, fontWeight: "700" },

  // Empty / loading
  centered:           { padding: 32, alignItems: "center" },
  emptyState:         { alignItems: "center", gap: 12, paddingVertical: 32 },
  emptyText:          { fontSize: 14, color: Colors.textSecondary },
});
