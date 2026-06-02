import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, ScrollView, Alert, ActivityIndicator, Vibration,
} from "react-native";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import type { Medicine } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";
import { useMedicines } from "@/hooks/useMedicines";
import { useMedicineStore } from "@/store/medicineStore";
import { scheduleDoseReminder } from "@/services/notifications";
import { Ionicons } from "@expo/vector-icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type Frequency = "once" | "twice" | "thrice";

type MedSchedule = { times: string[]; frequency: Frequency };

type DoseEntry = {
  medicineId:    string;
  medicineName:  string;
  dosage:        string;
  scheduledTime: string; // ISO
  timeLabel:     string; // "08:00 AM"
  status:        "taken" | "missed" | "pending";
  logId?:        string;
};

type TabKey = "today" | "schedule";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseSchedule(raw?: string | null): MedSchedule | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.times) && parsed.times.length > 0) return parsed as MedSchedule;
    return null;
  } catch {
    return null;
  }
}

function toISOForToday(hhmm: string): string {
  const today = getTodayStr();
  return new Date(`${today}T${hhmm}:00`).toISOString();
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getHHMM(isoTime: string): string {
  const d = new Date(isoTime);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const FREQ_OPTIONS: { key: Frequency; label: string; count: number }[] = [
  { key: "once",   label: "Once",        count: 1 },
  { key: "twice",  label: "Twice",       count: 2 },
  { key: "thrice", label: "Three times", count: 3 },
];

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ─── Today Tab ───────────────────────────────────────────────────────────────

function TodayTab({ userId }: { userId: string }) {
  const medicines = useMedicineStore((s) => s.medicines);
  const [doses,     setDoses]     = useState<DoseEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Expo Go in-app alarm: vibrate + Alert when a dose time arrives
  const alarmedRef = useRef<Set<string>>(new Set());
  const dosesRef   = useRef(doses);
  useEffect(() => { dosesRef.current = doses; }, [doses]);
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const dose of dosesRef.current) {
        if (dose.status !== "pending") continue;
        const diff = Math.abs(now - new Date(dose.scheduledTime).getTime());
        const key  = dose.medicineId + dose.scheduledTime;
        if (diff < 90_000 && !alarmedRef.current.has(key)) {
          alarmedRef.current.add(key);
          Vibration.vibrate([0, 400, 200, 400]);
          Alert.alert("💊 Dose Reminder", `Time to take ${dose.medicineName}`, [{ text: "OK" }]);
        }
      }
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const buildDoses = useCallback(async () => {
    setLoading(true);
    const todayStr = getTodayStr();
    const db = getDb();

    // Query today's existing dose logs
    const q    = query(
      collection(db, FIRESTORE.DOSE_LOGS),
      where("userId", "==", userId),
      where("date",   "==", todayStr),
    );
    const snap = await getDocs(q);
    const logs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    // Derive entries from medicine schedules
    const entries: DoseEntry[] = [];
    for (const med of medicines) {
      const sched = parseSchedule(med.schedule);
      if (!sched) continue;
      for (const hhmm of sched.times) {
        const scheduledTime = toISOForToday(hhmm);
        const existing = logs.find(
          (l) => l.medicineId === med.id && getHHMM(l.scheduledTime) === hhmm,
        );
        entries.push({
          medicineId:   med.id,
          medicineName: med.name,
          dosage:       med.dosage,
          scheduledTime,
          timeLabel:    formatTime(hhmm),
          status:       existing ? existing.status : "pending",
          logId:        existing?.id,
        });
      }
    }

    // Sort by scheduled time
    entries.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    setDoses(entries);
    setLoading(false);
  }, [medicines, userId]);

  useEffect(() => { buildDoses(); }, [buildDoses]);

  const markTaken = useCallback(async (entry: DoseEntry) => {
    const key = `${entry.medicineId}-${entry.scheduledTime}`;
    setMarkingId(key);
    const db      = getDb();
    const todayStr = getTodayStr();
    const now      = new Date().toISOString();
    try {
      await addDoc(collection(db, FIRESTORE.DOSE_LOGS), {
        userId:        userId,
        medicineId:    entry.medicineId,
        medicineName:  entry.medicineName,
        scheduledTime: entry.scheduledTime,
        date:          todayStr,
        status:        "taken",
        takenAt:       now,
        createdAt:     now,
      });
      await addDoc(collection(db, FIRESTORE.NOTIFICATIONS), {
        userId,
        title:     "Dose Taken ✓",
        body:      `${entry.medicineName} marked as taken`,
        type:      "dose",
        read:      false,
        createdAt: now,
      });
      await buildDoses();
    } catch {
      Alert.alert("Error", "Could not mark dose. Please try again.");
    } finally {
      setMarkingId(null);
    }
  }, [userId, buildDoses]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (doses.length === 0) {
    return (
      <View style={s.center}>
        <Ionicons name="alarm-outline" size={52} color={Colors.textSecondary} />
        <Text style={s.emptyTitle}>No doses today</Text>
        <Text style={s.emptySub}>
          Set up a schedule in the Schedule tab to track your daily doses here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={doses}
      keyExtractor={(item) => `${item.medicineId}-${item.scheduledTime}`}
      contentContainerStyle={s.list}
      renderItem={({ item }) => {
        const key       = `${item.medicineId}-${item.scheduledTime}`;
        const isMarking = markingId === key;
        const statusColor =
          item.status === "taken"  ? Colors.primary :
          item.status === "missed" ? Colors.alertRed : Colors.orange;
        const statusLabel =
          item.status === "taken"  ? "Taken" :
          item.status === "missed" ? "Missed" : "Pending";

        return (
          <View style={s.doseCard}>
            <View style={s.doseCardLeft}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            </View>
            <View style={s.doseCardBody}>
              <View style={s.doseRow}>
                <Text style={s.doseName} numberOfLines={1}>{item.medicineName}</Text>
                <View style={[s.statusBadge, { backgroundColor: statusColor + "22" }]}>
                  <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
              {item.dosage ? (
                <Text style={s.doseDosage}>{item.dosage}</Text>
              ) : null}
              <View style={s.timeRow}>
                <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                <Text style={s.doseTime}>{item.timeLabel}</Text>
              </View>
              {item.status === "pending" && (
                <TouchableOpacity
                  style={[s.takenBtn, isMarking && s.takenBtnDisabled]}
                  onPress={() => markTaken(item)}
                  disabled={isMarking}
                  activeOpacity={0.8}
                >
                  {isMarking ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={16} color={Colors.white} />
                      <Text style={s.takenBtnText}>Mark as Taken</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {item.status === "taken" && (
                <View style={s.takenConfirm}>
                  <Ionicons name="checkmark-circle" size={15} color={Colors.primary} />
                  <Text style={s.takenConfirmText}>Done for today</Text>
                </View>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

// ─── Schedule Row ─────────────────────────────────────────────────────────────

function ScheduleRow({
  medicine,
  onSaved,
}: {
  medicine: Medicine;
  onSaved: (id: string, scheduleJson: string) => void;
}) {
  const existing = parseSchedule(medicine.schedule);

  const [expanded,  setExpanded]  = useState(false);
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? "once");
  const [times,     setTimes]     = useState<string[]>(
    existing?.times ?? ["08:00"],
  );
  const [saving, setSaving] = useState(false);

  // Keep time slots in sync with frequency
  const handleFreqChange = (freq: Frequency) => {
    const count = FREQ_OPTIONS.find((f) => f.key === freq)!.count;
    setFrequency(freq);
    setTimes((prev) => {
      const next = [...prev];
      while (next.length < count) next.push("08:00");
      return next.slice(0, count);
    });
  };

  const handleSave = async () => {
    // Validate
    for (const t of times) {
      if (!TIME_REGEX.test(t)) {
        Alert.alert("Invalid time", `"${t}" is not valid. Use HH:MM (e.g. 08:00).`);
        return;
      }
    }
    setSaving(true);
    try {
      const scheduleJson = JSON.stringify({ times, frequency });
      const db = getDb();
      await updateDoc(doc(db, FIRESTORE.MEDICINES, medicine.id), { schedule: scheduleJson });

      // Schedule local notifications for each time
      for (const hhmm of times) {
        const fireAt = new Date(`${getTodayStr()}T${hhmm}:00`);
        if (fireAt > new Date()) {
          await scheduleDoseReminder(medicine.name, fireAt).catch(() => {});
        }
      }

      onSaved(medicine.id, scheduleJson);
      setExpanded(false);
      Alert.alert("Saved", `Schedule set for ${medicine.name}.`);
    } catch {
      Alert.alert("Error", "Could not save schedule. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.schedCard}>
      <TouchableOpacity
        style={s.schedHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={s.schedHeaderLeft}>
          <View style={[s.catDot, { backgroundColor: Colors.primary }]} />
          <View>
            <Text style={s.schedName} numberOfLines={1}>{medicine.name}</Text>
            {medicine.dosage ? <Text style={s.schedDosage}>{medicine.dosage}</Text> : null}
          </View>
        </View>
        <View style={s.schedHeaderRight}>
          {existing && (
            <View style={s.scheduledBadge}>
              <Text style={s.scheduledBadgeText}>Scheduled</Text>
            </View>
          )}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.schedBody}>
          {/* Frequency chips */}
          <Text style={s.schedLabel}>Frequency</Text>
          <View style={s.chipRow}>
            {FREQ_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[s.chip, frequency === opt.key && s.chipActive]}
                onPress={() => handleFreqChange(opt.key)}
              >
                <Text style={[s.chipText, frequency === opt.key && s.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time inputs */}
          <Text style={s.schedLabel}>Time{times.length > 1 ? "s" : ""}</Text>
          {times.map((t, idx) => (
            <View key={idx} style={s.timeInputRow}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={s.timeInput}
                value={t}
                onChangeText={(v) =>
                  setTimes((prev) => prev.map((x, i) => (i === idx ? v : x)))
                }
                placeholder="HH:MM"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
              <Text style={s.timeInputHint}>24-hour format</Text>
            </View>
          ))}

          {/* Save button */}
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color={Colors.white} />
                <Text style={s.saveBtnText}>Save Schedule</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

function ScheduleTab() {
  const medicines    = useMedicineStore((s) => s.medicines);
  const setMedicines = useMedicineStore((s) => s.setMedicines);

  const handleSaved = useCallback(
    (id: string, scheduleJson: string) => {
      setMedicines(
        medicines.map((m) => (m.id === id ? { ...m, schedule: scheduleJson } : m)),
      );
    },
    [medicines, setMedicines],
  );

  if (medicines.length === 0) {
    return (
      <View style={s.center}>
        <Ionicons name="medkit-outline" size={52} color={Colors.textSecondary} />
        <Text style={s.emptyTitle}>No medicines yet</Text>
        <Text style={s.emptySub}>Add medicines to your inventory first, then set dose schedules here.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.list}>
      <Text style={s.schedIntro}>
        Tap a medicine to set its daily dose times. Schedules appear in the Today tab.
      </Text>
      {medicines.map((med) => (
        <ScheduleRow key={med.id} medicine={med} onSaved={handleSaved} />
      ))}
    </ScrollView>
  );
}

// ─── Root Screen ──────────────────────────────────────────────────────────────

export function DoseTrackerScreen() {
  useMedicines();
  const user   = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<TabKey>("today");

  if (!user) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Dose Tracker</Text>
        <Text style={s.headerSub}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </Text>
      </View>

      {/* Tab switcher */}
      <View style={s.tabBar}>
        {(["today", "schedule"] as TabKey[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[s.tabPill, tab === key && s.tabPillActive]}
            onPress={() => setTab(key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={key === "today" ? "today-outline" : "calendar-outline"}
              size={15}
              color={tab === key ? Colors.white : Colors.textSecondary}
            />
            <Text style={[s.tabLabel, tab === key && s.tabLabelActive]}>
              {key === "today" ? "Today" : "Schedule"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {tab === "today"
          ? <TodayTab userId={user.id} />
          : <ScheduleTab />
        }
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

  header:      { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: Colors.white },
  headerSub:   { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  tabBar: {
    flexDirection:     "row",
    backgroundColor:   Colors.card,
    paddingHorizontal: 16,
    paddingVertical:   10,
    gap:               10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  tabPill: {
    flex:            1,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             6,
    paddingVertical: 9,
    borderRadius:    20,
    backgroundColor: "#F0F0F0",
  },
  tabPillActive: { backgroundColor: Colors.primary },
  tabLabel:      { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  tabLabelActive:{ color: Colors.white },

  list:       { padding: 16, gap: 12, paddingBottom: 32 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: Colors.textPrimary, marginTop: 16, marginBottom: 8, textAlign: "center" },
  emptySub:   { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },

  // Dose card
  doseCard: {
    flexDirection:   "row",
    backgroundColor: Colors.card,
    borderRadius:    14,
    padding:         14,
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  doseCardLeft: { width: 4, borderRadius: 2, marginRight: 12, alignItems: "center", paddingTop: 4 },
  statusDot:    { width: 10, height: 10, borderRadius: 5 },
  doseCardBody: { flex: 1, gap: 4 },
  doseRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  doseName:     { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, flex: 1, marginRight: 8 },
  doseDosage:   { fontSize: 12, color: Colors.textSecondary },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText:   { fontSize: 11, fontWeight: "700" },
  timeRow:      { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  doseTime:     { fontSize: 12, color: Colors.textSecondary },
  takenBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             6,
    backgroundColor: Colors.primary,
    borderRadius:    10,
    paddingVertical: 9,
    marginTop:       8,
  },
  takenBtnDisabled: { opacity: 0.6 },
  takenBtnText:     { fontSize: 13, fontWeight: "700", color: Colors.white },
  takenConfirm:     { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  takenConfirmText: { fontSize: 12, color: Colors.primary, fontWeight: "500" },

  // Schedule card
  schedCard: {
    backgroundColor: Colors.card,
    borderRadius:    14,
    overflow:        "hidden",
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  schedHeader:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  schedHeaderLeft:  { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  schedHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  catDot:           { width: 10, height: 10, borderRadius: 5 },
  schedName:        { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  schedDosage:      { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  scheduledBadge:   { backgroundColor: Colors.primary + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  scheduledBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.primary },
  schedBody:        { paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  schedLabel:       { fontSize: 12, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 },
  schedIntro:       { fontSize: 13, color: Colors.textSecondary, marginBottom: 4, lineHeight: 19 },
  chipRow:          { flexDirection: "row", gap: 8 },
  chip:             { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: "#F0F0F0", borderWidth: 1, borderColor: "#E0E0E0" },
  chipActive:       { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:         { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  chipTextActive:   { color: Colors.white },
  timeInputRow:     { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F8F8", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: "#E8E8E8" },
  timeInput:        { flex: 1, fontSize: 16, fontWeight: "600", color: Colors.textPrimary, paddingVertical: 8 },
  timeInputHint:    { fontSize: 10, color: Colors.textSecondary },
  saveBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             6,
    backgroundColor: Colors.primary,
    borderRadius:    10,
    paddingVertical: 12,
    marginTop:       4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { fontSize: 14, fontWeight: "700", color: Colors.white },
});
