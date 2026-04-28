import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@mediguard/shared";
export function SplashScreen() {
  return <View style={s.root}><Text style={s.logo}>+</Text><Text style={s.name}>MediGuard</Text></View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 72, color: Colors.white, fontWeight: "bold" },
  name: { fontSize: 32, color: Colors.white, fontWeight: "bold", marginTop: 16 },
});
