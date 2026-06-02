import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Linking,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Colors } from "@mediguard/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

type Pharmacy = {
  id: string;
  name: string;
  address: string;
  phone: string;
  distanceKm: number;
  open: boolean;
  lat: number;
  lng: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateMockPharmacies(lat: number, lng: number): Pharmacy[] {
  const offsets = [
    { name: "Apollo Pharmacy",     addr: "Main Road, Near Bus Stand",  phone: "+91 98765 43210", open: true,  dlat:  0.003, dlng:  0.002, dist: 0.4 },
    { name: "MedPlus Pharmacy",    addr: "City Center, Opp. Hospital", phone: "+91 87654 32109", open: true,  dlat: -0.002, dlng:  0.004, dist: 0.5 },
    { name: "Wellness Forever",    addr: "Gandhi Nagar, 2nd Cross",    phone: "+91 76543 21098", open: false, dlat:  0.005, dlng: -0.003, dist: 0.7 },
    { name: "Jan Aushadhi Centre", addr: "Near Railway Station",       phone: "+91 65432 10987", open: true,  dlat: -0.004, dlng: -0.005, dist: 0.9 },
    { name: "Netmeds Store",       addr: "Market Street, Shop No. 12", phone: "+91 54321 09876", open: true,  dlat:  0.007, dlng:  0.003, dist: 1.1 },
  ];
  return offsets.map((o, i) => ({
    id: String(i),
    name: o.name,
    address: o.addr,
    phone: o.phone,
    distanceKm: o.dist,
    open: o.open,
    lat: lat + o.dlat,
    lng: lng + o.dlng,
  }));
}

function handleCall(phone: string) {
  const tel = `tel:${phone.replace(/\s/g, "")}`;
  Linking.canOpenURL(tel).then((can) => {
    if (can) Linking.openURL(tel);
    else Alert.alert("Unable to call", "Your device cannot make calls.");
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PharmacyMapScreen() {
  const navigation = useNavigation();

  const [location,   setLocation]   = useState<{ lat: number; lng: number } | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied. Enable location to find nearby pharmacies.");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLocation({ lat, lng });
      setPharmacies(generateMockPharmacies(lat, lng));
      setLoading(false);
    })();
  }, []);

  function openGoogleMaps() {
    const url = location
      ? `https://www.google.com/maps/search/pharmacy+near+me/@${location.lat},${location.lng},15z`
      : `https://www.google.com/maps/search/pharmacy+near+me`;
    Linking.openURL(url);
  }

  function openDirections(p: Pharmacy) {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.loadingText}>Getting your location…</Text>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Nearby Pharmacies</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={s.centered}>
          <View style={s.errorCard}>
            <Ionicons name="location-outline" size={48} color={Colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.settingsBtn} onPress={() => Linking.openSettings()}>
              <Text style={s.settingsBtnText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nearby Pharmacies</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={pharmacies}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            {/* Location banner */}
            <View style={s.locationBanner}>
              <View style={s.locationBannerLeft}>
                <View style={s.locationIconCircle}>
                  <Ionicons name="location" size={22} color={Colors.white} />
                </View>
                <View>
                  <Text style={s.locationTitle}>Your Location</Text>
                  {location && (
                    <Text style={s.locationCoords}>
                      {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={s.mapsBtn} onPress={openGoogleMaps} activeOpacity={0.8}>
                <Ionicons name="map-outline" size={14} color={Colors.white} />
                <Text style={s.mapsBtnText}>Google Maps</Text>
              </TouchableOpacity>
            </View>

            {/* Count label */}
            <Text style={s.sectionLabel}>
              {pharmacies.filter((p) => p.open).length} open · {pharmacies.length} total nearby
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <PharmacyCard pharmacy={item} onCall={handleCall} onDirections={openDirections} />
        )}
      />
    </View>
  );
}

// ─── Pharmacy Card ────────────────────────────────────────────────────────────

function PharmacyCard({
  pharmacy,
  onCall,
  onDirections,
}: {
  pharmacy: Pharmacy;
  onCall: (phone: string) => void;
  onDirections: (p: Pharmacy) => void;
}) {
  return (
    <View style={s.card}>
      {/* Icon */}
      <View style={[s.iconCircle, { backgroundColor: pharmacy.open ? Colors.primary + "1A" : "#F3F4F6" }]}>
        <Ionicons name="medkit" size={22} color={pharmacy.open ? Colors.primary : Colors.textSecondary} />
      </View>

      {/* Info */}
      <View style={s.cardInfo}>
        <Text style={s.pharmacyName} numberOfLines={1}>{pharmacy.name}</Text>
        <Text style={s.pharmacyAddress} numberOfLines={1}>{pharmacy.address}</Text>

        <View style={s.badgeRow}>
          <View style={s.distanceChip}>
            <Ionicons name="navigate-outline" size={11} color={Colors.textSecondary} />
            <Text style={s.distanceText}> {pharmacy.distanceKm} km</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: pharmacy.open ? "#D1FAE5" : "#FEE2E2" }]}>
            <Text style={[s.statusText, { color: pharmacy.open ? "#065F46" : "#991B1B" }]}>
              {pharmacy.open ? "Open now" : "Closed"}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => onDirections(pharmacy)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="navigate" size={17} color="#1565C0" />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => onCall(pharmacy.phone)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="call" size={17} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  centered:{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.white, flex: 1, textAlign: "center" },

  // Location banner
  locationBanner: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  locationIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  locationTitle:  { fontSize: 13, fontWeight: "700", color: Colors.white },
  locationCoords: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mapsBtnText: { color: Colors.white, fontSize: 12, fontWeight: "600" },

  // Section label
  sectionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  listContent: { paddingBottom: 32 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  cardInfo:   { flex: 1, gap: 3 },
  pharmacyName:    { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  pharmacyAddress: { fontSize: 12, color: Colors.textSecondary },
  badgeRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  distanceChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F3F4F6", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
  },
  distanceText: { fontSize: 11, color: Colors.textSecondary, fontWeight: "500" },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText:   { fontSize: 11, fontWeight: "600" },
  actions:    { flexDirection: "column", gap: 8 },
  actionBtn:  {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center", alignItems: "center",
  },

  // Loading / Error
  loadingText: { marginTop: 14, fontSize: 15, color: Colors.textSecondary },
  errorCard: {
    backgroundColor: Colors.card,
    borderRadius: 16, padding: 28, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, maxWidth: 320,
  },
  errorText:       { fontSize: 14, color: Colors.textPrimary, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  settingsBtn:     { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 24 },
  settingsBtnText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
});
