import { View, Text, StyleSheet } from "react-native"; import { Colors } from "@mediguard/shared";
export function Onboarding3Screen() { return <View style={s.root}><Text style={s.t}>Drug Interaction Checker</Text></View>; }
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: Colors.bg }, t: { fontSize: 22, color: Colors.textPrimary } });
