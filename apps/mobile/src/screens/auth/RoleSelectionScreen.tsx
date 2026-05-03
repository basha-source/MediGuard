import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation }          from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { AuthStackParams }   from "@/navigation/AuthStack";
import { Colors }                 from "@mediguard/shared";

type Nav = StackNavigationProp<AuthStackParams, "RoleSelection">;

export function RoleSelectionScreen() {
  const nav = useNavigation<Nav>();

  return (
    <View style={s.root}>
      <Text style={s.title}>How would you like to use MediGuard?</Text>

      <TouchableOpacity style={s.patientCard} onPress={() => nav.navigate("HealthConditions", { role: "patient" })}>
        <Text style={s.cardIcon}>👤</Text>
        <Text style={s.cardTitle}>I'm a Patient</Text>
        <Text style={s.cardDesc}>Track my own medicines, schedule and health</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.cgCard} onPress={() => nav.navigate("HealthConditions", { role: "careGuardian" })}>
        <Text style={s.cardIcon}>🛡️</Text>
        <Text style={[s.cardTitle, { color: Colors.white }]}>I'm a Care Guardian</Text>
        <Text style={[s.cardDesc, { color: Colors.primaryPale }]}>Monitor a family member's medicines</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.primary, padding: 24, justifyContent: "center" },
  title:       { fontSize: 18, color: Colors.primaryPale, textAlign: "center", marginBottom: 36, lineHeight: 26 },
  patientCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 28, marginBottom: 20, alignItems: "center" },
  cgCard:      { backgroundColor: Colors.greenDark, borderRadius: 20, padding: 28, alignItems: "center" },
  cardIcon:    { fontSize: 44, marginBottom: 12 },
  cardTitle:   { fontSize: 18, fontWeight: "bold", color: Colors.textPrimary, marginBottom: 8 },
  cardDesc:    { fontSize: 13, color: Colors.textSecondary, textAlign: "center" },
});
