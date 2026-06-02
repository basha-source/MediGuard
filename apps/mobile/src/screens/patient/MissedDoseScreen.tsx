import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert,
} from "react-native";
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc,
} from "firebase/firestore";
import { getDb }                   from "@mediguard/firebase";
import { Colors, FIRESTORE }       from "@mediguard/shared";
import { useAuthStore }            from "@/store/authStore";
import { useMedicineStore }        from "@/store/medicineStore";
import { useNavigation }           from "@react-navigation/native";
import { Ionicons }                from "@expo/vector-icons";
import { scheduleSnoozeReminder, addInAppNotification }  from "@/services/notifications";

type ParsedSchedule = { times: string[]; frequency: string };

type DoseItem = {
  firestoreId?: string;
  medicineId:   string;
  medicineName: string;
  scheduledTime: string; // ISO
  timeLabel:    string;  // "08:00 AM"
  date:         string;  // "YYYY-MM-DD"
  status:       "pending" | "missed";
};

function formatTime(iso: string): string {
  const d    = new Date(iso);
  const h    = d.getHours();
  const m    = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

function toTodayISO(timeStr: string): string {
  const [h, min] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toISOString();
}

export function MissedDoseScreen() {
  const navigation = useNavigation<any>();
  const user       = useAuthStore((s) => s.user);
  const medicines  = useMedicineStore((s) => s.medicines);
  const [items,   setItems]   = useState<DoseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const todayStr = new Date().toLocaleDateString("en-CA");
    const now      = new Date();

    try {
      const [takenSnap, missedSnap] = await Promise.all([
        getDocs(query(
          collection(getDb(), FIRESTORE.DOSE_LOGS),
          where("userId", "==", user.id),
          where("date",   "==", todayStr),
          where("status", "==", "taken"),
        )),
        getDocs(query(
          collection(getDb(), FIRESTORE.DOSE_LOGS),
          where("userId", "==", user.id),
          where("date",   "==", todayStr),
          where("status", "==", "missed"),
        )),
      ]);

      // Build set of already-handled dose slots
      const handledKeys = new Set<string>();
      const makeKey = (medicineId: string, iso: string) => {
        const d = new Date(iso);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${medicineId}_${hh}:${mm}`;
      };
      takenSnap.forEach((d) => {
        const data = d.data();
        handledKeys.add(makeKey(data.medicineId, data.scheduledTime));
      });

      // Collect explicit missed records from Firestore
      const missedItems: DoseItem[] = [];
      missedSnap.forEach((d) => {
        const data = d.data();
        handledKeys.add(makeKey(data.medicineId, data.scheduledTime));
        missedItems.push({
          firestoreId:   d.id,
          medicineId:    data.medicineId,
          medicineName:  data.medicineName,
          scheduledTime: data.scheduledTime,
          timeLabel:     formatTime(data.scheduledTime),
          date:          data.date,
          status:        "missed",
        });
      });

      // Derive overdue pending doses from medicine schedules
      const derivedItems: DoseItem[] = [];
      for (const med of medicines) {
        if (!med.schedule) continue;
        let sched: ParsedSchedule;
        try { sched = JSON.parse(med.schedule); } catch { continue; }
        for (const timeStr of (sched.times ?? [])) {
          const iso       = toTodayISO(timeStr);
          const scheduled = new Date(iso);
          if (scheduled >= now) continue;                         // not yet due
          if (handledKeys.has(`${med.id}_${timeStr}`)) continue; // already handled
          derivedItems.push({
            medicineId:    med.id,
            medicineName:  med.name,
            scheduledTime: iso,
            timeLabel:     formatTime(iso),
            date:          todayStr,
            status:        "pending",
          });
        }
      }

      const all = [...derivedItems, ...missedItems].sort(
        (a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime(),
      );
      setItems(all);
    } catch (err) {
      console.error("[MissedDose] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, medicines]);

  useEffect(() => { load(); }, [load]);

  const handleTakeNow = useCallback(async (item: DoseItem) => {
    if (!user) return;
    const now     = new Date().toISOString();
    const baseDoc = {
      userId:        user.id,
      medicineId:    item.medicineId,
      medicineName:  item.medicineName,
      scheduledTime: item.scheduledTime,
      date:          item.date,
      status:        "taken" as const,
      takenAt:       now,
      createdAt:     now,
    };
    try {
      if (item.firestoreId) {
        await updateDoc(
          doc(getDb(), FIRESTORE.DOSE_LOGS, item.firestoreId),
          { status: "taken", takenAt: now },
        );
      } else {
        await addDoc(collection(getDb(), FIRESTORE.DOSE_LOGS), baseDoc);
      }
      await addDoc(collection(getDb(), FIRESTORE.NOTIFICATIONS), {
        userId:    user.id,
        title:     "Dose Taken ✓",
        body:      `${item.medicineName} marked as taken`,
        type:      "dose",
        read:      false,
        createdAt: now,
      });
      setItems((prev) => prev.filter((i) => i !== item));
    } catch {
      Alert.alert("Error", "Could not update dose. Try again.");
    }
  }, [user]);

  const handleSkip = useCallback(async (item: DoseItem) => {
    if (!user) return;
    const now = new Date().toISOString();
    try {
      if (item.firestoreId) {
        await updateDoc(
          doc(getDb(), FIRESTORE.DOSE_LOGS, item.firestoreId),
          { status: "missed", reason: "skipped" },
        );
      } else {
        await addDoc(collection(getDb(), FIRESTORE.DOSE_LOGS), {
          userId:        user.id,
          medicineId:    item.medicineId,
          medicineName:  item.medicineName,
          scheduledTime: item.scheduledTime,
          date:          item.date,
          status:        "missed",
          reason:        "skipped",
          createdAt:     now,
        });
      }
      await addInAppNotification(
        user.id,
        "Dose Skipped",
        `${item.medicineName} dose at ${item.timeLabel} was skipped`,
        "dose",
      ).catch(() => {});
      setItems((prev) => prev.filter((i) => i !== item));
    } catch {
      Alert.alert("Error", "Could not skip dose. Try again.");
    }
  }, [user]);

  const handleSnooze = useCallback(async (item: DoseItem) => {
    await scheduleSnoozeReminder(item.medicineName, 30 * 60);
    Alert.alert("Reminder set", "You'll be reminded in 30 minutes.");
  }, []);

  if (loading) {
    return (
      <View style={s.loadRoot}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Missed Doses</Text>
        <View style={{ width: 38 }} />
      </View>

      {items.length === 0 ? (
        <View style={s.emptyRoot}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="checkmark-circle" size={72} color={Colors.primary} />
          </View>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptySub}>No missed doses today.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.medicineId}_${item.scheduledTime}`}
          contentContainerStyle={s.list}
          ListHeaderComponent={
            <Text style={s.listHeader}>
              {items.length} dose{items.length !== 1 ? "s" : ""} need{items.length === 1 ? "s" : ""} attention
            </Text>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.cardLeft}>
                  <Text style={s.medName}>{item.medicineName}</Text>
                  <Text style={s.timeText}>Scheduled: {item.timeLabel}</Text>
                </View>
                <View style={[
                  s.badge,
                  item.status === "missed" ? s.badgeMissed : s.badgeOverdue,
                ]}>
                  <Text style={[
                    s.badgeText,
                    item.status === "missed" ? s.badgeMissedText : s.badgeOverdueText,
                  ]}>
                    {item.status === "missed" ? "Missed" : "Overdue"}
                  </Text>
                </View>
              </View>

              <View style={s.actions}>
                <TouchableOpacity style={s.btnTake} onPress={() => handleTakeNow(item)}>
                  <Ionicons name="checkmark" size={15} color={Colors.white} />
                  <Text style={s.btnTakeText}>Take Now</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSnooze} onPress={() => handleSnooze(item)}>
                  <Ionicons name="alarm-outline" size={15} color="#F59E0B" />
                  <Text style={s.btnSnoozeText}>+30 min</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSkip} onPress={() => handleSkip(item)}>
                  <Text style={s.btnSkipText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  loadRoot:      { flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center" },
  header:        { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  backBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle:   { fontSize: 18, fontWeight: "700", color: Colors.white },
  emptyRoot:     { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIconWrap: { marginBottom: 16 },
  emptyTitle:    { fontSize: 22, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  emptySub:      { fontSize: 15, color: Colors.textSecondary },
  list:          { padding: 16, gap: 12 },
  listHeader:    { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  card:          { backgroundColor: Colors.card, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardTop:       { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  cardLeft:      { flex: 1 },
  medName:       { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  timeText:      { fontSize: 13, color: Colors.textSecondary },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeOverdue:  { backgroundColor: "#FFF3E0" },
  badgeMissed:   { backgroundColor: "#FFEBEE" },
  badgeText:     { fontSize: 11, fontWeight: "700" },
  badgeOverdueText: { color: Colors.orange },
  badgeMissedText:  { color: Colors.alertRed },
  actions:       { flexDirection: "row", gap: 8 },
  btnTake:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, gap: 5 },
  btnTakeText:   { fontSize: 13, fontWeight: "700", color: Colors.white },
  btnSnooze:     { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#F59E0B", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
  btnSnoozeText: { fontSize: 13, fontWeight: "600", color: "#F59E0B" },
  btnSkip:       { alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#BDBDBD", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  btnSkipText:   { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
});
