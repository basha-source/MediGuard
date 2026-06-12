import { useState, useCallback, useMemo, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  RefreshControl, ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, ALERT_DAYS } from "@mediguard/shared";
import { useMedicineStore } from "@/store/medicineStore";
import type { Medicine, MedicineCategory } from "@mediguard/shared";

const DISMISSED_KEY = "dismissedExpiryAlerts";

type FilterTab = "all" | "expired" | "expiring" | "lowStock";

function daysUntilExpiry(expiryDate: string): number {
  return Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

type CardColors = { bg: string; border: string; accent: string; tag: string; tagBg: string };

function getCardColors(daysLeft: number | null): CardColors {
  if (daysLeft !== null && daysLeft < 0)
    return { bg: "#FFF2F2", border: "#FFCDD2", accent: "#E53935", tag: "Expired",        tagBg: "#FFEBEE" };
  if (daysLeft !== null && daysLeft === 0)
    return { bg: "#FFF2F2", border: "#FFCDD2", accent: "#E53935", tag: "Expires today",  tagBg: "#FFEBEE" };
  if (daysLeft !== null && daysLeft <= ALERT_DAYS.EXPIRY_WARNING_2)
    return { bg: "#FFF8EE", border: "#FFE0B2", accent: "#F57C00", tag: `${daysLeft}d left`, tagBg: "#FFF3E0" };
  if (daysLeft !== null && daysLeft <= ALERT_DAYS.EXPIRY_WARNING_1)
    return { bg: "#FFFDE7", border: "#FFF176", accent: "#F9A825", tag: `${daysLeft}d left`, tagBg: "#FFFDE7" };
  return { bg: "#E3F2FD", border: "#BBDEFB", accent: "#1565C0", tag: "Low stock", tagBg: "#E3F2FD" };
}

const CAT_ICON: Record<MedicineCategory, keyof typeof Ionicons.glyphMap> = {
  tablet:    "tablet-portrait-outline",
  capsule:   "ellipse-outline",
  liquid:    "water-outline",
  injection: "bandage-outline",
  other:     "medkit-outline",
};

type AlertItem = {
  medicine:       Medicine;
  daysLeft:       number | null;
  isExpired:      boolean;
  isExpiringSoon: boolean;
  isLowStock:     boolean;
};

// ─── Summary chip ─────────────────────────────────────────────────────────────
function SummaryChip({
  icon, color, label, value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string; label: string; value: number;
}) {
  return (
    <View style={[sc.chip, { borderColor: color + "40" }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[sc.val, { color }]}>{value}</Text>
      <Text style={sc.lbl}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  chip: { flex: 1, alignItems: "center", paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, backgroundColor: Colors.card, gap: 3 },
  val:  { fontSize: 22, fontWeight: "700" },
  lbl:  { fontSize: 10, color: Colors.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export function ExpiryAlertScreen() {
  const nav       = useNavigation<any>();
  const medicines = useMedicineStore((s) => s.medicines);

  const [activeTab,  setActiveTab]  = useState<FilterTab>("all");
  const [dismissed,  setDismissed]  = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((raw) => {
      if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
    }).catch(() => {});
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setDismissed(next);
    AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])).catch(() => {});
  }, []);

  const dismiss = useCallback((id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    persist(next);
  }, [dismissed, persist]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setDismissed(new Set());
    await AsyncStorage.removeItem(DISMISSED_KEY).catch(() => {});
    setRefreshing(false);
  }, []);

  const alertItems = useMemo<AlertItem[]>(() => {
    return medicines
      .filter((m) => !dismissed.has(m.id))
      .map((m) => {
        const daysLeft       = m.expiryDate ? daysUntilExpiry(m.expiryDate) : null;
        const isExpired      = daysLeft !== null && daysLeft < 0;
        const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= ALERT_DAYS.EXPIRY_WARNING_1;
        const isLowStock     = (m.quantity ?? 0) <= ALERT_DAYS.LOW_STOCK_THRESHOLD;
        return { medicine: m, daysLeft, isExpired, isExpiringSoon, isLowStock };
      })
      .filter((i) => i.isExpired || i.isExpiringSoon || i.isLowStock)
      .sort((a, b) => {
        if (a.isExpired !== b.isExpired) return a.isExpired ? -1 : 1;
        if (a.daysLeft !== null && b.daysLeft !== null) return a.daysLeft - b.daysLeft;
        if (a.daysLeft !== null) return -1;
        if (b.daysLeft !== null) return 1;
        return 0;
      });
  }, [medicines, dismissed]);

  const counts = useMemo(() => ({
    all:      alertItems.length,
    expired:  alertItems.filter((i) => i.isExpired).length,
    expiring: alertItems.filter((i) => i.isExpiringSoon && !i.isExpired).length,
    lowStock: alertItems.filter((i) => i.isLowStock).length,
  }), [alertItems]);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case "expired":  return alertItems.filter((i) => i.isExpired);
      case "expiring": return alertItems.filter((i) => i.isExpiringSoon && !i.isExpired);
      case "lowStock": return alertItems.filter((i) => i.isLowStock);
      default:         return alertItems;
    }
  }, [alertItems, activeTab]);

  const goEdit    = useCallback((m: Medicine) =>
    nav.navigate("Inventory", { screen: "AddMedicine", params: { medicineId: m.id } }), [nav]);
  const goReorder = useCallback((m: Medicine) =>
    nav.navigate("Inventory", { screen: "AddMedicine", params: { medicineId: m.id } }), [nav]);
  const goDispose = useCallback(() => nav.navigate("DisposalGuide"), [nav]);

  const renderCard = useCallback(({ item }: { item: AlertItem }) => {
    const { medicine: m, daysLeft, isExpired, isExpiringSoon, isLowStock } = item;
    const cc = getCardColors(isExpired || isExpiringSoon ? daysLeft : null);

    return (
      <View style={[s.card, { backgroundColor: cc.bg, borderColor: cc.border }]}>

        {/* Top row */}
        <View style={s.cardTop}>
          <View style={[s.catIcon, { backgroundColor: cc.accent + "1A" }]}>
            <Ionicons name={CAT_ICON[m.category] ?? "medkit-outline"} size={20} color={cc.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.medName} numberOfLines={1}>{m.name}</Text>
            <Text style={s.medSub}>{m.dosage || "—"} · {m.category}</Text>
          </View>
          <TouchableOpacity
            onPress={() => dismiss(m.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Badges */}
        <View style={s.badgeRow}>
          {(isExpired || isExpiringSoon) && (
            <View style={[s.badge, { backgroundColor: cc.tagBg, borderColor: cc.border }]}>
              <Ionicons name="time-outline" size={11} color={cc.accent} />
              <Text style={[s.badgeTxt, { color: cc.accent }]}>{cc.tag}</Text>
            </View>
          )}
          {isLowStock && (
            <View style={[s.badge, { backgroundColor: "#E3F2FD", borderColor: "#BBDEFB" }]}>
              <Ionicons name="alert-circle-outline" size={11} color="#1565C0" />
              <Text style={[s.badgeTxt, { color: "#1565C0" }]}>{m.quantity} units left</Text>
            </View>
          )}
          {m.expiryDate ? (
            <View style={[s.badge, { backgroundColor: "#F5F5F5", borderColor: "#E0E0E0" }]}>
              <Ionicons name="calendar-outline" size={11} color={Colors.textSecondary} />
              <Text style={[s.badgeTxt, { color: Colors.textSecondary }]}>Exp: {fmtDate(m.expiryDate)}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={[s.actionBtn, { borderColor: cc.accent }]} onPress={() => goEdit(m)}>
            <Ionicons name="create-outline" size={13} color={cc.accent} />
            <Text style={[s.actionTxt, { color: cc.accent }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { borderColor: "#1565C0" }]} onPress={() => goReorder(m)}>
            <Ionicons name="refresh-outline" size={13} color="#1565C0" />
            <Text style={[s.actionTxt, { color: "#1565C0" }]}>Reorder</Text>
          </TouchableOpacity>
          {isExpired && (
            <TouchableOpacity style={[s.actionBtn, { borderColor: "#9E9E9E" }]} onPress={goDispose}>
              <Ionicons name="trash-outline" size={13} color="#9E9E9E" />
              <Text style={[s.actionTxt, { color: "#9E9E9E" }]}>Dispose</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [dismiss, goEdit, goReorder, goDispose]);

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",      label: "All",       count: counts.all },
    { key: "expired",  label: "Expired",   count: counts.expired },
    { key: "expiring", label: "Expiring",  count: counts.expiring },
    { key: "lowStock", label: "Low Stock", count: counts.lowStock },
  ];

  return (
    <View style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Expiry Alerts</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Summary strip */}
      <View style={s.summaryRow}>
        <SummaryChip icon="alert-circle" color="#E53935" label="Expired"   value={counts.expired}  />
        <SummaryChip icon="time-outline" color="#F57C00" label="Expiring"  value={counts.expiring} />
        <SummaryChip icon="cube-outline" color="#1565C0" label="Low Stock" value={counts.lowStock} />
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, activeTab === t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[s.tabTxt, activeTab === t.key && s.tabTxtActive]}>
              {t.label}{t.count > 0 ? ` (${t.count})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dismissed hint */}
      {dismissed.size > 0 && (
        <View style={s.dismissBanner}>
          <Ionicons name="eye-off-outline" size={13} color={Colors.textSecondary} />
          <Text style={s.dismissTxt}>{dismissed.size} dismissed · pull down to restore</Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.medicine.id}
        renderItem={renderCard}
        contentContainerStyle={filtered.length === 0 ? s.emptyWrap : s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="checkmark-circle-outline" size={68} color={Colors.primary} />
            <Text style={s.emptyTitle}>All clear!</Text>
            <Text style={s.emptySub}>
              {activeTab === "all"
                ? "No expiry or stock issues. Your medicines are in great shape."
                : `No ${activeTab === "expired" ? "expired" : activeTab === "expiring" ? "expiring soon" : "low stock"} medicines right now.`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header:      { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 52, paddingBottom: 16 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.white },

  summaryRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 14 },

  tabRow:       { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  tab:          { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F0F0F0", borderWidth: 1, borderColor: "#E0E0E0" },
  tabActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabTxt:       { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  tabTxtActive: { color: Colors.white, fontWeight: "700" },

  dismissBanner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  dismissTxt:    { fontSize: 11, color: Colors.textSecondary },

  listContent: { paddingHorizontal: 14, paddingBottom: 28, gap: 10 },
  emptyWrap:   { flexGrow: 1 },

  card:      { borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 10 },
  cardTop:   { flexDirection: "row", alignItems: "center", gap: 10 },
  catIcon:   { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  medName:   { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 2 },
  medSub:    { fontSize: 12, color: Colors.textSecondary },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeTxt: { fontSize: 11, fontWeight: "600" },

  actions:   { flexDirection: "row", gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5 },
  actionTxt: { fontSize: 12, fontWeight: "600" },

  empty:      { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary },
  emptySub:   { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
});
