import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation }          from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { AuthStackParams }   from "@/navigation/AuthStack";
import { Colors }                 from "@mediguard/shared";

type Nav = StackNavigationProp<AuthStackParams, "Onboarding3">;

export function Onboarding3Screen() {
  const nav = useNavigation<Nav>();
  return (
    <View style={s.root}>
      <View style={s.skipRow} />
      <View style={s.center}>
        <Text style={s.icon}>🤖</Text>
        <Text style={s.title}>AI Drug Safety</Text>
        <Text style={s.sub}>
          Check drug interactions, find substitutes and ask
          our AI assistant any medicine question — safely.
        </Text>
      </View>
      <View style={s.bottom}>
        <View style={s.dots}>
          <View style={s.dot} />
          <View style={s.dot} />
          <View style={[s.dot, s.dotActive]} />
        </View>
        <TouchableOpacity style={s.btn} onPress={() => nav.navigate("Login")}>
          <Text style={s.btnTxt}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: Colors.bg, padding: 24 },
  skipRow:   { paddingTop: 16 },
  center:    { flex: 1, alignItems: "center", justifyContent: "center" },
  icon:      { fontSize: 100, marginBottom: 32 },
  title:     { fontSize: 26, fontWeight: "bold", color: Colors.textPrimary, textAlign: "center", marginBottom: 16 },
  sub:       { fontSize: 15, color: Colors.textSecondary, textAlign: "center", lineHeight: 24, paddingHorizontal: 8 },
  bottom:    { paddingBottom: 24 },
  dots:      { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryPale },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
  btn:       { backgroundColor: Colors.primary, borderRadius: 30, paddingVertical: 16, alignItems: "center" },
  btnTxt:    { color: Colors.white, fontSize: 16, fontWeight: "600" },
});
