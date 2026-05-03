import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useNavigation }          from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { doc, getDoc }            from "firebase/firestore";
import { signInWithEmail, signUpWithEmail, getDb } from "@mediguard/firebase";
import { Colors, FIRESTORE }      from "@mediguard/shared";
import type { AuthStackParams }   from "@/navigation/AuthStack";

type Nav = StackNavigationProp<AuthStackParams, "Login">;

export function LoginScreen() {
  const nav               = useNavigation<Nav>();
  const [tab, setTab]     = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function switchTab(t: "signin" | "signup") {
    setTab(t);
    setError("");
  }

  async function handleSignIn() {
    if (!email.trim() || !pass) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError("");
    try {
      const { user: fbUser } = await signInWithEmail(email.trim(), pass);
      const snap = await getDoc(doc(getDb(), FIRESTORE.USERS, fbUser.uid));
      if (!snap.exists()) nav.navigate("RoleSelection");
      // If doc exists, useAuth's onAuthStateChanged will load the profile and switch screens
    } catch (e: any) {
      setError(
        e?.code === "auth/invalid-credential" ? "Incorrect email or password" :
        e?.code === "auth/user-not-found"      ? "No account with this email" :
        "Sign in failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (!email.trim() || !pass) { setError("Please fill in all fields"); return; }
    if (pass.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    try {
      await signUpWithEmail(email.trim(), pass);
      nav.navigate("RoleSelection");
    } catch (e: any) {
      setError(
        e?.code === "auth/email-already-in-use" ? "An account with this email already exists" :
        e?.code === "auth/invalid-email"        ? "Invalid email address" :
        "Sign up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.root} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>+</Text>
          <Text style={s.appName}>MediGuard</Text>
        </View>

        <View style={s.body}>
          <View style={s.tabs}>
            <TouchableOpacity style={[s.tab, tab === "signin" && s.tabActive]} onPress={() => switchTab("signin")}>
              <Text style={[s.tabTxt, tab === "signin" && s.tabTxtActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, tab === "signup" && s.tabActive]} onPress={() => switchTab("signup")}>
              <Text style={[s.tabTxt, tab === "signup" && s.tabTxtActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={s.input}
            placeholder="Email address"
            placeholderTextColor={Colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={s.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor={Colors.textSecondary}
            value={pass}
            onChangeText={setPass}
            secureTextEntry
          />

          {!!error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={tab === "signin" ? handleSignIn : handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.btnTxt}>{tab === "signin" ? "Sign In" : "Create Account"}</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.bg },
  header:       { backgroundColor: Colors.primary, alignItems: "center", paddingVertical: 40, paddingTop: 60 },
  logo:         { fontSize: 44, color: Colors.white, fontWeight: "bold" },
  appName:      { fontSize: 22, color: Colors.white, fontWeight: "600", marginTop: 4 },
  body:         { padding: 24, paddingTop: 32 },
  tabs:         { flexDirection: "row", backgroundColor: Colors.primaryPale, borderRadius: 12, marginBottom: 24, padding: 4 },
  tab:          { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabActive:    { backgroundColor: Colors.white },
  tabTxt:       { fontSize: 14, color: Colors.textSecondary, fontWeight: "500" },
  tabTxtActive: { color: Colors.primary, fontWeight: "700" },
  input:        { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.primaryPale },
  error:        { color: Colors.alertRed, fontSize: 13, marginBottom: 12, textAlign: "center" },
  btn:          { backgroundColor: Colors.primary, borderRadius: 30, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  btnDisabled:  { opacity: 0.6 },
  btnTxt:       { color: Colors.white, fontSize: 16, fontWeight: "600" },
});
