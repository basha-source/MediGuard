import { useState, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";
import { useMedicines } from "@/hooks/useMedicines";
import { useMedicineStore } from "@/store/medicineStore";
import { CalendarPickerModal } from "@/components/common/CalendarPickerModal";

// ── Types ──────────────────────────────────────────────────────────────────────
type TravelPlan = {
  destination: string;
  departDate:  string;
  returnDate:  string;
  offset:      number;
  active:      boolean;
};

type PackingItem = {
  id:          string;
  name:        string;
  dosage:      string;
  category:    string;
  needed:      number;
  available:   number;
  hasEnough:   boolean;
  scheduled:   boolean;
};

// ── Constants ──────────────────────────────────────────────────────────────────
const OFFSETS = [-5.5, -5, -4, -3, 0, 3, 4, 5, 5.5];

const GENERAL_CHECKLIST = [
  { icon: "document-text-outline" as const, text: "Carry prescription / doctor's letter for each medicine" },
  { icon: "cube-outline"          as const, text: "Keep medicines in original packaging with labels" },
  { icon: "briefcase-outline"     as const, text: "Pack all medicines in carry-on luggage, not check-in" },
  { icon: "snow-outline"          as const, text: "Use a cooling pack for liquid or injection medicines" },
  { icon: "shield-checkmark-outline" as const, text: "Confirm travel insurance covers medical emergencies" },
  { icon: "add-circle-outline"    as const, text: "Pack 10–15% extra supply for delays" },
];

function formatOffset(val: number): string {
  const sign  = val < 0 ? "-" : val > 0 ? "+" : "";
  const abs   = Math.abs(val);
  const whole = Math.floor(abs);
  const frac  = abs - whole;
  return frac > 0 ? `${sign}${whole}.${Math.round(frac * 10)}h` : `${sign}${whole}h`;
}

function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  try {
    const d     = new Date(iso + "T00:00:00");
    const day   = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year  = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return iso;
  }
}

function tripDays(depart: string, ret: string): number {
  const ms = new Date(ret + "T00:00:00").getTime() - new Date(depart + "T00:00:00").getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ── Component ──────────────────────────────────────────────────────────────────
export function TravelModeScreen() {
  const nav  = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  useMedicines();
  const medicines = useMedicineStore((s) => s.medicines);

  const [destination, setDestination] = useState("");
  const [departDate,  setDepartDate]  = useState("");
  const [returnDate,  setReturnDate]  = useState("");
  const [offset,      setOffset]      = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [activePlan,  setActivePlan]  = useState<TravelPlan | null>(null);
  const [loading,     setLoading]     = useState(true);

  // Calendar modal state
  const [calendarTarget, setCalendarTarget] = useState<"depart" | "return" | null>(null);

  // ── Load active plan ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(getDb(), FIRESTORE.USERS, user.id));
        const plan = snap.data()?.travelMode as TravelPlan | undefined;
        if (plan?.active) setActivePlan(plan);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [user]);

  // ── Packing list — auto-computed ───────────────────────────────────────────
  const packingList = useMemo<PackingItem[]>(() => {
    if (!departDate || !returnDate || !destination.trim()) return [];
    if (new Date(returnDate) <= new Date(departDate)) return [];

    const days = tripDays(departDate, returnDate);

    return medicines.map((med) => {
      let dosesPerDay = 0;
      if (med.schedule) {
        try {
          const s = JSON.parse(med.schedule) as { times?: string[] };
          dosesPerDay = s.times?.length ?? 0;
        } catch {}
      }

      const needed    = dosesPerDay > 0 ? dosesPerDay * days : med.quantity;
      const hasEnough = med.quantity >= needed;

      return {
        id:        med.id,
        name:      med.name,
        dosage:    med.dosage,
        category:  med.category,
        needed,
        available: med.quantity,
        hasEnough,
        scheduled: dosesPerDay > 0,
      };
    });
  }, [medicines, departDate, returnDate, destination]);

  // ── Packing list for the saved active plan ─────────────────────────────────
  const activePlanPacking = useMemo<PackingItem[]>(() => {
    if (!activePlan) return [];
    const days = tripDays(activePlan.departDate, activePlan.returnDate);
    return medicines.map((med) => {
      let dosesPerDay = 0;
      if (med.schedule) {
        try {
          const s = JSON.parse(med.schedule) as { times?: string[] };
          dosesPerDay = s.times?.length ?? 0;
        } catch {}
      }
      const needed    = dosesPerDay > 0 ? dosesPerDay * days : med.quantity;
      const hasEnough = med.quantity >= needed;
      return {
        id: med.id, name: med.name, dosage: med.dosage, category: med.category,
        needed, available: med.quantity, hasEnough, scheduled: dosesPerDay > 0,
      };
    });
  }, [medicines, activePlan]);

  // ── Save plan ──────────────────────────────────────────────────────────────
  async function savePlan() {
    if (!user) return;
    if (!destination.trim()) {
      Alert.alert("Missing field", "Please enter your destination.");
      return;
    }
    if (!departDate) {
      Alert.alert("Missing date", "Please select your departure date.");
      return;
    }
    if (!returnDate) {
      Alert.alert("Missing date", "Please select your return date.");
      return;
    }
    if (new Date(returnDate) <= new Date(departDate)) {
      Alert.alert("Invalid dates", "Return date must be after departure date.");
      return;
    }

    setSaving(true);
    try {
      const plan: TravelPlan = {
        destination: destination.trim(),
        departDate,
        returnDate,
        offset,
        active: true,
      };
      await setDoc(doc(getDb(), FIRESTORE.USERS, user.id), { travelMode: plan }, { merge: true });
      setActivePlan(plan);
      setDestination("");
      setDepartDate("");
      setReturnDate("");
      setOffset(0);
      Alert.alert("Saved", "Your travel plan has been saved.");
    } catch {
      Alert.alert("Error", "Failed to save travel plan. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Cancel travel mode ─────────────────────────────────────────────────────
  async function cancelTravel() {
    if (!user) return;
    Alert.alert(
      "Cancel Travel Mode",
      "Are you sure you want to cancel the active travel plan?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await setDoc(doc(getDb(), FIRESTORE.USERS, user.id), { travelMode: { active: false } }, { merge: true });
              setActivePlan(null);
            } catch {
              Alert.alert("Error", "Failed to cancel travel mode.");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={s.root}>
        <Header nav={nav} />
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </View>
    );
  }

  const days = departDate && returnDate ? tripDays(departDate, returnDate) : 0;
  const showPacking = packingList.length > 0 && days > 0;

  return (
    <View style={s.root}>
      <Header nav={nav} />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.heroRow}>
          <Text style={s.heroEmoji}>✈️</Text>
          <Text style={s.heroTitle}>Plan Your Travel</Text>
        </View>

        {/* Form card */}
        <View style={s.card}>
          {/* Destination */}
          <Text style={s.label}>Destination</Text>
          <TextInput
            style={s.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g. London, UK"
            placeholderTextColor={Colors.textSecondary}
            returnKeyType="done"
          />

          {/* Departure Date */}
          <Text style={s.label}>Departure Date</Text>
          <TouchableOpacity
            style={[s.dateBtn, departDate ? s.dateBtnFilled : null]}
            onPress={() => setCalendarTarget("depart")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={departDate ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[s.dateBtnTxt, departDate ? s.dateBtnTxtFilled : null]}>
              {departDate ? formatDisplayDate(departDate) : "Select departure date"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Return Date */}
          <Text style={s.label}>Return Date</Text>
          <TouchableOpacity
            style={[s.dateBtn, returnDate ? s.dateBtnFilled : null]}
            onPress={() => setCalendarTarget("return")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={returnDate ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[s.dateBtnTxt, returnDate ? s.dateBtnTxtFilled : null]}>
              {returnDate ? formatDisplayDate(returnDate) : "Select return date"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Trip duration badge */}
          {days > 0 && (
            <View style={s.durationBadge}>
              <Ionicons name="time-outline" size={14} color={Colors.primary} />
              <Text style={s.durationTxt}>{days} day{days !== 1 ? "s" : ""} trip</Text>
            </View>
          )}

          {/* Timezone Offset */}
          <View style={s.offsetHeader}>
            <Ionicons name="globe-outline" size={16} color={Colors.textSecondary} />
            <Text style={s.label}> Timezone Offset</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipsRow}
          >
            {OFFSETS.map((val) => {
              const sel = val === offset;
              return (
                <TouchableOpacity
                  key={val}
                  style={[s.chip, sel && s.chipSelected]}
                  onPress={() => setOffset(val)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.chipText, sel && s.chipTextSelected]}>
                    {formatOffset(val)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Packing List ─────────────────────────────────────────────────── */}
        {showPacking && (
          <>
            <View style={s.sectionDivider}>
              <View style={s.sectionLine} />
              <Text style={s.sectionLabel}>Medicine Packing List</Text>
              <View style={s.sectionLine} />
            </View>

            <View style={s.packingCard}>
              <View style={s.packingHeader}>
                <Ionicons name="medkit-outline" size={18} color={Colors.primary} />
                <Text style={s.packingHeaderTxt}>
                  {days} day{days !== 1 ? "s" : ""} to {destination.trim() || "destination"}
                </Text>
              </View>

              {packingList.map((item) => (
                <View key={item.id} style={[s.packingRow, !item.hasEnough && s.packingRowWarn]}>
                  <View style={s.packingLeft}>
                    <Text style={s.packingName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.packingDosage}>{item.dosage}</Text>
                  </View>
                  <View style={s.packingRight}>
                    {item.scheduled ? (
                      <Text style={[s.packingCount, !item.hasEnough && s.packingCountWarn]}>
                        {item.needed} {item.category === "liquid" ? "doses" : "tablets"}
                      </Text>
                    ) : (
                      <Text style={s.packingCount}>Bring all</Text>
                    )}
                    {!item.hasEnough && (
                      <View style={s.warnRow}>
                        <Ionicons name="warning-outline" size={12} color={Colors.alertRed} />
                        <Text style={s.warnTxt}>
                          {" "}Only {item.available} available
                        </Text>
                      </View>
                    )}
                    {item.hasEnough && (
                      <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* General checklist */}
            <View style={s.tipsCard}>
              <View style={s.tipsHeader}>
                <Text style={s.tipsEmoji}>📋</Text>
                <Text style={s.tipsTitle}>Travel Checklist</Text>
              </View>
              {GENERAL_CHECKLIST.map((item, i) => (
                <View key={i} style={s.tipRow}>
                  <Ionicons name={item.icon} size={16} color={Colors.primary} style={s.tipIcon} />
                  <Text style={s.tipText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[s.btn, saving && s.btnDisabled]}
          onPress={savePlan}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={s.btnText}>SAVE TRAVEL PLAN</Text>}
        </TouchableOpacity>

        {/* ── Active Plan — full trip output ──────────────────────────── */}
        {activePlan && (
          <>
            <View style={s.sectionDivider}>
              <View style={s.sectionLine} />
              <Text style={s.sectionLabel}>Your Trip Plan</Text>
              <View style={s.sectionLine} />
            </View>

            {/* Trip header card */}
            <View style={s.activePlanCard}>
              <View style={s.activePlanRow}>
                <View style={s.planIconCircle}>
                  <Ionicons name="airplane" size={20} color={Colors.white} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.activePlanDestination}>{activePlan.destination}</Text>
                  <Text style={s.activePlanDates}>
                    {formatDisplayDate(activePlan.departDate)} – {formatDisplayDate(activePlan.returnDate)}
                  </Text>
                </View>
                <View style={s.durationBadge}>
                  <Text style={s.durationTxt}>
                    {tripDays(activePlan.departDate, activePlan.returnDate)}d
                  </Text>
                </View>
              </View>
              {activePlan.offset !== 0 && (
                <View style={s.offsetBadge}>
                  <Ionicons name="globe-outline" size={13} color={Colors.textSecondary} />
                  <Text style={s.offsetBadgeTxt}>Timezone offset: {formatOffset(activePlan.offset)}</Text>
                </View>
              )}
            </View>

            {/* Medicine packing list for saved plan */}
            {activePlanPacking.length > 0 && (
              <View style={s.packingCard}>
                <View style={s.packingHeader}>
                  <Ionicons name="medkit-outline" size={18} color={Colors.primary} />
                  <Text style={s.packingHeaderTxt}>
                    Medicine Packing List — {tripDays(activePlan.departDate, activePlan.returnDate)} day{tripDays(activePlan.departDate, activePlan.returnDate) !== 1 ? "s" : ""}
                  </Text>
                </View>
                {activePlanPacking.map((item) => (
                  <View key={item.id} style={[s.packingRow, !item.hasEnough && s.packingRowWarn]}>
                    <View style={s.packingLeft}>
                      <Text style={s.packingName} numberOfLines={1}>{item.name}</Text>
                      <Text style={s.packingDosage}>{item.dosage}</Text>
                    </View>
                    <View style={s.packingRight}>
                      {item.scheduled ? (
                        <Text style={[s.packingCount, !item.hasEnough && s.packingCountWarn]}>
                          {item.needed} {item.category === "liquid" ? "doses" : "tablets"}
                        </Text>
                      ) : (
                        <Text style={s.packingCount}>Bring all</Text>
                      )}
                      {!item.hasEnough ? (
                        <View style={s.warnRow}>
                          <Ionicons name="warning-outline" size={12} color={Colors.alertRed} />
                          <Text style={s.warnTxt}> Only {item.available} available</Text>
                        </View>
                      ) : (
                        <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Travel checklist */}
            <View style={s.tipsCard}>
              <View style={s.tipsHeader}>
                <Text style={s.tipsEmoji}>📋</Text>
                <Text style={s.tipsTitle}>Travel Checklist</Text>
              </View>
              {GENERAL_CHECKLIST.map((item, i) => (
                <View key={i} style={s.tipRow}>
                  <Ionicons name={item.icon} size={16} color={Colors.primary} style={s.tipIcon} />
                  <Text style={s.tipText}>{item.text}</Text>
                </View>
              ))}
            </View>

            {/* Cancel */}
            <TouchableOpacity style={s.cancelBtn} onPress={cancelTravel} activeOpacity={0.85}>
              <Ionicons name="close-circle-outline" size={18} color={Colors.alertRed} />
              <Text style={s.cancelBtnText}>CANCEL TRAVEL MODE</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Calendar modals */}
      <CalendarPickerModal
        visible={calendarTarget === "depart"}
        title="Select Departure Date"
        selectedDate={departDate}
        onConfirm={(date) => { setDepartDate(date); setCalendarTarget(null); if (returnDate && returnDate <= date) setReturnDate(""); }}
        onCancel={() => setCalendarTarget(null)}
      />
      <CalendarPickerModal
        visible={calendarTarget === "return"}
        title="Select Return Date"
        selectedDate={returnDate}
        minDate={departDate}
        onConfirm={(date) => { setReturnDate(date); setCalendarTarget(null); }}
        onCancel={() => setCalendarTarget(null)}
      />
    </View>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function Header({ nav }: { nav: any }) {
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
        <Ionicons name="arrow-back" size={22} color={Colors.white} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>Travel Mode</Text>
      <View style={{ width: 38 }} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header:      { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 52, paddingBottom: 16 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.white },

  scroll: { paddingHorizontal: 16, paddingTop: 20 },

  heroRow:   { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  heroEmoji: { fontSize: 28, marginRight: 10 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary },

  card:  { backgroundColor: Colors.card, borderRadius: 16, padding: 18, marginBottom: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  label: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary, marginBottom: 6, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1, borderColor: "#E0E0E0", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },

  dateBtn:       { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1, borderColor: "#E0E0E0", paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  dateBtnFilled: { borderColor: Colors.primaryLight, backgroundColor: Colors.primaryPale },
  dateBtnTxt:    { flex: 1, fontSize: 15, color: Colors.textSecondary },
  dateBtnTxtFilled: { color: Colors.textPrimary, fontWeight: "500" },

  durationBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: Colors.primaryPale, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10, gap: 4 },
  durationTxt:   { fontSize: 12, fontWeight: "700", color: Colors.primary },

  offsetHeader: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  chipsRow:     { paddingVertical: 4, paddingRight: 8 },
  chip:         { borderWidth: 1, borderColor: "#C8C8C8", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: Colors.card },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:     { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  chipTextSelected: { color: Colors.white },

  sectionDivider: { flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 14 },
  sectionLine:    { flex: 1, height: 1, backgroundColor: "#E5E5E5" },
  sectionLabel:   { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, marginHorizontal: 10, textTransform: "uppercase", letterSpacing: 0.5 },

  packingCard:      { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  packingHeader:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.primaryPale },
  packingHeaderTxt: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },

  packingRow:     { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0F0F0" },
  packingRowWarn: { backgroundColor: "#FFF5F5", marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 0 },
  packingLeft:    { flex: 1 },
  packingRight:   { alignItems: "flex-end", gap: 2 },
  packingName:    { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  packingDosage:  { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  packingCount:   { fontSize: 13, fontWeight: "700", color: Colors.primary },
  packingCountWarn: { color: Colors.alertRed },
  warnRow:        { flexDirection: "row", alignItems: "center" },
  warnTxt:        { fontSize: 11, color: Colors.alertRed, fontWeight: "500" },

  tipsCard:   { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tipsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  tipsEmoji:  { fontSize: 18, marginRight: 8 },
  tipsTitle:  { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  tipRow:     { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  tipIcon:    { marginRight: 10, marginTop: 1 },
  tipText:    { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  btn:        { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 20, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: Colors.white, fontSize: 15, fontWeight: "700", letterSpacing: 0.8 },

  activePlanCard:        { backgroundColor: Colors.primaryPale, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.primaryLight, marginBottom: 14 },
  activePlanRow:         { flexDirection: "row", alignItems: "center" },
  planIconCircle:        { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  activePlanDestination: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  activePlanDates:       { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  activePlanOffset:      { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  offsetBadge:           { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  offsetBadgeTxt:        { fontSize: 12, color: Colors.textSecondary },

  cancelBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.alertRed, borderRadius: 12, paddingVertical: 12, marginTop: 4 },
  cancelBtnText: { color: Colors.alertRed, fontSize: 13, fontWeight: "700", marginLeft: 6, letterSpacing: 0.6 },
});
