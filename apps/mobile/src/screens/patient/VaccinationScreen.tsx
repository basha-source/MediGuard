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
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type VaccinItem = {
  id: string;
  name: string;
  date: string;        // ISO date given
  validUntil?: string; // ISO date expires
};

type VaccinStatus = "completed" | "due" | "overdue";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00"); // avoid timezone shifts
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function getVaccinationStatus(v: VaccinItem): VaccinStatus {
  if (!v.validUntil) return "completed";
  const expiry = new Date(v.validUntil);
  const now = new Date();
  if (expiry < now) return "overdue";
  const thirtyDays = new Date();
  thirtyDays.setDate(now.getDate() + 30);
  if (expiry <= thirtyDays) return "due";
  return "completed";
}

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    color: Colors.primary,
    bg: Colors.primaryPale,
    icon: "checkmark-circle" as const,
  },
  due: {
    label: "Due Soon",
    color: Colors.orange,
    bg: Colors.orangePale,
    icon: "time-outline" as const,
  },
  overdue: {
    label: "Overdue",
    color: Colors.alertRed,
    bg: Colors.redPale,
    icon: "alert-circle" as const,
  },
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ─── Sub-components ───────────────────────────────────────────────────────────

function VaccinCard({
  item,
  onDelete,
}: {
  item: VaccinItem;
  onDelete: (id: string) => void;
}) {
  const status = getVaccinationStatus(item);
  const cfg = STATUS_CONFIG[status];

  const handleLongPress = () => {
    Alert.alert(
      "Delete Record",
      `Remove "${item.name}" from your vaccination records?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(item.id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={handleLongPress}
      activeOpacity={0.85}
      delayLongPress={400}
    >
      <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={24} color={cfg.color} />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.vaccineName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardMeta}>Given: {formatDate(item.date)}</Text>
        {item.validUntil ? (
          <Text style={styles.cardMeta}>
            {status === "overdue" ? "Expired: " : "Valid until: "}
            {formatDate(item.validUntil)}
          </Text>
        ) : (
          <Text style={styles.cardMeta}>No expiry date</Text>
        )}
        <Text style={styles.holdHint}>Hold to delete</Text>
      </View>

      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function AlertBanner({ count }: { count: number }) {
  return (
    <View style={styles.alertBanner}>
      <Ionicons name="warning" size={18} color={Colors.orange} style={{ marginRight: 8 }} />
      <View>
        <Text style={styles.alertTitle}>
          {count} vaccine{count !== 1 ? "s" : ""} need attention
        </Text>
        <Text style={styles.alertSub}>Tap to review</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function VaccinationScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const [items, setItems] = useState<VaccinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [dateGiven, setDateGiven] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);

  const attentionCount = items.filter((v) => {
    const s = getVaccinationStatus(v);
    return s === "due" || s === "overdue";
  }).length;

  // ─── Load ────────────────────────────────────────────────────────────────────

  const loadVaccinations = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDocs(
        query(
          collection(getDb(), FIRESTORE.VACCINATIONS),
          where("userId", "==", user.id)
        )
      );
      const data: VaccinItem[] = snap.docs
        .map((d) => ({
          id: d.id,
          name: d.data().name,
          date: d.data().date,
          validUntil: d.data().validUntil ?? undefined,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
      setItems(data);
    } catch (err) {
      console.error("VaccinationScreen load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadVaccinations();
  }, [loadVaccinations]);

  // ─── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert("Required", "Please enter the vaccine name.");
      return;
    }
    if (!DATE_REGEX.test(dateGiven)) {
      Alert.alert("Invalid Date", "Date given must be in YYYY-MM-DD format.");
      return;
    }
    if (validUntil && !DATE_REGEX.test(validUntil)) {
      Alert.alert("Invalid Date", "Valid until must be in YYYY-MM-DD format.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(getDb(), FIRESTORE.VACCINATIONS), {
        userId: user.id,
        name: name.trim(),
        date: dateGiven,
        validUntil: validUntil || null,
      });
      setModalVisible(false);
      setName("");
      setDateGiven("");
      setValidUntil("");
      await loadVaccinations();
    } catch (err) {
      console.error("VaccinationScreen save error:", err);
      Alert.alert("Error", "Could not save vaccination record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(getDb(), FIRESTORE.VACCINATIONS, id));
      setItems((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error("VaccinationScreen delete error:", err);
      Alert.alert("Error", "Could not delete record. Please try again.");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  const closeModal = () => {
    setModalVisible(false);
    setName("");
    setDateGiven("");
    setValidUntil("");
  };

  const canSave = name.trim().length > 0 && dateGiven.length > 0 && !saving;

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
        <Text style={styles.headerTitle}>Vaccination Tracker</Text>
      </View>

      {/* Alert banner */}
      {attentionCount > 0 && <AlertBanner count={attentionCount} />}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyCard}>
            <Ionicons name="medkit-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>
              No vaccinations recorded. Tap + to add your first vaccine record.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VaccinCard item={item} onDelete={handleDelete} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Add Vaccination Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Vaccination</Text>

              {/* Vaccine name */}
              <Text style={styles.inputLabel}>Vaccine Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. COVID-19 Booster"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />

              {/* Date given */}
              <Text style={styles.inputLabel}>Date Given *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textSecondary}
                value={dateGiven}
                onChangeText={setDateGiven}
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                maxLength={10}
              />

              {/* Valid until */}
              <Text style={styles.inputLabel}>Valid Until</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (optional)"
                placeholderTextColor={Colors.textSecondary}
                value={validUntil}
                onChangeText={setValidUntil}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                maxLength={10}
              />
              <Text style={styles.inputHint}>Leave blank if no expiry date</Text>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>SAVE VACCINE</Text>
                )}
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity onPress={closeModal} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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

  // Alert banner
  alertBanner: {
    backgroundColor: Colors.orangePale,
    borderColor: Colors.orange,
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.orange,
  },
  alertSub: {
    fontSize: 12,
    color: Colors.orange,
    marginTop: 1,
    opacity: 0.8,
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

  // List
  listContent: {
    padding: 16,
    paddingBottom: 96,
    gap: 12,
  },

  // Vaccine card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    gap: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  cardMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  holdHint: {
    fontSize: 10,
    color: "#BDBDBD",
    marginTop: 6,
  },

  // Status badge
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: "#FAFAFA",
  },
  inputHint: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 5,
    marginLeft: 2,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 22,
  },
  saveBtnDisabled: {
    backgroundColor: "#A5D6A7",
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cancelBtn: {
    alignItems: "center",
    marginTop: 14,
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});
