import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useNavigation }            from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { sendPasswordResetEmail }   from "firebase/auth";
import { getFirebaseAuth }          from "@mediguard/firebase";
import { Colors }                   from "@mediguard/shared";
import type { AuthStackParams }     from "@/navigation/AuthStack";

type Nav = StackNavigationProp<AuthStackParams, "ForgotPassword">;

export function ForgotPasswordScreen() {
  const nav                   = useNavigation<Nav>();
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [focused, setFocused] = useState(false);

  async function handleSendReset() {
    const trimmed = email.trim();
    if (!trimmed) { setError("Please enter your email address"); return; }
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), trimmed);
      setSent(true);
    } catch (e: any) {
      if (e?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        // For user-not-found and all others: show success anyway (security)
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => nav.navigate("Login")}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Email Sent</Text>
          <Text style={s.headerSub}>Check your inbox</Text>
        </View>

        {/* Success card */}
        <View style={s.successCard}>
          <View style={s.checkCircle}>
            <Text style={s.checkMark}>✓</Text>
          </View>
          <Text style={s.successTitle}>Check Your Inbox!</Text>
          <Text style={s.successMsg}>
            {"We sent a password reset link to\n"}
            <Text style={s.successEmail}>{email.trim()}</Text>
          </Text>
          <Text style={s.successNote}>(Check spam if you don't see it)</Text>

          <TouchableOpacity style={s.backToSignInBtn} onPress={() => nav.navigate("Login")}>
            <Text style={s.backToSignInTxt}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Forgot Password?</Text>
          <Text style={s.headerSub}>{"Enter your email and we'll send\na reset link"}</Text>
        </View>

        {/* Form card */}
        <View style={s.card}>
          <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
          <View style={[s.inputContainer, focused && s.inputFocused]}>
            <TextInput
              style={s.input}
              placeholder="Enter your email"
              placeholderTextColor={Colors.textSecondary}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </View>

          {!!error && <Text style={s.errorTxt}>{error}</Text>}

          <TouchableOpacity
            style={[s.sendBtn, loading && s.btnDisabled]}
            onPress={handleSendReset}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.sendBtnTxt}>Send Reset Link</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelLink} onPress={() => nav.goBack()}>
            <Text style={s.cancelLinkTxt}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: Colors.bg },

  // ── Header ──
  header:          { backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 36, paddingHorizontal: 24, alignItems: "center", borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  backBtn:         { position: "absolute", top: 56, left: 20, padding: 8 },
  backArrow:       { fontSize: 24, color: Colors.white, fontWeight: "600" },
  headerTitle:     { fontSize: 24, fontWeight: "800", color: Colors.white, textAlign: "center", marginTop: 8 },
  headerSub:       { fontSize: 13, color: Colors.primaryPale, textAlign: "center", marginTop: 6, lineHeight: 20 },

  // ── Form card ──
  card:            { backgroundColor: Colors.card, borderRadius: 24, padding: 24, marginHorizontal: 16, marginTop: -20, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 },
  fieldLabel:      { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" },
  inputContainer:  { backgroundColor: Colors.bg, borderRadius: 14, borderWidth: 1, borderColor: Colors.primaryPale, paddingHorizontal: 14, paddingVertical: 2 },
  inputFocused:    { borderColor: Colors.primary, borderWidth: 1.5 },
  input:           { fontSize: 15, color: Colors.textPrimary, paddingVertical: 12 },
  errorTxt:        { color: Colors.alertRed, fontSize: 13, marginTop: 8, textAlign: "center" },
  sendBtn:         { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 20 },
  btnDisabled:     { opacity: 0.6 },
  sendBtnTxt:      { color: Colors.white, fontSize: 16, fontWeight: "700" },
  cancelLink:      { alignSelf: "center", marginTop: 16, padding: 8 },
  cancelLinkTxt:   { color: Colors.textSecondary, fontSize: 14 },

  // ── Success state ──
  successCard:     { backgroundColor: Colors.card, borderRadius: 24, padding: 32, marginHorizontal: 16, marginTop: -20, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, alignItems: "center" },
  checkCircle:     { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryPale, alignItems: "center", justifyContent: "center", marginBottom: 24, marginTop: 8 },
  checkMark:       { fontSize: 40, color: Colors.primary, fontWeight: "800" },
  successTitle:    { fontSize: 22, fontWeight: "800", color: Colors.textPrimary, textAlign: "center", marginBottom: 12 },
  successMsg:      { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  successEmail:    { fontWeight: "700", color: Colors.textPrimary },
  successNote:     { fontSize: 12, color: Colors.textSecondary, marginTop: 6, marginBottom: 32 },
  backToSignInBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, alignItems: "center" },
  backToSignInTxt: { color: Colors.primary, fontSize: 16, fontWeight: "700" },
});
