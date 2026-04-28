import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@mediguard/shared";

export function HealthConditionsScreen() {
  return (
    <View style={s.root}>
      <Text style={s.title}>Tell us about your health</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.primary, padding: 24 },
  title: { fontSize: 20, color: Colors.white, fontWeight: "bold" },
});
