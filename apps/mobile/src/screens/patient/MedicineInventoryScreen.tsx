import { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Medicine, MedicineCategory } from "@mediguard/shared";
import { useMedicines } from "@/hooks/useMedicines";
import { useMedicineStore } from "@/store/medicineStore";
import { getExpiryStatus, isLowStock } from "@/utils/medicineUtils";
import { InventoryStackParams } from "@/navigation/PatientTabs";

type Nav = StackNavigationProp<InventoryStackParams, "Inventory">;

type FilterKey = "All" | MedicineCategory | "Expiring";
const FILTERS: FilterKey[] = ["All", "tablet", "capsule", "liquid", "injection", "Expiring"];
const FILTER_LABELS: Record<FilterKey, string> = {
  All: "All", tablet: "Tablets", capsule: "Capsules",
  liquid: "Liquid", injection: "Injection", Expiring: "Expiring",
};

const CATEGORY_COLORS: Record<string, string> = {
  tablet: Colors.primary, capsule: Colors.orange,
  liquid: "#1E88E5", injection: "#8E24AA", other: Colors.textSecondary,
};

export function MedicineInventoryScreen() {
  useMedicines();
  const navigation = useNavigation<Nav>();
  const medicines  = useMedicineStore((s) => s.medicines);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("All");

  const filtered = medicines.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "All") return true;
    if (filter === "Expiring") return getExpiryStatus(m.expiryDate).days <= 30;
    return m.category === filter;
  });

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>My Medicines</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate("AddMedicine", {})}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search medicines..."
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipRow}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.chip, filter === f && s.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState hasSearch={search.length > 0} />}
        renderItem={({ item }) => (
          <MedicineCard
            medicine={item}
            onPress={() => navigation.navigate("MedicineDetail", { medicineId: item.id })}
          />
        )}
      />

      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate("AddMedicine", {})}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

function MedicineCard({ medicine, onPress }: { medicine: Medicine; onPress: () => void }) {
  const expiry   = getExpiryStatus(medicine.expiryDate);
  const lowStock = isLowStock(medicine.quantity);
  const badgeColor = expiry.label !== "OK" ? expiry.color : lowStock ? Colors.orange : Colors.primary;
  const badgeLabel = expiry.label !== "OK" ? expiry.label : lowStock ? "Low Stock" : "OK";

  const expiryDisplay = (() => {
    const d = new Date(medicine.expiryDate);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString().padStart(2, "0")}/${d.getFullYear()}`;
  })();

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardLeft}>
        <View style={[s.catDot, { backgroundColor: CATEGORY_COLORS[medicine.category] ?? Colors.textSecondary }]} />
      </View>
      <View style={s.cardBody}>
        <Text style={s.medName} numberOfLines={1}>{medicine.name}</Text>
        <Text style={s.medDosage}>{medicine.dosage}</Text>
        <View style={s.cardMeta}>
          <Text style={s.metaText}>Qty: {medicine.quantity}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaText}>Exp: {expiryDisplay}</Text>
        </View>
      </View>
      <View style={[s.badge, { backgroundColor: badgeColor + "22" }]}>
        <Text style={[s.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <View style={s.empty}>
      <Ionicons name="medkit-outline" size={56} color={Colors.textSecondary} />
      <Text style={s.emptyTitle}>
        {hasSearch ? "No medicines found" : "No medicines yet"}
      </Text>
      <Text style={s.emptySubtitle}>
        {hasSearch ? "Try a different search term" : "Tap + to add your first medicine"}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg },
  header:         { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  title:          { fontSize: 20, fontWeight: "700", color: Colors.white },
  addBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  searchRow:      { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  searchIcon:     { marginRight: 8 },
  searchInput:    { flex: 1, fontSize: 14, color: Colors.textPrimary },
  chipRow:        { flexGrow: 0 },
  chip:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: "#E0E0E0" },
  chipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:       { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  chipTextActive: { color: Colors.white },
  card:           { backgroundColor: Colors.card, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardLeft:       { marginRight: 12, alignItems: "center", justifyContent: "center" },
  catDot:         { width: 10, height: 10, borderRadius: 5 },
  cardBody:       { flex: 1 },
  medName:        { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  medDosage:      { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cardMeta:       { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 },
  metaText:       { fontSize: 11, color: Colors.textSecondary },
  metaDot:        { fontSize: 11, color: Colors.textSecondary },
  badge:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText:      { fontSize: 11, fontWeight: "600" },
  fab:            { position: "absolute", bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  empty:          { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle:     { fontSize: 16, fontWeight: "600", color: Colors.textPrimary },
  emptySubtitle:  { fontSize: 13, color: Colors.textSecondary, textAlign: "center" },
});
