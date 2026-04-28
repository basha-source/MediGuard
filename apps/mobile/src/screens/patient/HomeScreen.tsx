import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Colors } from "@mediguard/shared";

export function HomeScreen() {
  return (
    <ScrollView style={s.root}>
      <View style={s.header}>
        <Text style={s.greeting}>Good Morning 👋</Text>
        <Text style={s.appName}>MediGuard</Text>
      </View>
      <View style={s.statsRow}>
        {[["12","Total\nMeds",Colors.primary],["3","Expiring\nSoon",Colors.alertRed],["2","Low\nStock",Colors.orange]].map(([val,label,color])=>(
          <View key={label} style={s.statCard}>
            <Text style={[s.statVal,{color:color as string}]}>{val}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={s.sectionTitle}>Today's Doses</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.bg },
  header:       { backgroundColor: Colors.primary, padding: 20, paddingTop: 48 },
  greeting:     { fontSize: 13, color: Colors.primaryPale },
  appName:      { fontSize: 22, color: Colors.white, fontWeight: "bold" },
  statsRow:     { flexDirection: "row", padding: 16, gap: 12 },
  statCard:     { flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 12 },
  statVal:      { fontSize: 26, fontWeight: "bold" },
  statLabel:    { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary, marginHorizontal: 16, marginTop: 8 },
});
