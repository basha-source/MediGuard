import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@mediguard/shared";
import { ENV } from "@/config/env";

type SubResult = {
  brandName:    string;
  genericName:  string;
  manufacturer: string;
  dosageForm:   string;
};

export function SubstituteFinderScreen() {
  const navigation = useNavigation();
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<SubResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `${ENV.BACKEND_URL}/api/interactions/substitutes?ingredient=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      const items: SubResult[] = (data.results ?? []).map((r: any) => ({
        brandName:    r.openfda?.brand_name?.[0]       ?? "Unknown Brand",
        genericName:  r.openfda?.generic_name?.[0]     ?? q,
        manufacturer: r.openfda?.manufacturer_name?.[0] ?? "—",
        dosageForm:   r.openfda?.dosage_form?.[0]      ?? "—",
      }));
      setResults(items);
    } catch {
      Alert.alert("Error", "Could not fetch substitutes. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Medicine Substitute Finder</Text>
      </View>

      {/* Search area */}
      <View style={s.searchSection}>
        <Text style={s.subtitle}>Find medicines with the same active ingredient.</Text>

        <View style={s.inputRow}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="e.g. Paracetamol..."
            placeholderTextColor={Colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[s.searchBtn, !query.trim() && s.searchBtnDisabled]}
          onPress={search}
          disabled={!query.trim()}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={16} color={Colors.white} style={{ marginRight: 6 }} />
          <Text style={s.searchBtnText}>FIND SUBSTITUTES</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Searching OpenFDA database…</Text>
        </View>
      ) : !searched ? (
        <View style={s.centered}>
          <Ionicons name="medkit-outline" size={64} color={Colors.textSecondary} />
          <Text style={s.placeholderTitle}>Search for a drug name</Text>
          <Text style={s.placeholderSubtitle}>
            Enter an active ingredient or brand name above to discover equivalent medicines.
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textSecondary} />
          <Text style={s.placeholderTitle}>No results found</Text>
          <Text style={s.placeholderSubtitle}>
            Try a different spelling or a generic ingredient name.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={
            <Text style={s.resultCount}>Results ({results.length} found)</Text>
          }
          renderItem={({ item }) => <SubstituteCard item={item} />}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function SubstituteCard({ item }: { item: SubResult }) {
  return (
    <View style={s.card}>
      <View style={s.cardLeft}>
        <View style={s.greenPill} />
      </View>
      <View style={s.cardBody}>
        <Text style={s.brandName} numberOfLines={2}>{item.brandName}</Text>
        <Text style={s.genericName}>{item.genericName}</Text>
        <View style={s.chipRow}>
          {item.manufacturer !== "—" && (
            <View style={s.chip}>
              <Ionicons name="business-outline" size={11} color={Colors.textSecondary} style={{ marginRight: 3 }} />
              <Text style={s.chipText}>{item.manufacturer}</Text>
            </View>
          )}
          {item.dosageForm !== "—" && (
            <View style={[s.chip, s.chipGreen]}>
              <Ionicons name="flask-outline" size={11} color={Colors.primary} style={{ marginRight: 3 }} />
              <Text style={[s.chipText, { color: Colors.primary }]}>{item.dosageForm}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: Colors.bg },

  // Header
  header:            { backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  backBtn:           { marginRight: 12, padding: 2 },
  headerTitle:       { fontSize: 18, fontWeight: "700", color: Colors.white, flex: 1 },

  // Search
  searchSection:     { backgroundColor: Colors.card, padding: 20, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  subtitle:          { fontSize: 13, color: Colors.textSecondary, marginBottom: 14 },
  inputRow:          { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E0E0E0", marginBottom: 12 },
  inputIcon:         { marginRight: 8 },
  input:             { flex: 1, fontSize: 14, color: Colors.textPrimary },
  searchBtn:         { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText:     { color: Colors.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.5 },

  // States
  centered:          { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  loadingText:       { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  placeholderTitle:  { fontSize: 16, fontWeight: "600", color: Colors.textPrimary, textAlign: "center" },
  placeholderSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },

  // List
  listContent:       { padding: 16, gap: 12, paddingBottom: 40 },
  resultCount:       { fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 4 },

  // Card
  card:              { backgroundColor: Colors.card, borderRadius: 12, padding: 14, flexDirection: "row", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  cardLeft:          { marginRight: 12, paddingTop: 3 },
  greenPill:         { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  cardBody:          { flex: 1 },
  brandName:         { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 2 },
  genericName:       { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  chipRow:           { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip:              { flexDirection: "row", alignItems: "center", backgroundColor: "#F5F5F5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipGreen:         { backgroundColor: Colors.primary + "15" },
  chipText:          { fontSize: 11, color: Colors.textSecondary, fontWeight: "500" },
});
