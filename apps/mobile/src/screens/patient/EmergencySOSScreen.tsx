import { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

// ─── Helplines ────────────────────────────────────────────────────────────────

const HELPLINES = [
  { name: "Ambulance",       icon: "medical-outline",  number: "108",          color: "#E53935" },
  { name: "Police",          icon: "shield-outline",   number: "100",          color: "#1565C0" },
  { name: "Fire",            icon: "flame-outline",    number: "101",          color: "#E65100" },
  { name: "Women Helpline",  icon: "person-outline",   number: "1091",         color: "#AD1457" },
  { name: "Poison Control",  icon: "warning-outline",  number: "1800-11-6117", color: "#6A1B9A" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseContact(raw: string): { contactName: string; phoneMatch: string } {
  const phoneMatch =
    raw.match(/[\d\s\+\-]{10,}/)?.[0]?.replace(/\s/g, "") ?? "";
  const contactName =
    raw.replace(/[\d\+\-\s]+/, "").trim() || "Emergency Contact";
  return { contactName, phoneMatch };
}

function callNumber(number: string) {
  Linking.openURL(`tel:${number}`).catch(() =>
    Alert.alert("Error", "Unable to initiate call. Please dial manually.")
  );
}

// ─── Pulsing SOS Button ───────────────────────────────────────────────────────

function PulsingSOSButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scale]);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Animated.View style={[s.sosCircle, { transform: [{ scale }] }]}>
        <Text style={s.sosEmoji}>🆘</Text>
        <Text style={s.sosLabel}>SOS</Text>
        <Text style={s.sosSubLabel}>Tap to call contact</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function EmergencySOSScreen() {
  const navigation = useNavigation();
  const user       = useAuthStore((s) => s.user);

  const raw                        = user?.emergencyContact ?? "";
  const { contactName, phoneMatch } = parseContact(raw);
  const hasContact                 = phoneMatch.length >= 10;

  function handleSOSTap() {
    if (!hasContact) {
      Alert.alert(
        "No Emergency Contact",
        "Please set an emergency contact in your Health Profile first.",
        [{ text: "OK" }]
      );
      return;
    }
    Alert.alert(
      "Call Emergency Contact?",
      `This will call ${contactName} (${phoneMatch}).`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Call Now", style: "destructive", onPress: () => callNumber(phoneMatch) },
      ]
    );
  }

  function handleSMS() {
    Linking.openURL(
      `sms:${phoneMatch}?body=EMERGENCY: I need help! I am a MediGuard user. Please contact me immediately.`
    ).catch(() =>
      Alert.alert("Error", "Unable to open SMS. Please message manually.")
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Emergency SOS</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* SOS Button */}
        <View style={s.sosCard}>
          <PulsingSOSButton onPress={handleSOSTap} />
          <Text style={s.sosCardLabel}>Tap button to call your emergency contact</Text>
        </View>

        {/* Emergency Contact */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>My Emergency Contact</Text>

          {hasContact ? (
            <View style={s.contactCard}>
              <View style={s.contactIconCircle}>
                <Ionicons name="person" size={22} color={Colors.primary} />
              </View>
              <View style={s.contactInfo}>
                <Text style={s.contactName}>{contactName}</Text>
                <Text style={s.contactPhone}>{phoneMatch}</Text>
              </View>
              <View style={s.contactActions}>
                <TouchableOpacity
                  style={[s.contactBtn, s.contactBtnCall]}
                  onPress={() => callNumber(phoneMatch)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={15} color={Colors.white} />
                  <Text style={s.contactBtnText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.contactBtn, s.contactBtnSms]}
                  onPress={handleSMS}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble" size={15} color={Colors.white} />
                  <Text style={s.contactBtnText}>SMS</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.noContactCard}>
              <Ionicons name="alert-circle-outline" size={32} color={Colors.orange} />
              <Text style={s.noContactText}>
                No emergency contact saved.{"\n"}Go to Health Profile to add one.
              </Text>
              <TouchableOpacity
                style={s.setNowBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
              >
                <Text style={s.setNowBtnText}>Set Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Helplines */}
        <View style={s.section}>
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerLabel}>Emergency Helplines</Text>
            <View style={s.dividerLine} />
          </View>

          {HELPLINES.map((h) => (
            <View key={h.number} style={s.helplineCard}>
              <View style={[s.helplineIconCircle, { backgroundColor: h.color + "18" }]}>
                <Ionicons name={h.icon as any} size={20} color={h.color} />
              </View>
              <Text style={s.helplineName}>{h.name}</Text>
              <TouchableOpacity
                style={[s.helplineChip, { backgroundColor: Colors.primary }]}
                onPress={() => callNumber(h.number)}
                activeOpacity={0.8}
              >
                <Ionicons name="call-outline" size={13} color={Colors.white} />
                <Text style={s.helplineChipText}>{h.number}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: Colors.bg },

  // Header
  header:            { backgroundColor: "#C62828", paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn:           { width: 36, alignItems: "center" },
  headerTitle:       { color: Colors.white, fontSize: 18, fontWeight: "700", letterSpacing: 0.3 },

  scroll:            { paddingHorizontal: 16, paddingTop: 24 },

  // SOS Card
  sosCard:           { backgroundColor: Colors.card, borderRadius: 20, alignItems: "center", paddingVertical: 32, paddingHorizontal: 16, marginBottom: 24, shadowColor: "#C62828", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  sosCircle:         { width: 140, height: 140, borderRadius: 70, backgroundColor: "#C62828", alignItems: "center", justifyContent: "center", marginBottom: 12, shadowColor: "#C62828", shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  sosEmoji:          { fontSize: 40 },
  sosLabel:          { color: Colors.white, fontSize: 22, fontWeight: "800", letterSpacing: 2, marginTop: 2 },
  sosSubLabel:       { color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 2 },
  sosCardLabel:      { color: Colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 4 },

  // Section
  section:           { marginBottom: 20 },
  sectionTitle:      { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 },

  // Contact Card
  contactCard:       { backgroundColor: Colors.card, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  contactIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryPale, alignItems: "center", justifyContent: "center" },
  contactInfo:       { flex: 1 },
  contactName:       { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  contactPhone:      { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  contactActions:    { flexDirection: "row", gap: 8 },
  contactBtn:        { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  contactBtnCall:    { backgroundColor: Colors.primary },
  contactBtnSms:     { backgroundColor: "#1565C0" },
  contactBtnText:    { color: Colors.white, fontSize: 12, fontWeight: "700" },

  // No Contact
  noContactCard:     { backgroundColor: "#FFF7E6", borderRadius: 14, padding: 20, alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.orange },
  noContactText:     { color: Colors.textSecondary, fontSize: 13, textAlign: "center", lineHeight: 20 },
  setNowBtn:         { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  setNowBtnText:     { color: Colors.white, fontWeight: "700", fontSize: 14 },

  // Divider
  dividerRow:        { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 8 },
  dividerLine:       { flex: 1, height: 1, backgroundColor: "#DDD" },
  dividerLabel:      { fontSize: 12, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 0.5 },

  // Helpline
  helplineCard:      { backgroundColor: Colors.card, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, gap: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  helplineIconCircle:{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  helplineName:      { flex: 1, fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  helplineChip:      { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  helplineChipText:  { color: Colors.white, fontSize: 12, fontWeight: "700" },
});
