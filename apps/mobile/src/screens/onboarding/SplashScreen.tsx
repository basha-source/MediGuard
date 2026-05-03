import { useEffect }             from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation }          from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { AuthStackParams }   from "@/navigation/AuthStack";
import { Colors, APP }            from "@mediguard/shared";

type Nav = StackNavigationProp<AuthStackParams, "Splash">;

export function SplashScreen() {
  const nav = useNavigation<Nav>();

  useEffect(() => {
    const t = setTimeout(() => nav.replace("Onboarding1"), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={s.root}>
      <Text style={s.logo}>+</Text>
      <Text style={s.name}>{APP.NAME}</Text>
      <Text style={s.tagline}>{APP.TAGLINE}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  logo:    { fontSize: 80, color: Colors.white, fontWeight: "bold" },
  name:    { fontSize: 34, color: Colors.white, fontWeight: "bold", marginTop: 12 },
  tagline: { fontSize: 14, color: Colors.primaryPale, marginTop: 8, letterSpacing: 0.3 },
});
