import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, SectionList, ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

type MedEntry = {
  id:       string;
  name:     string;
  dosage:   string;
  category: string;
  addedAt:  string;
};

type Section = { title: string; data: MedEntry[] };

const CAT_COLORS: Record<string, string> = {
  tablet:    Colors.primary,
  capsule:   Colors.orange,
  liquid:    "#1E88E5",
  injection: "#8E24AA",
  other:     Colors.textSecondary,
};

function formatAddedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function MedicineHistoryScreen() {
  const navigation = useNavigation();
  const user       = useAuthStore((s) => s.user);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadHistory();
  }, [user]);

  async function loadHistory() {
    setLoading(true);
    try {
      const db   = getDb();
      const snap = await getDocs(
        query(
          collection(db, FIRESTORE.MEDICINES),
          where("userId", "==", user!.id)
        )
      );

      const sorted = snap.docs.slice().sort((a, b) => {
        const aAt = a.data().addedAt ?? "";
        const bAt = b.data().addedAt ?? "";
        return bAt.localeCompare(aAt);
      });

      const grouped: Record<string, MedEntry[]> = {};
      sorted.forEach((d) => {
        const data = d.data();
        const date = new Date(data.addedAt);
        const key  = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          id:       d.id,
          name:     data.name      ?? "Unknown",
          dosage:   data.dosage    ?? "",
          category: data.category  ?? "other",
          addedAt:  data.addedAt   ?? new Date().toISOString(),
        });
      });

      const built: Section[] = Object.entries(grouped).map(([title, data]) => ({
        title,
        data,
      }));
      setSections(built);
    } catch (err) {
      console.error("MedicineHistoryScreen: failed to load history", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Medicine History</Text>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <EmptyState />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} />
          )}
          renderItem={({ item, index, section }) => (
            <TimelineItem
              item={item}
              isLast={index === section.data.length - 1}
            />
          )}
        />
      )}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeaderRow}>
      <Text style={s.sectionHeaderText}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

function TimelineItem({ item, isLast }: { item: MedEntry; isLast: boolean }) {
  const dotColor = CAT_COLORS[item.category] ?? Colors.textSecondary;

  return (
    <View style={s.timelineItem}>
      {/* Left timeline column */}
      <View style={s.timelineLeft}>
        <View style={[s.dot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={s.verticalLine} />}
      </View>

      {/* Right content */}
      <View style={s.timelineContent}>
        <Text style={s.medName} numberOfLines={1}>{item.name}</Text>
        <View style={s.metaRow}>
          <Text style={s.metaText}>Added {formatAddedDate(item.addedAt)}</Text>
          {item.category ? (
            <>
              <Text style={s.metaDot}> · </Text>
              <View style={[s.catBadge, { backgroundColor: dotColor + "20" }]}>
                <Text style={[s.catBadgeText, { color: dotColor }]}>{item.category}</Text>
              </View>
            </>
          ) : null}
        </View>
        {item.dosage ? (
          <Text style={s.dosageText}>{item.dosage}</Text>
        ) : null}
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={s.centered}>
      <Ionicons name="time-outline" size={64} color={Colors.textSecondary} />
      <Text style={s.emptyTitle}>No medicine history yet</Text>
      <Text style={s.emptySubtitle}>
        Add medicines to your inventory to see your history here.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: Colors.bg },

  // Header
  header:            { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  backBtn:           { marginRight: 12, padding: 2 },
  headerTitle:       { fontSize: 18, fontWeight: "700", color: Colors.white, flex: 1 },

  // States
  centered:          { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle:        { fontSize: 16, fontWeight: "600", color: Colors.textPrimary, textAlign: "center" },
  emptySubtitle:     { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },

  // List
  listContent:       { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },

  // Section header
  sectionHeaderRow:  { flexDirection: "row", alignItems: "center", marginTop: 24, marginBottom: 12 },
  sectionHeaderText: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginRight: 10 },
  sectionLine:       { flex: 1, height: 1, backgroundColor: "#E8E8E8" },

  // Timeline item
  timelineItem:      { flexDirection: "row", alignItems: "flex-start", marginBottom: 0 },
  timelineLeft:      { width: 24, alignItems: "center", marginRight: 12 },
  dot:               { width: 10, height: 10, borderRadius: 5, marginTop: 5, zIndex: 1 },
  verticalLine:      { flex: 1, width: 2, backgroundColor: "#E0E0E0", minHeight: 32, marginTop: 2 },

  // Timeline content
  timelineContent:   { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  medName:           { fontSize: 15, fontWeight: "600", color: Colors.textPrimary, marginBottom: 4 },
  metaRow:           { flexDirection: "row", alignItems: "center" },
  metaText:          { fontSize: 12, color: Colors.textSecondary },
  metaDot:           { fontSize: 12, color: Colors.textSecondary },
  catBadge:          { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  catBadgeText:      { fontSize: 11, fontWeight: "600" },
  dosageText:        { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
