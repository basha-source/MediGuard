import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { doc, setDoc } from "firebase/firestore";
import { getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function HealthProfileScreen() {
  const navigation = useNavigation();
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name,             setName]             = useState(user?.name ?? "");
  const [dob,              setDob]              = useState(user?.dateOfBirth ?? "");
  const [gender,           setGender]           = useState(user?.gender ?? "");
  const [bloodGroup,       setBloodGroup]       = useState(user?.bloodGroup ?? "");
  const [conditions,       setConditions]       = useState(user?.conditions?.join(", ") ?? "");
  const [allergies,        setAllergies]        = useState(user?.allergies?.join(", ") ?? "");
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact ?? "");
  const [saving,           setSaving]           = useState(false);

  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showBloodPicker,  setShowBloodPicker]  = useState(false);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      const updates = {
        name:             name.trim() || user.name,
        dateOfBirth:      dob.trim(),
        gender:           gender,
        bloodGroup:       bloodGroup,
        conditions:       conditions.split(",").map((s) => s.trim()).filter(Boolean),
        allergies:        allergies.split(",").map((s) => s.trim()).filter(Boolean),
        emergencyContact: emergencyContact.trim(),
      };
      await setDoc(doc(getDb(), FIRESTORE.USERS, user.id), updates, { merge: true });
      setUser({ ...user, ...updates });
      Alert.alert("Saved", "Your health profile has been updated.");
    } catch {
      Alert.alert("Error", "Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Health Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Personal Info ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Personal Info</Text>

          {/* Name */}
          <View style={s.row}>
            <Text style={s.rowLabel}>Name</Text>
            <TextInput
              style={s.rowInput}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={Colors.textSecondary}
              returnKeyType="next"
            />
          </View>

          {/* DOB */}
          <View style={s.row}>
            <Text style={s.rowLabel}>Date of Birth</Text>
            <TextInput
              style={s.rowInput}
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
              maxLength={10}
            />
          </View>

          {/* Gender picker */}
          <View style={[s.row, s.rowLast]}>
            <Text style={s.rowLabel}>Gender</Text>
            <TouchableOpacity
              style={s.pickerTrigger}
              onPress={() => {
                setShowBloodPicker(false);
                setShowGenderPicker((v) => !v);
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.pickerValue, !gender && s.pickerPlaceholder]}>
                {gender || "Select"}
              </Text>
              <Ionicons
                name={showGenderPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {showGenderPicker && (
            <View style={s.dropdown}>
              {GENDERS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.dropdownItem, gender === opt && s.dropdownItemActive]}
                  onPress={() => {
                    setGender(opt);
                    setShowGenderPicker(false);
                  }}
                >
                  <Text style={[s.dropdownItemText, gender === opt && s.dropdownItemTextActive]}>
                    {opt}
                  </Text>
                  {gender === opt && (
                    <Ionicons name="checkmark" size={16} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Medical Info ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Medical Info</Text>

          {/* Blood Group picker */}
          <View style={s.row}>
            <Text style={s.rowLabel}>Blood Group</Text>
            <TouchableOpacity
              style={s.pickerTrigger}
              onPress={() => {
                setShowGenderPicker(false);
                setShowBloodPicker((v) => !v);
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.pickerValue, !bloodGroup && s.pickerPlaceholder]}>
                {bloodGroup || "Select"}
              </Text>
              <Ionicons
                name={showBloodPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {showBloodPicker && (
            <View style={s.dropdown}>
              {BLOOD_GROUPS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.dropdownItem, bloodGroup === opt && s.dropdownItemActive]}
                  onPress={() => {
                    setBloodGroup(opt);
                    setShowBloodPicker(false);
                  }}
                >
                  <Text style={[s.dropdownItemText, bloodGroup === opt && s.dropdownItemTextActive]}>
                    {opt}
                  </Text>
                  {bloodGroup === opt && (
                    <Ionicons name="checkmark" size={16} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Conditions */}
          <View style={s.multiRow}>
            <Text style={s.rowLabel}>Conditions</Text>
            <TextInput
              style={s.multiInput}
              value={conditions}
              onChangeText={setConditions}
              placeholder="e.g. Diabetes, Hypertension"
              placeholderTextColor={Colors.textSecondary}
              multiline
              returnKeyType="next"
            />
            <Text style={s.hint}>Separate multiple entries with commas</Text>
          </View>

          {/* Allergies */}
          <View style={[s.multiRow, s.rowLast]}>
            <Text style={s.rowLabel}>Allergies</Text>
            <TextInput
              style={s.multiInput}
              value={allergies}
              onChangeText={setAllergies}
              placeholder="e.g. Penicillin, Dust"
              placeholderTextColor={Colors.textSecondary}
              multiline
              returnKeyType="next"
            />
            <Text style={s.hint}>Separate multiple entries with commas</Text>
          </View>
        </View>

        {/* ── Emergency Contact ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Emergency Contact</Text>
          <View style={[s.row, s.rowLast]}>
            <Text style={s.rowLabel}>Name & Phone</Text>
            <TextInput
              style={s.rowInput}
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              placeholder="e.g. Jane Doe +91 98765 43210"
              placeholderTextColor={Colors.textSecondary}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* ── Save Button ── */}
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={saveProfile}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={s.saveBtnText}>SAVE PROFILE</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingBottom: 48 },

  /* Header */
  header: {
    backgroundColor:  Colors.primary,
    paddingTop:       52,
    paddingBottom:    16,
    paddingHorizontal: 16,
    flexDirection:    "row",
    alignItems:       "center",
    justifyContent:   "space-between",
  },
  backBtn:     { width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.white },

  /* Sections */
  section: {
    backgroundColor: Colors.card,
    borderRadius:    16,
    padding:         16,
    marginBottom:    16,
  },
  sectionTitle: {
    fontSize:        12,
    fontWeight:      "700",
    color:           Colors.textSecondary,
    textTransform:   "uppercase",
    letterSpacing:   0.5,
    marginBottom:    12,
  },

  /* Regular field row */
  row: {
    flexDirection:   "row",
    alignItems:      "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryPale,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: {
    flex:     1,
    fontSize: 14,
    color:    Colors.textSecondary,
  },
  rowInput: {
    flex:        2,
    fontSize:    14,
    color:       Colors.textPrimary,
    textAlign:   "right",
    paddingVertical: 0,
  },

  /* Picker trigger */
  pickerTrigger: {
    flex:           2,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "flex-end",
    gap:            6,
  },
  pickerValue:       { fontSize: 14, color: Colors.textPrimary, fontWeight: "500" },
  pickerPlaceholder: { color: Colors.textSecondary, fontWeight: "400" },

  /* Inline dropdown */
  dropdown: {
    backgroundColor: Colors.card,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     Colors.primaryLight,
    marginTop:       4,
    marginBottom:    8,
    overflow:        "hidden",
    zIndex:          10,
  },
  dropdownItem: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryPale,
  },
  dropdownItemActive:     { backgroundColor: Colors.primaryPale },
  dropdownItemText:       { fontSize: 14, color: Colors.textPrimary },
  dropdownItemTextActive: { color: Colors.primary, fontWeight: "600" },

  /* Multi-line field rows (conditions/allergies) */
  multiRow: {
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryPale,
  },
  multiInput: {
    fontSize:        14,
    color:           Colors.textPrimary,
    marginTop:       8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.bg,
    borderRadius:    10,
    minHeight:       48,
    textAlignVertical: "top",
  },
  hint: {
    fontSize:   11,
    color:      Colors.textSecondary,
    marginTop:  4,
    fontStyle:  "italic",
  },

  /* Save button */
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius:    30,
    paddingVertical: 16,
    alignItems:      "center",
    marginTop:       4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize:    16,
    fontWeight:  "700",
    color:       Colors.white,
    letterSpacing: 1,
  },
});
