import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
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
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

// ─── Types ───────────────────────────────────────────────────────────────────

type FamilyMember = {
  id: string;
  name: string;
  relation: string;
  pin: string;
};

type ModalMode = "add" | "pin" | null;

// ─── Numpad ──────────────────────────────────────────────────────────────────

function Numpad({
  onPress,
  onDelete,
}: {
  onPress: (d: string) => void;
  onDelete: () => void;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  return (
    <View style={s.numpad}>
      {keys.map((k, i) =>
        k === "" ? (
          <View key={`empty-${i}`} style={s.numKey} />
        ) : (
          <TouchableOpacity
            key={k + i}
            style={s.numKey}
            activeOpacity={0.7}
            onPress={() => (k === "⌫" ? onDelete() : onPress(k))}
          >
            <Text style={s.numKeyText}>{k}</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

// ─── PIN Dots ────────────────────────────────────────────────────────────────

function PinDots({ value, hasError }: { value: string; hasError: boolean }) {
  return (
    <View style={s.pinDotsRow}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            s.pinDot,
            value.length > i && s.pinDotFilled,
            hasError && s.pinDotError,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Helper: initials ────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Relation chips ──────────────────────────────────────────────────────────

const RELATIONS = ["Mother", "Father", "Spouse", "Child", "Sibling", "Grandparent"];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function FamilyProfilesScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  // List state
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string>("main");

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  // Add-member form
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [newPin, setNewPin] = useState("");
  const [saving, setSaving] = useState(false);

  // PIN entry
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Shake animation for wrong PIN
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Load members ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadMembers() {
    if (!user) return;
    setLoading(true);
    try {
      const db = getDb();
      const snap = await getDocs(
        query(
          collection(db, FIRESTORE.FAMILY),
          where("parentUserId", "==", user.id)
        )
      );
      const list: FamilyMember[] = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        relation: d.data().relation,
        pin: d.data().pin,
      }));
      setMembers(list);
    } catch {
      Alert.alert("Error", "Could not load family members.");
    } finally {
      setLoading(false);
    }
  }

  // ── Add member ────────────────────────────────────────────────────────────

  function openAddModal() {
    setNewName("");
    setNewRelation("");
    setNewPin("");
    setModalMode("add");
  }

  async function handleSaveMember() {
    if (!user || newName.trim() === "" || newPin.length !== 4) return;
    setSaving(true);
    try {
      const db = getDb();
      const ref = await addDoc(collection(db, FIRESTORE.FAMILY), {
        parentUserId: user.id,
        name: newName.trim(),
        relation: newRelation.trim(),
        pin: newPin,
      });
      setMembers((prev) => [
        ...prev,
        { id: ref.id, name: newName.trim(), relation: newRelation.trim(), pin: newPin },
      ]);
      setModalMode(null);
    } catch {
      Alert.alert("Error", "Could not save family member.");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete member ─────────────────────────────────────────────────────────

  function confirmDelete(member: FamilyMember) {
    Alert.alert(
      "Remove Member",
      `Remove ${member.name} from family profiles?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const db = getDb();
              await deleteDoc(doc(db, FIRESTORE.FAMILY, member.id));
              setMembers((prev) => prev.filter((m) => m.id !== member.id));
              if (activeId === member.id) setActiveId("main");
            } catch {
              Alert.alert("Error", "Could not remove member.");
            }
          },
        },
      ]
    );
  }

  // ── PIN modal ─────────────────────────────────────────────────────────────

  function openPinModal(member: FamilyMember) {
    setSelectedMember(member);
    setEnteredPin("");
    setPinError(false);
    setModalMode("pin");
  }

  function handlePinDigit(digit: string) {
    if (enteredPin.length >= 4) return;
    const next = enteredPin + digit;
    setEnteredPin(next);
    setPinError(false);
    if (next.length === 4) {
      // Auto-check after slight delay so last dot renders
      setTimeout(() => checkPin(next), 120);
    }
  }

  function handlePinDelete() {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(false);
  }

  function checkPin(pin: string) {
    if (!selectedMember) return;
    if (pin === selectedMember.pin) {
      setActiveId(selectedMember.id);
      setModalMode(null);
      Alert.alert("Profile Switched", `Now viewing ${selectedMember.name}'s profile.`);
    } else {
      setPinError(true);
      setEnteredPin("");
      triggerShake();
    }
  }

  function triggerShake() {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  // ── Main user card (always first) ─────────────────────────────────────────

  const mainInitials = user?.name ? getInitials(user.name) : "?";
  const isMainActive = activeId === "main";

  function renderMainCard() {
    return (
      <TouchableOpacity
        style={[s.card, isMainActive && s.cardActive]}
        activeOpacity={0.85}
        onPress={() => setActiveId("main")}
      >
        <View style={[s.avatar, isMainActive && s.avatarActive]}>
          <Text style={s.avatarText}>{mainInitials}</Text>
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardName}>{user?.name || "You"}</Text>
          <Text style={s.cardRelation}>Main account</Text>
        </View>
        {isMainActive ? (
          <View style={s.activeBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
            <Text style={s.activeBadgeText}>Active</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  }

  function renderMemberCard({ item }: { item: FamilyMember }) {
    const isActive = activeId === item.id;
    const initials = getInitials(item.name);
    return (
      <TouchableOpacity
        style={[s.card, isActive && s.cardActive]}
        activeOpacity={0.85}
        onPress={() => (isActive ? null : openPinModal(item))}
        onLongPress={() => confirmDelete(item)}
        delayLongPress={600}
      >
        <View style={[s.avatar, isActive && s.avatarActive]}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardName}>{item.name}</Text>
          <Text style={s.cardRelation}>
            {item.relation || "Family member"}
          </Text>
          {!isActive && (
            <Text style={s.tapHint}>Tap to switch →</Text>
          )}
        </View>
        {isActive ? (
          <View style={s.activeBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
            <Text style={s.activeBadgeText}>Active</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Family Profiles</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Body */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          ListHeaderComponent={
            <>
              <Text style={s.hint}>Long-press a member card to remove them.</Text>
              {renderMainCard()}
            </>
          }
          renderItem={renderMemberCard}
          ListFooterComponent={
            <TouchableOpacity style={s.addBtn} onPress={openAddModal} activeOpacity={0.85}>
              <Ionicons name="person-add-outline" size={20} color={Colors.white} />
              <Text style={s.addBtnText}>Add Family Member</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* ── Add Member Modal ─────────────────────────────────────────────── */}
      <Modal visible={modalMode === "add"} transparent animationType="slide">
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Family Member</Text>

            {/* Name */}
            <Text style={s.fieldLabel}>Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Ammi Jan"
              placeholderTextColor={Colors.textSecondary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            {/* Relation */}
            <Text style={s.fieldLabel}>Relation</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Mother"
              placeholderTextColor={Colors.textSecondary}
              value={newRelation}
              onChangeText={setNewRelation}
            />

            {/* Relation chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.chipsScroll}
              contentContainerStyle={s.chips}
            >
              {RELATIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[s.chip, newRelation === r && s.chipActive]}
                  onPress={() => setNewRelation(r)}
                >
                  <Text style={[s.chipText, newRelation === r && s.chipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* PIN */}
            <Text style={s.fieldLabel}>Set 4-digit PIN</Text>
            <View style={s.pinBoxRow}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[s.pinBox, newPin.length > i && s.pinBoxFilled]}
                >
                  <Text style={s.pinBoxStar}>{newPin.length > i ? "●" : ""}</Text>
                </View>
              ))}
            </View>

            <Numpad
              onPress={(d) => {
                if (newPin.length < 4) setNewPin((p) => p + d);
              }}
              onDelete={() => setNewPin((p) => p.slice(0, -1))}
            />

            {/* Actions */}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setModalMode(null)}
                disabled={saving}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.saveBtn,
                  (newName.trim() === "" || newPin.length !== 4) && s.saveBtnDisabled,
                ]}
                onPress={handleSaveMember}
                disabled={saving || newName.trim() === "" || newPin.length !== 4}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={s.saveBtnText}>Save Member</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── PIN Entry Modal ──────────────────────────────────────────────── */}
      <Modal visible={modalMode === "pin"} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.pinModalCard}>
            <Text style={s.modalTitle}>Switch Profile</Text>
            <Text style={s.pinSubtitle}>
              Enter PIN for{" "}
              <Text style={{ fontWeight: "700", color: Colors.textPrimary }}>
                {selectedMember?.name}
              </Text>
            </Text>

            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <PinDots value={enteredPin} hasError={pinError} />
            </Animated.View>

            {pinError && (
              <Text style={s.pinErrorText}>Incorrect PIN. Try again.</Text>
            )}

            <Numpad onPress={handlePinDigit} onDelete={handlePinDelete} />

            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setModalMode(null)}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

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
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.white },

  // List
  list: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, textAlign: "center" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Member card
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardActive: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarActive: { backgroundColor: Colors.primary },
  avatarText: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 2 },
  cardRelation: { fontSize: 13, color: Colors.textSecondary },
  tapHint: { fontSize: 11, color: Colors.primaryLight, marginTop: 3 },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeBadgeText: { fontSize: 12, fontWeight: "700", color: Colors.white },

  // Add button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  addBtnText: { fontSize: 15, fontWeight: "700", color: Colors.white },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  pinModalCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 36,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  pinSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: "center",
  },

  // Form
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.primaryPale,
  },

  // Relation chips
  chipsScroll: { marginTop: 8 },
  chips: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: "500", color: Colors.primary },
  chipTextActive: { color: Colors.white },

  // PIN boxes (in Add form)
  pinBoxRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginVertical: 12,
  },
  pinBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primaryPale,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  pinBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  pinBoxStar: { fontSize: 22, color: Colors.primary },

  // PIN dots (in Switch modal)
  pinDotsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: "transparent",
  },
  pinDotFilled: { backgroundColor: Colors.primary },
  pinDotError: { borderColor: Colors.alertRed, backgroundColor: Colors.alertRed },

  pinErrorText: {
    color: Colors.alertRed,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },

  // Numpad
  numpad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    gap: 10,
    marginVertical: 8,
  },
  numKey: {
    width: 72,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  numKeyText: { fontSize: 20, fontWeight: "600", color: Colors.greenDark },

  // Modal actions
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primaryPale,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: Colors.textSecondary },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: Colors.white },
});
