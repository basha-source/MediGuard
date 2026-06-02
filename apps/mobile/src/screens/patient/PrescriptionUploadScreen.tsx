import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { collection, addDoc } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE, MedicineCategory } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";
import { ENV } from "@/config/env";

type DetectedMedicine = { name: string; dosage?: string; category?: MedicineCategory };
type ScreenState = "pick" | "loading" | "results";

const PICKER_OPTS: ImagePicker.ImagePickerOptions = {
  mediaTypes: "images",
  base64: true,
  quality: 0.7,
  allowsEditing: false,
};

export function PrescriptionUploadScreen() {
  const navigation = useNavigation<any>();
  const user       = useAuthStore((s) => s.user);

  const [state,     setState]     = useState<ScreenState>("pick");
  const [medicines, setMedicines] = useState<DetectedMedicine[]>([]);
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [saving,    setSaving]    = useState(false);

  const analyzeImage = useCallback(async (base64: string) => {
    setState("loading");
    try {
      const res  = await fetch(`${ENV.BACKEND_URL}/api/medicines/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mode: "prescription" }),
      });
      const data = await res.json() as { medicines?: DetectedMedicine[] };
      if (!res.ok || !data.medicines?.length) {
        Alert.alert("Not Detected", "No medicines found in the image. Try a clearer photo.");
        setState("pick");
        return;
      }
      setMedicines(data.medicines);
      setSelected(new Set(data.medicines.map((_, i) => i)));
      setState("results");
    } catch {
      Alert.alert("Error", "Could not analyse image. Check your connection and try again.");
      setState("pick");
    }
  }, []);

  const pickFromCamera = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTS);
    if (!result.canceled && result.assets[0]?.base64) {
      await analyzeImage(result.assets[0].base64);
    }
  }, [analyzeImage]);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTS);
    if (!result.canceled && result.assets[0]?.base64) {
      await analyzeImage(result.assets[0].base64);
    }
  }, [analyzeImage]);

  const toggleSelect = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || selected.size === 0) return;
    setSaving(true);
    try {
      const toSave = [...selected].map((i) => medicines[i]);
      await Promise.all(
        toSave.map((m) =>
          addDoc(collection(getDb(), FIRESTORE.MEDICINES), {
            userId:      user.id,
            name:        m.name,
            dosage:      m.dosage ?? "",
            quantity:    30,
            expiryDate:  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            category:    m.category ?? "other",
            prescribedBy: "",
            addedAt:     new Date().toISOString(),
          }),
        ),
      );
      Alert.alert(
        "Saved!",
        `${toSave.length} medicine${toSave.length > 1 ? "s" : ""} added to your inventory.`,
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [user, selected, medicines, navigation]);

  const reset = useCallback(() => {
    setMedicines([]);
    setSelected(new Set());
    setState("pick");
  }, []);

  if (state === "loading") {
    return (
      <View style={s.loadRoot}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.loadText}>Analyzing prescription...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Prescription Upload</Text>
        <View style={{ width: 38 }} />
      </View>

      {state === "pick" && (
        <View style={s.pickBody}>
          <View style={s.card}>
            <View style={s.iconWrap}>
              <Ionicons name="document-text-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={s.cardTitle}>Upload a Prescription</Text>
            <Text style={s.cardSub}>We'll detect all medicines automatically</Text>
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={pickFromCamera}>
            <Ionicons name="camera-outline" size={20} color={Colors.white} />
            <Text style={s.primaryBtnText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={pickFromGallery}>
            <Ionicons name="images-outline" size={20} color={Colors.primary} />
            <Text style={s.secondaryBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === "results" && (
        <View style={s.resultsRoot}>
          <Text style={s.resultsSub}>
            {medicines.length} medicine{medicines.length !== 1 ? "s" : ""} detected — select to save
          </Text>

          <FlatList
            data={medicines}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={s.list}
            renderItem={({ item, index }) => {
              const isOn = selected.has(index);
              return (
                <TouchableOpacity
                  style={[s.row, isOn && s.rowSelected]}
                  onPress={() => toggleSelect(index)}
                  activeOpacity={0.8}
                >
                  <View style={[s.checkbox, isOn && s.checkboxOn]} />
                  <View style={s.rowBody}>
                    <Text style={s.medName}>{item.name}</Text>
                    {item.dosage ? (
                      <Text style={s.medDosage}>{item.dosage}</Text>
                    ) : null}
                  </View>
                  <View style={s.catChip}>
                    <Text style={s.catChipText}>{item.category ?? "other"}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <View style={s.footer}>
            <TouchableOpacity
              style={[s.primaryBtn, selected.size === 0 && s.btnDisabled]}
              onPress={handleSave}
              disabled={selected.size === 0 || saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={s.primaryBtnText}>Save Selected ({selected.size})</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={reset}>
              <Text style={s.secondaryBtnText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg },
  loadRoot:       { flex: 1, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center", gap: 16 },
  loadText:       { fontSize: 15, color: Colors.textSecondary, fontWeight: "500" },
  header:         { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  backBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle:    { fontSize: 18, fontWeight: "700", color: Colors.white },
  pickBody:       { flex: 1, padding: 24, alignItems: "stretch", justifyContent: "center", gap: 16 },
  card:           { backgroundColor: Colors.card, borderRadius: 16, padding: 32, alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3, marginBottom: 8 },
  iconWrap:       { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryPale, alignItems: "center", justifyContent: "center" },
  cardTitle:      { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  cardSub:        { fontSize: 13, color: Colors.textSecondary, textAlign: "center" },
  primaryBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, gap: 8 },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: Colors.white },
  secondaryBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.primary, gap: 8 },
  secondaryBtnText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  btnDisabled:    { opacity: 0.45 },
  resultsRoot:    { flex: 1 },
  resultsSub:     { fontSize: 13, color: Colors.textSecondary, paddingHorizontal: 20, paddingVertical: 12 },
  list:           { paddingHorizontal: 16, gap: 10, paddingBottom: 16 },
  row:            { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1.5, borderColor: "transparent", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  rowSelected:    { borderColor: Colors.primary },
  checkbox:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#BDBDBD" },
  checkboxOn:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rowBody:        { flex: 1 },
  medName:        { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  medDosage:      { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  catChip:        { backgroundColor: Colors.primary + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catChipText:    { fontSize: 10, fontWeight: "600", color: Colors.primary },
  footer:         { padding: 16, gap: 10 },
});
