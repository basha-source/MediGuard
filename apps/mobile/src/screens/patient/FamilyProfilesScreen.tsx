import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@mediguard/shared";
export function FamilyProfilesScreen() {
  return <View style={s.root}><Text style={s.t}>FamilyProfilesScreen</Text></View>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.bg, padding: 24 }, t: { fontSize: 18, color: Colors.textPrimary, fontWeight: "600" } });
