import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@mediguard/shared";
import { useDrawer } from "@/navigation/drawerContext";
import { useAuthStore } from "@/store/authStore";
import { BannerCarousel, BannerSlide } from "@/components/common/BannerCarousel";

const TEAL = "#00695C";

const CG_SLIDES: BannerSlide[] = [
  {
    id:       "monitor",
    image:    "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=700&q=80",
    color:    "#004D40",
    icon:     "people-outline",
    title:    "Monitor Loved Ones",
    subtitle: "Track medicine adherence in real time",
  },
  {
    id:       "alerts",
    image:    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=700&q=80",
    color:    "#B71C1C",
    icon:     "notifications-outline",
    title:    "Instant Alerts",
    subtitle: "Get notified immediately when doses are missed",
  },
  {
    id:       "reports",
    image:    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=700&q=80",
    color:    "#1A237E",
    icon:     "bar-chart-outline",
    title:    "Adherence Reports",
    subtitle: "View weekly health summaries and trends",
  },
];

const TIPS = [
  {
    icon:  "heart-outline" as const,
    color: "#E53935",
    title: "Encourage Consistency",
    body:  "Remind your patient to take medicines at the same time each day.",
  },
  {
    icon:  "water-outline" as const,
    color: "#1E88E5",
    title: "Hydration Matters",
    body:  "Most medicines work better when taken with a full glass of water.",
  },
];

export function CGDashboardScreen() {
  const { openDrawer } = useDrawer();
  const navigation     = useNavigation<any>();
  const user           = useAuthStore((s) => s.user);

  const initials  = (user?.name ?? "CG").slice(0, 2).toUpperCase();

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.menuBtn} onPress={openDrawer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="menu" size={26} color={Colors.white} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.greeting}>Welcome back 👋</Text>
          <Text style={s.title}>CareGuardian</Text>
        </View>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
      </View>

      {/* Sliding Banner */}
      <BannerCarousel slides={CG_SLIDES} />

      {/* Monitored Patients */}
      <Text style={s.sectionTitle}>Monitored Patients</Text>
      <View style={s.placeholderCard}>
        <Ionicons name="people-outline" size={40} color={Colors.textSecondary} />
        <Text style={s.placeholderTitle}>No patients linked yet</Text>
        <Text style={s.placeholderSub}>Link a patient using their MediGuard code</Text>
      </View>

      {/* Action Cards */}
      <Text style={s.sectionTitle}>Quick Access</Text>
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.actionCard, { borderLeftColor: TEAL }]}
          onPress={() => navigation.navigate("PatientMonitor")}
        >
          <View style={[s.actionIcon, { backgroundColor: TEAL + "18" }]}>
            <Ionicons name="pulse-outline" size={24} color={TEAL} />
          </View>
          <View style={s.actionTexts}>
            <Text style={s.actionTitle}>Patient Monitor</Text>
            <Text style={s.actionSub}>View vitals &amp; history</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionCard, { borderLeftColor: Colors.alertRed }]}
          onPress={() => navigation.navigate("Alerts")}
        >
          <View style={[s.actionIcon, { backgroundColor: Colors.alertRed + "18" }]}>
            <Ionicons name="notifications-outline" size={24} color={Colors.alertRed} />
          </View>
          <View style={s.actionTexts}>
            <Text style={s.actionTitle}>Alert Center</Text>
            <Text style={s.actionSub}>Missed doses &amp; warnings</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Care Tips */}
      <Text style={s.sectionTitle}>Care Tips</Text>
      {TIPS.map((tip) => (
        <View key={tip.title} style={s.tipCard}>
          <View style={[s.tipIcon, { backgroundColor: tip.color + "18" }]}>
            <Ionicons name={tip.icon} size={22} color={tip.color} />
          </View>
          <View style={s.tipTexts}>
            <Text style={s.tipTitle}>{tip.title}</Text>
            <Text style={s.tipBody}>{tip.body}</Text>
          </View>
        </View>
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: Colors.bg },
  header:           { backgroundColor: TEAL, paddingTop: 48, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  menuBtn:          { padding: 4 },
  headerCenter:     { flex: 1, alignItems: "center" },
  greeting:         { fontSize: 12, color: "rgba(255,255,255,0.75)" },
  title:            { fontSize: 20, fontWeight: "700", color: Colors.white },
  avatar:           { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  avatarText:       { fontSize: 14, fontWeight: "700", color: Colors.white },
  sectionTitle:     { fontSize: 15, fontWeight: "600", color: Colors.textPrimary, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  placeholderCard:  { backgroundColor: Colors.card, marginHorizontal: 16, borderRadius: 16, padding: 32, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  placeholderTitle: { fontSize: 15, fontWeight: "600", color: Colors.textSecondary },
  placeholderSub:   { fontSize: 12, color: Colors.textSecondary, textAlign: "center" },
  actionRow:        { paddingHorizontal: 16, gap: 12 },
  actionCard:       { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderLeftWidth: 4, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  actionIcon:       { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  actionTexts:      { flex: 1 },
  actionTitle:      { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  actionSub:        { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  tipCard:          { backgroundColor: Colors.card, marginHorizontal: 16, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tipIcon:          { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginTop: 2 },
  tipTexts:         { flex: 1 },
  tipTitle:         { fontSize: 13, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  tipBody:          { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
});
