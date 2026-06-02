import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@mediguard/shared";

// ─── Static Data ──────────────────────────────────────────────────────────────

const DO_THIS = [
  {
    icon:  "cafe-outline",
    title: "Mix with Undesirables",
    desc:  "Mix medicines with coffee grounds, dirt, or cat litter before disposing.",
  },
  {
    icon:  "bag-outline",
    title: "Seal Securely",
    desc:  "Place in a sealed bag or container before putting in household waste.",
  },
  {
    icon:  "storefront-outline",
    title: "Pharmacy Take-Back",
    desc:  "Many pharmacies accept unused medicines for safe disposal.",
  },
  {
    icon:  "document-outline",
    title: "Remove Labels",
    desc:  "Scratch out your personal information on labels before disposal.",
  },
] as const;

const AVOID_THIS = [
  {
    icon:  "water-outline",
    title: "Don't Flush Medicines",
    desc:  "Flushing medicines pollutes water sources and harms aquatic life.",
  },
  {
    icon:  "trash-outline",
    title: "Don't Leave Accessible",
    desc:  "Loose medicines in open bins can be accessed by children or pets.",
  },
  {
    icon:  "bonfire-outline",
    title: "Don't Burn Medicines",
    desc:  "Burning medicines releases toxic chemicals into the air.",
  },
] as const;

const QUICK_TIPS = [
  { emoji: "💊", label: "Check expiry" },
  { emoji: "📦", label: "Store properly" },
  { emoji: "♻️",  label: "Recycle packaging" },
  { emoji: "🔒",  label: "Lock away meds" },
  { emoji: "📋",  label: "Read the label" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function DoCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={doStyle.card}>
      <View style={doStyle.iconCircle}>
        <Ionicons name={icon as any} size={20} color={Colors.primary} />
      </View>
      <View style={doStyle.textWrap}>
        <Text style={doStyle.title}>{title}</Text>
        <Text style={doStyle.desc}>{desc}</Text>
      </View>
    </View>
  );
}

const doStyle = StyleSheet.create({
  card:       { backgroundColor: Colors.card, borderRadius: 12, flexDirection: "row", alignItems: "flex-start", padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: Colors.primary, gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primaryPale, alignItems: "center", justifyContent: "center", marginTop: 1 },
  textWrap:   { flex: 1 },
  title:      { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginBottom: 3 },
  desc:       { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
});

function AvoidCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={avoidStyle.card}>
      <View style={avoidStyle.iconCircle}>
        <Ionicons name={icon as any} size={20} color={Colors.alertRed} />
      </View>
      <View style={avoidStyle.textWrap}>
        <Text style={avoidStyle.title}>{title}</Text>
        <Text style={avoidStyle.desc}>{desc}</Text>
      </View>
    </View>
  );
}

const avoidStyle = StyleSheet.create({
  card:       { backgroundColor: Colors.redPale, borderRadius: 12, flexDirection: "row", alignItems: "flex-start", padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: Colors.alertRed, gap: 12, shadowColor: Colors.alertRed, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFEBEE", alignItems: "center", justifyContent: "center", marginTop: 1 },
  textWrap:   { flex: 1 },
  title:      { fontSize: 14, fontWeight: "700", color: "#B71C1C", marginBottom: 3 },
  desc:       { fontSize: 12, color: "#C62828", lineHeight: 18 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export function DisposalGuideScreen() {
  const navigation = useNavigation();

  function openMap() {
    Linking.openURL(
      "https://www.google.com/maps/search/pharmacy+medicine+disposal+near+me"
    ).catch(() => {});
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Medicine Disposal Guide</Text>
        <View style={s.backBtn} />
      </View>

      {/* Quick Tips Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tipsRow}
        style={s.tipsStrip}
      >
        {QUICK_TIPS.map((t) => (
          <View key={t.label} style={s.tipChip}>
            <Text style={s.tipEmoji}>{t.emoji}</Text>
            <Text style={s.tipLabel}>{t.label}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Why It Matters Banner */}
        <View style={s.warningBanner}>
          <Ionicons name="warning-outline" size={26} color={Colors.orange} style={{ marginTop: 2 }} />
          <View style={s.warningText}>
            <Text style={s.warningTitle}>Why Proper Disposal Matters</Text>
            <Text style={s.warningDesc}>
              Improper medicine disposal harms the environment, pollutes water sources, and
              puts communities at risk. Handle unused medicines responsibly.
            </Text>
          </View>
        </View>

        {/* Do This Section */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionEmoji}>✅</Text>
          <Text style={[s.sectionLabel, { color: Colors.primary }]}>Do This</Text>
          <View style={[s.sectionUnderline, { backgroundColor: Colors.primary }]} />
        </View>
        {DO_THIS.map((item) => (
          <DoCard key={item.title} icon={item.icon} title={item.title} desc={item.desc} />
        ))}

        {/* Avoid This Section */}
        <View style={[s.sectionHeader, { marginTop: 8 }]}>
          <Text style={s.sectionEmoji}>❌</Text>
          <Text style={[s.sectionLabel, { color: Colors.alertRed }]}>Avoid This</Text>
          <View style={[s.sectionUnderline, { backgroundColor: Colors.alertRed }]} />
        </View>
        {AVOID_THIS.map((item) => (
          <AvoidCard key={item.title} icon={item.icon} title={item.title} desc={item.desc} />
        ))}

        {/* Drop-Off CTA */}
        <View style={s.ctaCard}>
          <View style={s.ctaTop}>
            <View style={s.ctaIconCircle}>
              <Ionicons name="location-outline" size={24} color={Colors.primary} />
            </View>
            <View style={s.ctaTextWrap}>
              <Text style={s.ctaTitle}>Find Drop-Off Points</Text>
              <Text style={s.ctaDesc}>
                Locate nearby pharmacies and hospitals that accept unused medicines.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.ctaBtn} onPress={openMap} activeOpacity={0.85}>
            <Ionicons name="map-outline" size={16} color={Colors.white} />
            <Text style={s.ctaBtnText}>Open Google Maps</Text>
            <Ionicons name="arrow-forward-outline" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: Colors.bg },

  // Header
  header:          { backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn:         { width: 36, alignItems: "center" },
  headerTitle:     { color: Colors.white, fontSize: 17, fontWeight: "700", letterSpacing: 0.2 },

  // Quick Tips
  tipsStrip:       { backgroundColor: Colors.card, maxHeight: 60 },
  tipsRow:         { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: "row", alignItems: "center" },
  tipChip:         { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.primaryPale, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tipEmoji:        { fontSize: 14 },
  tipLabel:        { fontSize: 12, fontWeight: "600", color: Colors.greenDark },

  scroll:          { paddingHorizontal: 16, paddingTop: 20 },

  // Warning Banner
  warningBanner:   { backgroundColor: "#FFF7E6", borderRadius: 14, flexDirection: "row", padding: 14, gap: 12, marginBottom: 22, borderWidth: 1, borderColor: Colors.orange },
  warningText:     { flex: 1 },
  warningTitle:    { fontSize: 14, fontWeight: "700", color: "#E65100", marginBottom: 4 },
  warningDesc:     { fontSize: 12, color: "#BF360C", lineHeight: 18 },

  // Section header
  sectionHeader:   { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 6 },
  sectionEmoji:    { fontSize: 16 },
  sectionLabel:    { fontSize: 15, fontWeight: "800" },
  sectionUnderline:{ flex: 1, height: 2, borderRadius: 1, marginLeft: 4 },

  // CTA Card
  ctaCard:         { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: Colors.primaryPale, shadowColor: Colors.primary, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  ctaTop:          { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  ctaIconCircle:   { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primaryPale, alignItems: "center", justifyContent: "center" },
  ctaTextWrap:     { flex: 1 },
  ctaTitle:        { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  ctaDesc:         { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  ctaBtn:          { backgroundColor: Colors.primary, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  ctaBtnText:      { color: Colors.white, fontWeight: "700", fontSize: 14 },
});
