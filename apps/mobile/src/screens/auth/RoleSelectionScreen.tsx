import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "@mediguard/shared";

export function RoleSelectionScreen() {
  return (
    <View style={s.root}>
      <Text style={s.title}>How would you like to continue?</Text>
      <TouchableOpacity style={s.patientCard}>
        <Text style={s.cardIcon}>👤</Text>
        <Text style={s.cardTitle}>I'm a Patient</Text>
        <Text style={s.cardDesc}>Track my own medicines, schedule and health</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.cgCard}>
        <Text style={s.cardIcon}>🛡</Text>
        <Text style={[s.cardTitle, { color: Colors.white }]}>I'm a Care Guardian</Text>
        <Text style={[s.cardDesc, { color: Colors.primaryPale }]}>Monitor a family member's medicines</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.primary, padding: 24, justifyContent: "center" },
  title:      { fontSize: 16, color: Colors.primaryPale, textAlign: "center", marginBottom: 32 },
  patientCard:{ backgroundColor: Colors.card, borderRadius: 20, padding: 24, marginBottom: 20, alignItems: "center" },
  cgCard:     { backgroundColor: Colors.greenDark, borderRadius: 20, padding: 24, alignItems: "center" },
  cardIcon:   { fontSize: 40, marginBottom: 12 },
  cardTitle:  { fontSize: 18, fontWeight: "bold", color: Colors.textPrimary, marginBottom: 8 },
  cardDesc:   { fontSize: 13, color: Colors.textSecondary, textAlign: "center" },
});
