import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";
import {
  saveWellnessLog,
  getTodayLog,
  todayDateString,
} from "@/services/wellnessLog";

// ─── Constants ───────────────────────────────────────────────────────────────

const MOOD_EMOJI = ["😢", "😟", "😐", "🙂", "😄"] as const;
const MOOD_LABEL = ["Awful", "Bad", "Okay", "Good", "Great"] as const;

function painColor(value: number): string {
  if (value <= 3) return Colors.primary;
  if (value <= 6) return Colors.orange;
  return Colors.alertRed;
}

function painPale(value: number): string {
  if (value <= 3) return Colors.primaryPale;
  if (value <= 6) return Colors.orangePale;
  return Colors.redPale;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function DailyLogScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);

  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [errors, setErrors] = useState<{
    mood?: string;
    energy?: string;
    pain?: string;
    sleep?: string;
  }>({});

  // ── Load today's log if exists ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const existing = await getTodayLog(user.id);
        if (existing) {
          setMood(existing.mood);
          setEnergy(existing.energy);
          setPain(existing.pain);
          setSleepHours(String(existing.sleepHours));
          setNotes(existing.notes ?? "");
          setIsUpdate(true);
        }
      } catch (err) {
        console.error("DailyLog load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (mood == null) next.mood = "Please select your mood";
    if (energy == null) next.energy = "Please select your energy level";
    if (pain == null) next.pain = "Please select your pain level";

    const sleepNum = parseFloat(sleepHours);
    if (!sleepHours.trim() || Number.isNaN(sleepNum)) {
      next.sleep = "Please enter sleep hours";
    } else if (sleepNum < 0 || sleepNum > 24) {
      next.sleep = "Sleep hours must be between 0 and 24";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!user) {
      Alert.alert("Not signed in", "Please sign in to save your wellness log.");
      return;
    }
    if (!validate()) return;

    setSaving(true);
    try {
      await saveWellnessLog({
        userId: user.id,
        date: todayDateString(),
        mood: mood as number,
        energy: energy as number,
        pain: pain as number,
        sleepHours: parseFloat(sleepHours),
        notes: notes.trim(),
      });
      Alert.alert(
        isUpdate ? "Log Updated" : "Log Saved",
        isUpdate
          ? "Today's wellness log has been updated."
          : "Today's wellness log has been saved.",
        [
          {
            text: "View Progress",
            onPress: () => navigation.navigate("WellnessProgress"),
          },
          { text: "Done", onPress: () => navigation.goBack() },
        ],
      );
    } catch (err) {
      console.error("DailyLog save error:", err);
      Alert.alert("Save failed", "Could not save your log. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Daily Log</Text>
          <Text style={styles.headerSubtitle}>{today}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <Text style={styles.intro}>
            {isUpdate
              ? "You've already logged today. Adjust your responses below."
              : "How are you feeling today?"}
          </Text>

          {/* Mood */}
          <View style={styles.card}>
            <Text style={styles.label}>Mood</Text>
            <View style={styles.moodRow}>
              {MOOD_EMOJI.map((emoji, idx) => {
                const value = idx + 1;
                const selected = mood === value;
                return (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => setMood(value)}
                    activeOpacity={0.7}
                    style={[
                      styles.moodBtn,
                      selected && styles.moodBtnSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.moodEmoji,
                        selected && styles.moodEmojiSelected,
                      ]}
                    >
                      {emoji}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {mood != null && (
              <Text style={styles.helper}>{MOOD_LABEL[mood - 1]}</Text>
            )}
            {errors.mood && <Text style={styles.error}>{errors.mood}</Text>}
          </View>

          {/* Energy */}
          <View style={styles.card}>
            <Text style={styles.label}>Energy Level</Text>
            <View style={styles.pillRow}>
              {[1, 2, 3, 4, 5].map((value) => {
                const selected = energy === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setEnergy(value)}
                    activeOpacity={0.7}
                    style={[
                      styles.energyPill,
                      selected && styles.energyPillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.energyPillText,
                        selected && styles.energyPillTextSelected,
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.scaleRow}>
              <Text style={styles.scaleHint}>Low</Text>
              <Text style={styles.scaleHint}>High</Text>
            </View>
            {errors.energy && <Text style={styles.error}>{errors.energy}</Text>}
          </View>

          {/* Pain */}
          <View style={styles.card}>
            <Text style={styles.label}>Pain Level</Text>
            <View style={styles.painRow}>
              {Array.from({ length: 11 }, (_, i) => i).map((value) => {
                const selected = pain === value;
                const color = painColor(value);
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setPain(value)}
                    activeOpacity={0.7}
                    style={[
                      styles.painPill,
                      {
                        backgroundColor: selected ? color : painPale(value),
                        borderColor: selected ? color : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.painPillText,
                        { color: selected ? Colors.white : color },
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.scaleRow}>
              <Text style={styles.scaleHint}>No pain</Text>
              <Text style={styles.scaleHint}>Severe</Text>
            </View>
            {errors.pain && <Text style={styles.error}>{errors.pain}</Text>}
          </View>

          {/* Sleep */}
          <View style={styles.card}>
            <Text style={styles.label}>Sleep Hours</Text>
            <TextInput
              style={[styles.input, errors.sleep ? styles.inputError : null]}
              keyboardType="numeric"
              placeholder="e.g. 7.5"
              placeholderTextColor={Colors.textSecondary}
              value={sleepHours}
              onChangeText={setSleepHours}
            />
            {errors.sleep && <Text style={styles.error}>{errors.sleep}</Text>}
          </View>

          {/* Notes */}
          <View style={styles.card}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              multiline
              numberOfLines={3}
              placeholder="Anything to add? Symptoms, side effects, how was your day..."
              placeholderTextColor={Colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons
                  name={isUpdate ? "refresh" : "checkmark-circle"}
                  size={18}
                  color={Colors.white}
                />
                <Text style={styles.saveBtnText}>
                  {isUpdate ? "Update Today's Log" : "Save Today's Log"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
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
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.white },
  headerSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  scroll: { padding: 16, paddingBottom: 32 },

  intro: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  // Mood
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moodBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F8",
  },
  moodBtnSelected: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.1 }],
  },
  moodEmoji: { fontSize: 26 },
  moodEmojiSelected: { fontSize: 28 },

  // Energy
  pillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  energyPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F4F6F8",
    alignItems: "center",
  },
  energyPillSelected: { backgroundColor: Colors.primary },
  energyPillText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  energyPillTextSelected: { color: Colors.white },

  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  scaleHint: { fontSize: 11, color: Colors.textSecondary },

  // Pain
  painRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
  },
  painPill: {
    width: 28,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  painPillText: { fontSize: 12, fontWeight: "700" },

  // Helper / Error
  helper: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },
  error: {
    fontSize: 12,
    color: Colors.alertRed,
    marginTop: 8,
    fontWeight: "500",
  },

  // Inputs
  input: {
    backgroundColor: "#F4F6F8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: { borderColor: Colors.alertRed },
  notesInput: { minHeight: 80, textAlignVertical: "top" },

  // Save button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 6,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: 0.4,
  },
});
