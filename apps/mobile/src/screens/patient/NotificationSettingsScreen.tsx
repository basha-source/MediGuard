import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ActivityIndicator, Modal, ScrollView,
} from "react-native";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  scheduleDailyWellnessReminder,
  cancelDailyWellnessReminder,
} from "@/services/notifications";

type WellnessReminderPref = {
  enabled: boolean;
  hour:    number;
  minute:  number;
};

type NotifPrefs = {
  doseReminders:       boolean;
  expiryAlerts:        boolean;
  lowStockAlerts:      boolean;
  cgAlerts:            boolean;
  missedDoseReminders: boolean;
  wellnessReminder?:   WellnessReminderPref;
};

const DEFAULT_PREFS: NotifPrefs = {
  doseReminders:       true,
  expiryAlerts:        true,
  lowStockAlerts:      true,
  cgAlerts:            true,
  missedDoseReminders: true,
};

const MINUTE_CHOICES = [0, 15, 30, 45];
const HOUR_CHOICES   = Array.from({ length: 24 }, (_, i) => i);

export function NotificationSettingsScreen() {
  const nav  = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [prefs,          setPrefs]          = useState<NotifPrefs>(DEFAULT_PREFS);
  const [wellnessOn,     setWellnessOn]     = useState(false);
  const [wellnessHour,   setWellnessHour]   = useState(21);
  const [wellnessMinute, setWellnessMinute] = useState(0);
  const [pickerOpen,     setPickerOpen]     = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(getDb(), FIRESTORE.USERS, user.id));
        const saved = snap.data()?.notificationPrefs as NotifPrefs | undefined;
        if (saved) {
          setPrefs(saved);
          const wr = saved.wellnessReminder;
          if (wr) {
            setWellnessOn(!!wr.enabled);
            if (typeof wr.hour   === "number") setWellnessHour(wr.hour);
            if (typeof wr.minute === "number") setWellnessMinute(wr.minute);
          }
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, [user]);

  async function togglePref(key: keyof Omit<NotifPrefs, "wellnessReminder">, value: boolean) {
    if (!user) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);
    try {
      await setDoc(doc(getDb(), FIRESTORE.USERS, user.id), { notificationPrefs: updated }, { merge: true });
    } catch {
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }

  async function persistWellness(next: WellnessReminderPref) {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(getDb(), FIRESTORE.USERS, user.id),
        { notificationPrefs: { ...prefs, wellnessReminder: next } },
        { merge: true },
      );
      setPrefs((p) => ({ ...p, wellnessReminder: next }));
    } catch {}
    finally { setSaving(false); }
  }

  async function toggleWellness(value: boolean) {
    setWellnessOn(value);
    try {
      if (value) await scheduleDailyWellnessReminder(wellnessHour, wellnessMinute);
      else        await cancelDailyWellnessReminder();
    } catch {}
    await persistWellness({ enabled: value, hour: wellnessHour, minute: wellnessMinute });
  }

  async function applyTime(h: number, m: number) {
    setWellnessHour(h);
    setWellnessMinute(m);
    setPickerOpen(false);
    if (wellnessOn) {
      try { await scheduleDailyWellnessReminder(h, m); } catch {}
      await persistWellness({ enabled: true, hour: h, minute: m });
    }
  }

  const timeLabel = `${wellnessHour.toString().padStart(2, "0")}:${wellnessMinute.toString().padStart(2, "0")}`;

  if (loading) {
    return (
      <View style={s.root}>
        <AppHeader nav={nav} saving={false} />
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <AppHeader nav={nav} saving={saving} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Daily Wellness Reminder */}
        <Text style={s.sectionLabel}>DAILY WELLNESS REMINDER</Text>
        <View style={s.card}>
          <PrefRow
            label="Daily Reminder"
            value={wellnessOn}
            onToggle={toggleWellness}
            hasBorder={wellnessOn}
          />
          {wellnessOn && (
            <TouchableOpacity style={s.prefRow} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
              <Text style={s.prefLabel}>Reminder Time</Text>
              <View style={s.timeWrap}>
                <Text style={s.timeVal}>{timeLabel}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Preferences */}
        <Text style={s.sectionLabel}>NOTIFICATION PREFERENCES</Text>
        <View style={s.card}>
          <PrefRow label="Dose Reminders"       value={prefs.doseReminders}       onToggle={(v) => togglePref("doseReminders", v)}       hasBorder />
          <PrefRow label="Expiry Alerts"         value={prefs.expiryAlerts}         onToggle={(v) => togglePref("expiryAlerts", v)}         hasBorder />
          <PrefRow label="Low Stock Alerts"      value={prefs.lowStockAlerts}       onToggle={(v) => togglePref("lowStockAlerts", v)}       hasBorder />
          <PrefRow label="Care Guardian Alerts"  value={prefs.cgAlerts}             onToggle={(v) => togglePref("cgAlerts", v)}             hasBorder />
          <PrefRow label="Missed Dose Alerts"    value={prefs.missedDoseReminders}  onToggle={(v) => togglePref("missedDoseReminders", v)}  hasBorder={false} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <TimePickerModal
        visible={pickerOpen}
        initialHour={wellnessHour}
        initialMinute={wellnessMinute}
        onCancel={() => setPickerOpen(false)}
        onConfirm={applyTime}
      />
    </View>
  );
}

function AppHeader({ nav, saving }: { nav: any; saving: boolean }) {
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
        <Ionicons name="arrow-back" size={22} color={Colors.white} />
      </TouchableOpacity>
      <View style={s.headerCenter}>
        <Text style={s.headerTitle}>Notification Settings</Text>
      </View>
      <View style={{ width: 38, alignItems: "center", justifyContent: "center" }}>
        {saving && <ActivityIndicator size="small" color={Colors.white} />}
      </View>
    </View>
  );
}

function PrefRow({
  label, value, onToggle, hasBorder,
}: {
  label: string; value: boolean; onToggle: (v: boolean) => void; hasBorder: boolean;
}) {
  return (
    <View style={[s.prefRow, hasBorder && s.prefBorder]}>
      <Text style={s.prefLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#D0D0D0", true: Colors.primaryLight }}
        thumbColor={Colors.white}
        ios_backgroundColor="#D0D0D0"
      />
    </View>
  );
}

function TimePickerModal({
  visible, initialHour, initialMinute, onCancel, onConfirm,
}: {
  visible: boolean; initialHour: number; initialMinute: number;
  onCancel: () => void; onConfirm: (h: number, m: number) => void;
}) {
  const [hour,   setHour]   = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);

  useEffect(() => {
    if (visible) { setHour(initialHour); setMinute(initialMinute); }
  }, [visible, initialHour, initialMinute]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>Set Reminder Time</Text>
          <Text style={s.modalPreview}>
            {hour.toString().padStart(2, "0")}:{minute.toString().padStart(2, "0")}
          </Text>

          <Text style={s.modalSectionLabel}>HOUR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {HOUR_CHOICES.map((h) => (
              <TouchableOpacity key={h} style={[s.chip, h === hour && s.chipSel]} onPress={() => setHour(h)} activeOpacity={0.7}>
                <Text style={[s.chipTxt, h === hour && s.chipTxtSel]}>{h.toString().padStart(2, "0")}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.modalSectionLabel}>MINUTE</Text>
          <View style={s.chips}>
            {MINUTE_CHOICES.map((m) => (
              <TouchableOpacity key={m} style={[s.chip, m === minute && s.chipSel]} onPress={() => setMinute(m)} activeOpacity={0.7}>
                <Text style={[s.chipTxt, m === minute && s.chipTxtSel]}>{m.toString().padStart(2, "0")}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.modalActions}>
            <TouchableOpacity style={s.btnGhost} onPress={onCancel} activeOpacity={0.7}>
              <Text style={s.btnGhostTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnPrimary} onPress={() => onConfirm(hour, minute)} activeOpacity={0.85}>
              <Text style={s.btnPrimaryTxt}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.bg },
  scroll:      { padding: 16 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center" },

  header:      { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 52, paddingBottom: 16 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerCenter:{ flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.white },

  sectionLabel:{ fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  card:        { backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 16, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  prefRow:     { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  prefBorder:  { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EBEBEB" },
  prefLabel:   { flex: 1, fontSize: 14, fontWeight: "500", color: Colors.textPrimary },
  timeWrap:    { flexDirection: "row", alignItems: "center" },
  timeVal:     { fontSize: 15, fontWeight: "600", color: Colors.primary, marginRight: 4 },

  backdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard:   { width: "100%", maxWidth: 380, backgroundColor: Colors.card, borderRadius: 16, padding: 20 },
  modalTitle:  { fontSize: 17, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  modalPreview:{ fontSize: 36, fontWeight: "700", color: Colors.primary, textAlign: "center", marginTop: 8, marginBottom: 12, letterSpacing: 1 },
  modalSectionLabel: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 8, marginBottom: 8 },
  chips:       { flexDirection: "row", paddingVertical: 4 },
  chip:        { minWidth: 46, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#F1F1F1", marginRight: 8, alignItems: "center", justifyContent: "center" },
  chipSel:     { backgroundColor: Colors.primary },
  chipTxt:     { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  chipTxtSel:  { color: Colors.white },
  modalActions:{ flexDirection: "row", marginTop: 18, justifyContent: "flex-end" },
  btnGhost:    { paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 },
  btnGhostTxt: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  btnPrimary:  { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.primary },
  btnPrimaryTxt:{ fontSize: 14, fontWeight: "700", color: Colors.white },
});
