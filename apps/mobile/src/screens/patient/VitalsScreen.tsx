import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────
type VitalType = "bloodPressure" | "bloodSugar" | "temperature" | "weight";

type VitalItem = {
  id: string;
  type: VitalType;
  value: string;
  unit: string;
  status: string;
  recordedAt: string;
};

// ── Config ────────────────────────────────────────────────────────────────────
const VITAL_CONFIG: Record<
  VitalType,
  { label: string; unit: string; icon: string; placeholder: string; normalRange: string }
> = {
  bloodPressure: {
    label: "Blood Pressure",
    unit: "mmHg",
    icon: "heart-outline",
    placeholder: "e.g. 120/80",
    normalRange: "Normal: < 120/80",
  },
  bloodSugar: {
    label: "Blood Sugar",
    unit: "mg/dL",
    icon: "water-outline",
    placeholder: "e.g. 95",
    normalRange: "Normal: 70–100 mg/dL",
  },
  temperature: {
    label: "Temperature",
    unit: "°C",
    icon: "thermometer-outline",
    placeholder: "e.g. 36.6",
    normalRange: "Normal: 36.1–37.2 °C",
  },
  weight: {
    label: "Weight",
    unit: "kg",
    icon: "fitness-outline",
    placeholder: "e.g. 70",
    normalRange: "",
  },
};

// Icon circle colors per type
const ICON_COLORS: Record<VitalType, string> = {
  bloodPressure: "#E53935",
  bloodSugar: "#1976D2",
  temperature: "#FB8C00",
  weight: "#00897B",
};

// ── Status helpers ────────────────────────────────────────────────────────────
function getVitalStatus(type: VitalType, value: string): "normal" | "borderline" | "high" {
  if (type === "bloodSugar") {
    const v = parseFloat(value);
    if (v <= 100) return "normal";
    if (v <= 125) return "borderline";
    return "high";
  }
  if (type === "temperature") {
    const v = parseFloat(value);
    if (v <= 37.2) return "normal";
    if (v <= 38.0) return "borderline";
    return "high";
  }
  if (type === "bloodPressure") {
    const parts = value.split("/").map(Number);
    const sys = parts[0] ?? 0;
    if (sys < 120) return "normal";
    if (sys < 140) return "borderline";
    return "high";
  }
  return "normal"; // weight has no meaningful status
}

const STATUS_COLORS = {
  normal: Colors.primary,
  borderline: Colors.orange,
  high: Colors.alertRed,
};

const STATUS_LABELS = {
  normal: "Normal",
  borderline: "Borderline",
  high: "High",
};

// ── Timestamp formatting ──────────────────────────────────────────────────────
function formatVitalTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return "Today, " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Vital Card ────────────────────────────────────────────────────────────────
function VitalCard({ item }: { item: VitalItem }) {
  const cfg = VITAL_CONFIG[item.type];
  const iconColor = ICON_COLORS[item.type];
  const status = item.status as "normal" | "borderline" | "high";
  const showBadge = item.type !== "weight";

  return (
    <View style={s.card}>
      {/* Icon circle */}
      <View style={[s.iconCircle, { backgroundColor: iconColor + "20" }]}>
        <Ionicons name={cfg.icon as any} size={22} color={iconColor} />
      </View>

      {/* Middle content */}
      <View style={s.cardMiddle}>
        <Text style={s.cardLabel}>{cfg.label}</Text>
        <Text style={s.cardValue}>
          {item.value}
          <Text style={s.cardUnit}> {item.unit}</Text>
        </Text>
        <Text style={s.cardTime}>{formatVitalTime(item.recordedAt)}</Text>
      </View>

      {/* Status badge */}
      {showBadge && STATUS_COLORS[status] && (
        <View style={[s.badge, { backgroundColor: STATUS_COLORS[status] + "18" }]}>
          <Text style={[s.badgeText, { color: STATUS_COLORS[status] }]}>
            {STATUS_LABELS[status]}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function VitalsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const [vitals, setVitals] = useState<VitalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<VitalType>("bloodPressure");
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Load vitals ─────────────────────────────────────────────────────────────
  const loadVitals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const db = getDb();
      const snap = await getDocs(
        query(
          collection(db, FIRESTORE.VITALS),
          where("userId", "==", user.id)
        )
      );
      const items: VitalItem[] = snap.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<VitalItem, "id">),
        }))
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .slice(0, 20);
      setVitals(items);
    } catch (err) {
      console.error("loadVitals error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadVitals();
  }, [loadVitals]);

  // ── Save vital ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    const trimmed = inputValue.trim();
    if (!trimmed) {
      Alert.alert("Missing value", "Please enter a reading value.");
      return;
    }
    setSaving(true);
    try {
      const db = getDb();
      await addDoc(collection(db, FIRESTORE.VITALS), {
        userId: user.id,
        type: selectedType,
        value: trimmed,
        unit: VITAL_CONFIG[selectedType].unit,
        status: getVitalStatus(selectedType, trimmed),
        recordedAt: new Date().toISOString(),
      });
      setModalVisible(false);
      setInputValue("");
      setSelectedType("bloodPressure");
      loadVitals();
    } catch (err) {
      Alert.alert("Error", "Failed to save reading. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    setInputValue("");
    setSelectedType("bloodPressure");
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setInputValue("");
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Vitals & Readings</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* List */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={vitals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => <VitalCard item={item} />}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="pulse-outline" size={52} color={Colors.primaryLight} />
              <Text style={s.emptyText}>No vitals logged yet.</Text>
              <Text style={s.emptySubText}>Tap + to log your first reading.</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={openModal} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Log Vital Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalCard}>
            {/* Modal header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Log Vital Reading</Text>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Type chips */}
            <Text style={s.fieldLabel}>Type</Text>
            <View style={s.chipsRow}>
              {(Object.keys(VITAL_CONFIG) as VitalType[]).map((type) => {
                const active = selectedType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => {
                      setSelectedType(type);
                      setInputValue("");
                    }}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>
                      {VITAL_CONFIG[type].label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Value input */}
            <Text style={s.fieldLabel}>Reading</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.textInput}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={VITAL_CONFIG[selectedType].placeholder}
                placeholderTextColor={Colors.textSecondary}
                keyboardType={selectedType === "bloodPressure" ? "default" : "decimal-pad"}
                autoCorrect={false}
              />
              <View style={s.unitBadge}>
                <Text style={s.unitText}>{VITAL_CONFIG[selectedType].unit}</Text>
              </View>
            </View>

            {/* Normal range hint */}
            {VITAL_CONFIG[selectedType].normalRange !== "" && (
              <Text style={s.rangeHint}>{VITAL_CONFIG[selectedType].normalRange}</Text>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={s.saveBtnText}>SAVE READING</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
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
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },

  // Vital card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardMiddle: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  cardUnit: {
    fontSize: 13,
    fontWeight: "400",
    color: Colors.textSecondary,
  },
  cardTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Empty state
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 22,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  // Field label
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Type chips
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },

  // Input
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  unitBadge: {
    backgroundColor: Colors.primaryPale,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#E0E0E0",
  },
  unitText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  rangeHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 18,
  },

  // Save button
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: 0.8,
  },
});
