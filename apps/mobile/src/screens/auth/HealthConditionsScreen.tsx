import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { StackNavigationProp, RouteProp } from "@react-navigation/stack";
import { doc, setDoc }            from "firebase/firestore";
import { getFirebaseAuth, getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE }      from "@mediguard/shared";
import type { User }              from "@mediguard/shared";
import { useAuthStore }           from "@/store/authStore";
import type { AuthStackParams }   from "@/navigation/AuthStack";

type Nav   = StackNavigationProp<AuthStackParams, "HealthConditions">;
type Route = RouteProp<AuthStackParams, "HealthConditions">;

const BLOOD_GROUPS       = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMMON_CONDITIONS  = ["Diabetes", "Hypertension", "Asthma", "Heart Disease", "Thyroid"];
const COMMON_ALLERGIES   = ["Penicillin", "Aspirin", "Ibuprofen", "Sulfa drugs", "Codeine"];

export function HealthConditionsScreen() {
  const nav            = useNavigation<Nav>();
  const route          = useRoute<Route>();
  const { role }       = route.params;
  const setUser        = useAuthStore((s) => s.setUser);

  const [name, setName]           = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies]   = useState<string[]>([]);
  const [emergency, setEmergency]   = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  }

  async function handleComplete() {
    if (!name.trim()) { setError("Please enter your full name"); return; }
    setLoading(true);
    setError("");
    try {
      const fbUser = getFirebaseAuth().currentUser;
      if (!fbUser) throw new Error("Not authenticated");

      const profile: Omit<User, "id"> = {
        name:             name.trim(),
        email:            fbUser.email ?? "",
        role,
        bloodGroup:       bloodGroup || undefined,
        conditions:       conditions.length ? conditions : undefined,
        allergies:        allergies.length ? allergies : undefined,
        emergencyContact: emergency.trim() || undefined,
        createdAt:        new Date().toISOString(),
      };

      await setDoc(doc(getDb(), FIRESTORE.USERS, fbUser.uid), profile);
      setUser({ id: fbUser.uid, ...profile });
      // RootNavigator detects user in store → switches to PatientTabs / CareGuardianTabs
    } catch {
      setError("Failed to save profile. Please try again.");
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.title}>Your Health Profile</Text>
          <Text style={s.sub}>Helps us personalise your experience</Text>
        </View>

        <Text style={s.label}>Full Name *</Text>
        <TextInput
          style={s.input}
          placeholder="Enter your full name"
          placeholderTextColor={Colors.textSecondary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={s.label}>Blood Group</Text>
        <View style={s.chipRow}>
          {BLOOD_GROUPS.map(bg => (
            <TouchableOpacity
              key={bg}
              style={[s.chip, bloodGroup === bg && s.chipActive]}
              onPress={() => setBloodGroup(bloodGroup === bg ? "" : bg)}
            >
              <Text style={[s.chipTxt, bloodGroup === bg && s.chipTxtActive]}>{bg}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Medical Conditions</Text>
        <View style={s.chipRow}>
          {COMMON_CONDITIONS.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.chip, conditions.includes(c) && s.chipActive]}
              onPress={() => toggle(conditions, setConditions, c)}
            >
              <Text style={[s.chipTxt, conditions.includes(c) && s.chipTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Medicine Allergies</Text>
        <View style={s.chipRow}>
          {COMMON_ALLERGIES.map(a => (
            <TouchableOpacity
              key={a}
              style={[s.chip, allergies.includes(a) && s.chipActive]}
              onPress={() => toggle(allergies, setAllergies, a)}
            >
              <Text style={[s.chipTxt, allergies.includes(a) && s.chipTxtActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Emergency Contact (optional)</Text>
        <TextInput
          style={s.input}
          placeholder="Phone number"
          placeholderTextColor={Colors.textSecondary}
          value={emergency}
          onChangeText={setEmergency}
          keyboardType="phone-pad"
        />

        {!!error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={s.btnTxt}>Complete Setup</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.bg },
  content:      { padding: 24, paddingBottom: 48 },
  header:       { backgroundColor: Colors.primary, margin: -24, marginBottom: 28, padding: 24, paddingTop: 48 },
  title:        { fontSize: 22, fontWeight: "bold", color: Colors.white },
  sub:          { fontSize: 13, color: Colors.primaryPale, marginTop: 4 },
  label:        { fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 10, marginTop: 20, textTransform: "uppercase", letterSpacing: 0.5 },
  input:        { backgroundColor: Colors.card, borderRadius: 12, padding: 14, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.primaryPale },
  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.primaryPale },
  chipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt:      { fontSize: 13, color: Colors.textSecondary },
  chipTxtActive:{ color: Colors.white, fontWeight: "600" },
  error:        { color: Colors.alertRed, fontSize: 13, marginTop: 12, textAlign: "center" },
  btn:          { backgroundColor: Colors.primary, borderRadius: 30, paddingVertical: 16, alignItems: "center", marginTop: 28 },
  btnDisabled:  { opacity: 0.6 },
  btnTxt:       { color: Colors.white, fontSize: 16, fontWeight: "600" },
});
