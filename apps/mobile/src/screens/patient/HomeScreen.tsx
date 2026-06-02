import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getDb }             from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useDrawer }         from "@/navigation/drawerContext";
import { useMedicines }      from "@/hooks/useMedicines";
import { useMedicineStore }  from "@/store/medicineStore";
import { useAuthStore }      from "@/store/authStore";
import { getExpiryStatus, isLowStock } from "@/utils/medicineUtils";
import { PatientStackParams }           from "@/navigation/PatientDrawer";
import { BannerCarousel, BannerSlide }  from "@/components/common/BannerCarousel";

type Nav = StackNavigationProp<PatientStackParams>;

const PATIENT_SLIDES: BannerSlide[] = [
  {
    id:       "scan",
    image:    "https://images.unsplash.com/photo-1584308666636-c8bfde09a6c0?w=700&q=80",
    color:    "#388E3C",
    icon:     "scan-outline",
    title:    "Scan Medicine Barcodes",
    subtitle: "Add medicines instantly using your camera",
  },
  {
    id:       "dose",
    image:    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=700&q=80",
    color:    "#0D47A1",
    icon:     "alarm-outline",
    title:    "Never Miss a Dose",
    subtitle: "Smart reminders keep you on track every day",
  },
  {
    id:       "interact",
    image:    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=700&q=80",
    color:    "#6A1B9A",
    icon:     "swap-horizontal-outline",
    title:    "Check Drug Interactions",
    subtitle: "Stay safe — know what not to mix together",
  },
  {
    id:       "expiry",
    image:    "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=700&q=80",
    color:    "#E65100",
    icon:     "calendar-outline",
    title:    "Track Expiry Dates",
    subtitle: "Get alerts before your medicines expire",
  },
];

export function HomeScreen() {
  const { openDrawer } = useDrawer();
  const navigation = useNavigation<Nav>();
  useMedicines();
  const medicines = useMedicineStore((s) => s.medicines);
  const user      = useAuthStore((s) => s.user);

  const total        = medicines.length;
  const expiringSoon = medicines.filter((m) => {
    const { days } = getExpiryStatus(m.expiryDate);
    return days >= 0 && days <= 30;
  }).length;
  const lowStock = medicines.filter((m) => isLowStock(m.quantity)).length;
  const critical = medicines.filter((m) => {
    const { days } = getExpiryStatus(m.expiryDate);
    return days >= 0 && days <= 3;
  });

  const firstName = user?.name?.split(" ")[0] ?? "there";

  // ── Today's Doses ─────────────────────────────────────────────────────────
  const [takenCount, setTakenCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const todayStr = new Date().toLocaleDateString("en-CA");

  const totalDoses = medicines.reduce((acc, m) => {
    if (!m.schedule) return acc;
    try {
      const sched = JSON.parse(m.schedule) as { times?: string[] };
      return acc + (sched.times?.length ?? 0);
    } catch { return acc; }
  }, 0);

  useEffect(() => {
    if (!user) return;
    getDocs(query(
      collection(getDb(), FIRESTORE.DOSE_LOGS),
      where("userId", "==", user.id),
      where("date",   "==", todayStr),
      where("status", "==", "taken"),
    )).then((snap) => setTakenCount(snap.size)).catch(() => {});
  }, [user, todayStr, medicines]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(
      collection(getDb(), FIRESTORE.NOTIFICATIONS),
      where("userId", "==", user.id),
      where("read",   "==", false),
    )).then((snap) => setUnreadCount(snap.size)).catch(() => {});
  }, [user]);

  const QUICK_ACTIONS: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
  }[] = [
    {
      icon: "scan-outline",
      label: "Scan",
      onPress: () => (navigation as any).navigate("Scan"),
    },
    {
      icon: "swap-horizontal-outline",
      label: "Interact",
      onPress: () => navigation.navigate("DrugInteractions"),
    },
    {
      icon: "trash-outline",
      label: "Dispose",
      onPress: () => navigation.navigate("DisposalGuide"),
    },
    {
      icon: "clipboard-outline",
      label: "Log",
      onPress: () => (navigation as any).navigate("Tracker"),
    },
  ];

  return (
    <ScrollView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.menuBtn}
            onPress={openDrawer}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu" size={26} color={Colors.white} />
          </TouchableOpacity>
          <View>
            <Text style={s.greeting}>Good day, {firstName} 👋</Text>
            <Text style={s.appName}>MediGuard</Text>
          </View>
          <TouchableOpacity
            style={s.bellBtn}
            onPress={() => navigation.navigate("NotificationPrefs")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.white} />
            {unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Sliding Banner */}
      <BannerCarousel slides={PATIENT_SLIDES} />

      {/* Critical alert banner */}
      {critical.length > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="warning" size={18} color={Colors.alertRed} />
          <Text style={s.alertText}>
            {critical.length} medicine{critical.length > 1 ? "s" : ""} expiring within 3 days!
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={s.statsRow}>
        {(
          [
            [total.toString(),        "Total\nMeds",    Colors.primary],
            [expiringSoon.toString(),  "Expiring\nSoon", Colors.alertRed],
            [lowStock.toString(),      "Low\nStock",     Colors.orange],
          ] as [string, string, string][]
        ).map(([val, label, color]) => (
          <View key={label} style={s.statCard}>
            <Text style={[s.statVal, { color }]}>{val}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Today's Doses */}
      <Text style={s.sectionTitle}>Today's Doses</Text>
      <TouchableOpacity
        style={s.dosesCard}
        onPress={() => (navigation as any).navigate("Tracker")}
        activeOpacity={0.85}
      >
        {totalDoses === 0 ? (
          <View style={s.dosesNoSched}>
            <Ionicons name="alarm-outline" size={20} color={Colors.textSecondary} />
            <Text style={s.dosesNoSchedText}>No doses scheduled — set up in Tracker</Text>
          </View>
        ) : (
          <>
            <View style={s.dosesRow}>
              <Ionicons name="medkit-outline" size={20} color={Colors.primary} />
              <Text style={s.dosesText}>
                {takenCount} of {totalDoses} dose{totalDoses !== 1 ? "s" : ""} taken today
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </View>
            <View style={s.progressBg}>
              <View
                style={[
                  s.progressFill,
                  { width: `${totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 0}%` },
                ]}
              />
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.quickRow}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity key={a.label} style={s.quickBtn} onPress={a.onPress}>
            <View style={s.quickIcon}>
              <Ionicons name={a.icon} size={22} color={Colors.primary} />
            </View>
            <Text style={s.quickLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg },
  header:         { backgroundColor: Colors.primary, padding: 20, paddingTop: 48 },
  headerRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting:       { fontSize: 13, color: Colors.primaryPale },
  appName:        { fontSize: 22, color: Colors.white, fontWeight: "bold" },
  menuBtn:        { padding: 4 },
  bellBtn:   { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  badge:     { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.alertRed, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1.5, borderColor: Colors.primary },
  badgeTxt:  { fontSize: 10, fontWeight: "700", color: Colors.white },
  alertBanner:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.redPale, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5393533" },
  alertText:      { fontSize: 13, fontWeight: "600", color: Colors.alertRed, flex: 1 },
  statsRow:       { flexDirection: "row", padding: 16, gap: 12 },
  statCard:       { flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statVal:        { fontSize: 26, fontWeight: "bold" },
  statLabel:      { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  sectionTitle:   { fontSize: 15, fontWeight: "600", color: Colors.textPrimary, marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  quickRow:       { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  quickBtn:       { flex: 1, backgroundColor: Colors.card, borderRadius: 16, alignItems: "center", padding: 14, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  quickIcon:      { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryPale, alignItems: "center", justifyContent: "center" },
  quickLabel:       { fontSize: 11, fontWeight: "600", color: Colors.textPrimary },
  dosesCard:        { backgroundColor: Colors.card, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  dosesRow:         { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  dosesText:        { flex: 1, fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  progressBg:       { height: 6, backgroundColor: "#E8F5E9", borderRadius: 3, overflow: "hidden" },
  progressFill:     { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  dosesNoSched:     { flexDirection: "row", alignItems: "center", gap: 10 },
  dosesNoSchedText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
});
