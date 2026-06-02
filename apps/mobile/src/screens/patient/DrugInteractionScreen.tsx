import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@mediguard/shared";
import { useMedicineStore } from "@/store/medicineStore";
import { ENV } from "@/config/env";

type ResultData = {
  level: "safe" | "mild" | "serious";
  total: number;
  reactions: string[];
};

const RESULT_CONFIG = {
  safe: {
    bg: Colors.primaryPale,
    border: Colors.primary,
    icon: "checkmark-circle" as const,
    iconColor: Colors.primary,
    title: "No Interactions Found",
    subtitle: "These medicines appear safe to take together based on available data.",
  },
  mild: {
    bg: Colors.orangePale,
    border: Colors.orange,
    icon: "warning" as const,
    iconColor: Colors.orange,
    title: "Mild Interaction Detected",
    subtitle: "Use with caution. Consult your doctor before combining these medicines.",
  },
  serious: {
    bg: Colors.redPale,
    border: Colors.alertRed,
    icon: "alert-circle" as const,
    iconColor: Colors.alertRed,
    title: "Serious Interaction Detected",
    subtitle: "Avoid this combination. Speak to your doctor immediately.",
  },
};

export function DrugInteractionScreen() {
  const navigation = useNavigation();
  const medicines = useMedicineStore((s) => s.medicines);

  const [drug1, setDrug1] = useState("");
  const [drug2, setDrug2] = useState("");
  const [activeField, setActiveField] = useState<1 | 2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestions1 = drug1.trim()
    ? medicines
        .filter((m) => m.name.toLowerCase().includes(drug1.toLowerCase()))
        .slice(0, 4)
    : [];

  const suggestions2 = drug2.trim()
    ? medicines
        .filter((m) => m.name.toLowerCase().includes(drug2.toLowerCase()))
        .slice(0, 4)
    : [];

  async function checkInteraction() {
    if (!drug1.trim() || !drug2.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(
        `${ENV.BACKEND_URL}/api/interactions/check?drug1=${encodeURIComponent(drug1)}&drug2=${encodeURIComponent(drug2)}`
      );
      const data = await res.json();
      const total = data?.meta?.results?.total ?? data?.results?.length ?? 0;
      const results = data?.results ?? [];
      const hasSerious = results.some((r: any) => r.serious === "1");
      const reactions = (results[0]?.patient?.reaction ?? [])
        .map((r: any) => r.reactionmeddrapt)
        .filter(Boolean)
        .slice(0, 5);
      setResult({
        level: total === 0 ? "safe" : hasSerious ? "serious" : "mild",
        total,
        reactions,
      });
    } catch {
      setError("Could not check interaction. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  const canCheck = drug1.trim().length > 0 && drug2.trim().length > 0;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Drug Interaction Checker</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Drug 1 */}
        <Text style={s.label}>Medicine 1</Text>
        <View style={s.inputWrapper}>
          <View style={s.inputRow}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} style={s.searchIcon} />
            <TextInput
              style={s.input}
              placeholder="Search or type medicine name..."
              placeholderTextColor={Colors.textSecondary}
              value={drug1}
              onChangeText={(t) => {
                setDrug1(t);
                setActiveField(1);
                setResult(null);
              }}
              onFocus={() => setActiveField(1)}
              onBlur={() => setTimeout(() => setActiveField(null), 150)}
            />
            {drug1.length > 0 && (
              <TouchableOpacity onPress={() => { setDrug1(""); setResult(null); }}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Dropdown 1 */}
          {activeField === 1 && suggestions1.length > 0 && (
            <View style={s.dropdown}>
              {suggestions1.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={s.dropdownItem}
                  onPress={() => {
                    setDrug1(m.name);
                    setActiveField(null);
                  }}
                >
                  <Ionicons name="medkit-outline" size={14} color={Colors.primary} />
                  <Text style={s.dropdownText}>{m.name}</Text>
                  {m.dosage ? (
                    <Text style={s.dropdownDosage}>{m.dosage}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Drug 2 */}
        <Text style={[s.label, { marginTop: 16 }]}>Medicine 2</Text>
        <View style={s.inputWrapper}>
          <View style={s.inputRow}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} style={s.searchIcon} />
            <TextInput
              style={s.input}
              placeholder="Search or type medicine name..."
              placeholderTextColor={Colors.textSecondary}
              value={drug2}
              onChangeText={(t) => {
                setDrug2(t);
                setActiveField(2);
                setResult(null);
              }}
              onFocus={() => setActiveField(2)}
              onBlur={() => setTimeout(() => setActiveField(null), 150)}
            />
            {drug2.length > 0 && (
              <TouchableOpacity onPress={() => { setDrug2(""); setResult(null); }}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Dropdown 2 */}
          {activeField === 2 && suggestions2.length > 0 && (
            <View style={s.dropdown}>
              {suggestions2.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={s.dropdownItem}
                  onPress={() => {
                    setDrug2(m.name);
                    setActiveField(null);
                  }}
                >
                  <Ionicons name="medkit-outline" size={14} color={Colors.primary} />
                  <Text style={s.dropdownText}>{m.name}</Text>
                  {m.dosage ? (
                    <Text style={s.dropdownDosage}>{m.dosage}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Check Button */}
        <TouchableOpacity
          style={[s.checkBtn, !canCheck && s.checkBtnDisabled]}
          onPress={checkInteraction}
          disabled={!canCheck || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="swap-horizontal" size={20} color={Colors.white} />
              <Text style={s.checkBtnText}>CHECK INTERACTION</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Error */}
        {error && (
          <View style={s.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.alertRed} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Result Card */}
        {result && (() => {
          const cfg = RESULT_CONFIG[result.level];
          return (
            <View style={[s.resultCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              {/* Title row */}
              <View style={s.resultTitleRow}>
                <Ionicons name={cfg.icon} size={28} color={cfg.iconColor} />
                <Text style={[s.resultTitle, { color: cfg.iconColor }]}>{cfg.title}</Text>
              </View>

              <Text style={s.resultSubtitle}>{cfg.subtitle}</Text>

              {/* Reactions list */}
              {result.reactions.length > 0 && (
                <View style={s.reactionsBox}>
                  <Text style={s.reactionsHeading}>Reported Reactions:</Text>
                  {result.reactions.map((r, i) => (
                    <View key={i} style={s.reactionRow}>
                      <Text style={[s.reactionBullet, { color: cfg.iconColor }]}>•</Text>
                      <Text style={s.reactionText}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* FDA count */}
              <View style={s.fdaRow}>
                <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
                <Text style={s.fdaText}>
                  {result.total.toLocaleString()} adverse event{result.total !== 1 ? "s" : ""} reported in FDA database
                </Text>
              </View>

              {/* Disclaimer */}
              <Text style={s.disclaimer}>
                Data sourced from OpenFDA. Always consult your doctor.
              </Text>
            </View>
          );
        })()}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: Colors.bg },
  header:          { backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn:         { padding: 4 },
  headerTitle:     { fontSize: 18, fontWeight: "700", color: Colors.white, flex: 1, textAlign: "center" },
  scroll:          { flex: 1 },
  content:         { padding: 16, paddingBottom: 40 },
  label:           { fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 6, marginLeft: 2 },
  inputWrapper:    { zIndex: 10 },
  inputRow:        { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  searchIcon:      { marginRight: 8 },
  input:           { flex: 1, fontSize: 14, color: Colors.textPrimary, paddingVertical: 0 },
  dropdown:        { position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: Colors.card, borderRadius: 12, marginTop: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 8, zIndex: 10, overflow: "hidden" },
  dropdownItem:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  dropdownText:    { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: "500" },
  dropdownDosage:  { fontSize: 12, color: Colors.textSecondary },
  checkBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 24, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  checkBtnDisabled:{ backgroundColor: "#A5D6A7", shadowOpacity: 0 },
  checkBtnText:    { fontSize: 15, fontWeight: "700", color: Colors.white, letterSpacing: 0.8 },
  errorCard:       { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.redPale, borderRadius: 12, borderWidth: 1, borderColor: Colors.alertRed, padding: 14, marginTop: 16 },
  errorText:       { flex: 1, fontSize: 13, color: Colors.alertRed, lineHeight: 18 },
  resultCard:      { borderRadius: 16, borderWidth: 1.5, padding: 18, marginTop: 24, gap: 12 },
  resultTitleRow:  { flexDirection: "row", alignItems: "center", gap: 10 },
  resultTitle:     { fontSize: 17, fontWeight: "700", flex: 1 },
  resultSubtitle:  { fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  reactionsBox:    { gap: 6, marginTop: 4 },
  reactionsHeading:{ fontSize: 12, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6 },
  reactionRow:     { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  reactionBullet:  { fontSize: 16, lineHeight: 20, fontWeight: "700" },
  reactionText:    { fontSize: 13, color: Colors.textPrimary, lineHeight: 20, flex: 1 },
  fdaRow:          { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  fdaText:         { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  disclaimer:      { fontSize: 11, color: Colors.textSecondary, fontStyle: "italic", lineHeight: 16 },
});
