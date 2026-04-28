import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "@mediguard/shared";

export function LoginScreen() {
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.logo}>+</Text>
        <Text style={s.appName}>MediGuard</Text>
      </View>
      <Text style={s.title}>Welcome Back</Text>
      <TextInput style={s.input} placeholder="Email" placeholderTextColor={Colors.textSecondary} />
      <TextInput style={s.input} placeholder="Password" placeholderTextColor={Colors.textSecondary} secureTextEntry />
      <TouchableOpacity style={s.btn}>
        <Text style={s.btnTxt}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.googleBtn}>
        <Text style={s.googleTxt}>G  Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: Colors.bg, padding: 24 },
  header:    { backgroundColor: Colors.primary, alignItems: "center", padding: 32, marginHorizontal: -24, marginTop: -24, marginBottom: 24 },
  logo:      { fontSize: 40, color: Colors.white, fontWeight: "bold" },
  appName:   { fontSize: 20, color: Colors.white, fontWeight: "600" },
  title:     { fontSize: 22, color: Colors.textPrimary, fontWeight: "bold", marginBottom: 24 },
  input:     { backgroundColor: Colors.card, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14, color: Colors.textPrimary },
  btn:       { backgroundColor: Colors.primary, borderRadius: 26, padding: 16, alignItems: "center", marginBottom: 12 },
  btnTxt:    { color: Colors.white, fontWeight: "600", fontSize: 15 },
  googleBtn: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, alignItems: "center" },
  googleTxt: { color: Colors.textPrimary, fontWeight: "500", fontSize: 13 },
});
