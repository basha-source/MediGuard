import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { doc, deleteDoc } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useMedicineStore } from "@/store/medicineStore";
import { getExpiryStatus } from "@/utils/medicineUtils";
import { InventoryStackParams } from "@/navigation/PatientTabs";

type Nav   = StackNavigationProp<InventoryStackParams, "MedicineDetail">;
type Route = RouteProp<InventoryStackParams, "MedicineDetail">;

export function MedicineDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const medicines  = useMedicineStore((s) => s.medicines);
  const [deleting, setDeleting] = useState(false);

  const medicine = medicines.find((m) => m.id === route.params.medicineId);

  if (!medicine) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Medicine Detail</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.notFound}>
          <Ionicons name="medkit-outline" size={56} color={Colors.textSecondary} />
          <Text style={s.notFoundText}>Medicine not found</Text>
        </View>
      </View>
    );
  }

  const expiry = getExpiryStatus(medicine.expiryDate);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString().padStart(2, "0")}/${d.getFullYear()}`;
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Medicine",
      `Remove "${medicine.name}" from your inventory?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteDoc(doc(getDb(), FIRESTORE.MEDICINES, medicine.id));
              navigation.goBack();
            } catch {
              Alert.alert("Error", "Failed to delete. Please try again.");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{medicine.name}</Text>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => navigation.navigate("AddMedicine", { medicineId: medicine.id })}
        >
          <Ionicons name="create-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={[s.banner, { backgroundColor: expiry.color + "18" }]}>
          <Ionicons
            name={expiry.label === "OK" ? "checkmark-circle" : "warning"}
            size={20}
            color={expiry.color}
          />
          <Text style={[s.bannerText, { color: expiry.color }]}>
            {expiry.label === "OK"
              ? `Expires in ${expiry.days} days`
              : expiry.label === "Expired"
              ? "This medicine has expired"
              : `${expiry.label}: expires in ${expiry.days} day${expiry.days !== 1 ? "s" : ""}`}
          </Text>
        </View>

        <View style={s.infoCard}>
          <InfoRow icon="flask-outline"    label="Dosage"       value={medicine.dosage} />
          <InfoRow icon="cube-outline"     label="Category"     value={capitalize(medicine.category)} />
          <InfoRow icon="layers-outline"   label="Quantity"     value={`${medicine.quantity} units`} />
          <InfoRow icon="calendar-outline" label="Expiry Date"  value={fmtDate(medicine.expiryDate)} />
          {medicine.prescribedBy ? (
            <InfoRow icon="person-outline" label="Prescribed By" value={medicine.prescribedBy} />
          ) : null}
          <InfoRow icon="time-outline"     label="Added On"     value={fmtDate(medicine.addedAt)} last />
        </View>

        <View style={[s.statusBadge, { backgroundColor: expiry.color + "18" }]}>
          <Text style={[s.statusLabel, { color: expiry.color }]}>{expiry.label}</Text>
        </View>

        <TouchableOpacity
          style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.alertRed} />
          <Text style={s.deleteBtnText}>{deleting ? "Deleting..." : "Delete Medicine"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon, label, value, last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={18} color={Colors.primary} style={s.infoIcon} />
      <View style={s.infoTexts}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  header:        { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  backBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  editBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle:   { flex: 1, fontSize: 18, fontWeight: "700", color: Colors.white, textAlign: "center", marginHorizontal: 8 },
  body:          { padding: 20, paddingBottom: 48 },
  banner:        { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, marginBottom: 20 },
  bannerText:    { fontSize: 13, fontWeight: "600", flex: 1 },
  infoCard:      { backgroundColor: Colors.card, borderRadius: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, overflow: "hidden" },
  infoRow:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  infoIcon:      { marginRight: 14 },
  infoTexts:     { flex: 1 },
  infoLabel:     { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  infoValue:     { fontSize: 14, fontWeight: "500", color: Colors.textPrimary },
  statusBadge:   { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 24 },
  statusLabel:   { fontSize: 13, fontWeight: "700" },
  deleteBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: "#E5393533", backgroundColor: Colors.redPale },
  deleteBtnText: { fontSize: 15, fontWeight: "600", color: Colors.alertRed },
  notFound:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText:  { fontSize: 16, color: Colors.textSecondary },
});
