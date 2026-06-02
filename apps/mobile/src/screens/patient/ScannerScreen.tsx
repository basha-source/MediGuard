import { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@mediguard/shared";
import { ENV } from "@/config/env";

type Mode = "barcode" | "packaging";

type ScanState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "not_found"; barcode: string }
  | { status: "ocr_fail" }
  | { status: "error"; message: string };

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode]       = useState<Mode>("barcode");
  const switchToPackaging     = useCallback(() => { setMode("packaging"); setState({ status: "idle" }); }, []);
  const [state, setState]     = useState<ScanState>({ status: "idle" });
  const cameraRef             = useRef<CameraView>(null);
  const navigation            = useNavigation<any>();

  const reset = useCallback(() => setState({ status: "idle" }), []);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { type: string; data: string }) => {
      if (state.status !== "idle") return;
      setState({ status: "loading" });
      try {
        const res = await fetch(
          `${ENV.BACKEND_URL}/api/medicines/lookup?barcode=${encodeURIComponent(data)}`
        );
        if (res.status === 404) {
          setState({ status: "not_found", barcode: data });
          return;
        }
        if (!res.ok) throw new Error("lookup failed");
        const med = await res.json() as { name: string; dosage?: string; category?: string };
        navigation.navigate("Inventory", {
          screen: "AddMedicine",
          params: {
            prefillName:     med.name,
            prefillDosage:   med.dosage,
            prefillCategory: med.category,
          },
        });
        setState({ status: "idle" });
      } catch {
        setState({ status: "error", message: "Could not reach server. Try again." });
      }
    },
    [state.status, navigation],
  );

  const handleCapture = useCallback(async () => {
    if (state.status !== "idle") return;
    setState({ status: "loading" });
    try {
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.4 });
      if (!photo?.base64) { setState({ status: "error", message: "Camera capture failed." }); return; }
      console.log(`[Scanner] photo captured, base64 length: ${photo.base64.length}`);
      console.log(`[Scanner] sending to: ${ENV.BACKEND_URL}/api/medicines/ocr`);

      const res = await fetch(`${ENV.BACKEND_URL}/api/medicines/ocr`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image: photo.base64, mode: "packaging" }),
      });
      console.log(`[Scanner] response status: ${res.status}`);

      if (!res.ok) {
        const errBody = await res.text();
        console.log(`[Scanner] error body: ${errBody}`);
        setState({ status: "error", message: `Server error (${res.status}): ${errBody.slice(0, 100)}` });
        return;
      }
      const data = await res.json() as {
        name?: string; dosage?: string; category?: string; expiryDate?: string;
      };
      console.log(`[Scanner] result: ${JSON.stringify(data)}`);

      if (data.name) {
        navigation.navigate("Inventory", {
          screen: "AddMedicine",
          params: {
            prefillName:     data.name,
            prefillDosage:   data.dosage,
            prefillCategory: data.category as any,
            prefillExpiry:   data.expiryDate ?? undefined,
          },
        });
        setState({ status: "idle" });
      } else {
        setState({ status: "ocr_fail" });
      }
    } catch (err: any) {
      console.log(`[Scanner] fetch threw: ${err?.message ?? err}`);
      setState({ status: "error", message: `Network: ${err?.message ?? "unknown"}` });
    }
  }, [state.status, navigation]);

  if (!permission) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Ionicons name="camera-outline" size={52} color={Colors.textSecondary} style={{ marginBottom: 16 }} />
        <Text style={s.permTitle}>Camera Access Required</Text>
        <Text style={s.permSub}>MediGuard needs camera access to scan medicines.</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={requestPermission}>
          <Text style={s.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLoading = state.status === "loading";
  const showCamera = state.status === "idle" || state.status === "loading";

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Scan Medicine</Text>
        <Text style={s.subtitle}>
          {mode === "barcode"
            ? "Point at a barcode on the medicine packaging"
            : "Point camera at the full medicine box"}
        </Text>
      </View>

      <View style={s.chipRow}>
        {(["barcode", "packaging"] as Mode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[s.chip, mode === m && s.chipActive]}
            onPress={() => { setMode(m); reset(); }}
          >
            <Ionicons
              name={m === "barcode" ? "barcode-outline" : "scan-outline"}
              size={14}
              color={mode === m ? Colors.white : Colors.textSecondary}
            />
            <Text style={[s.chipText, mode === m && s.chipTextActive]}>
              {m === "barcode" ? "Barcode" : "Scan Box"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.cameraWrap}>
        {showCamera && (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={
              mode === "barcode"
                ? { barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e"] }
                : undefined
            }
            onBarcodeScanned={mode === "barcode" && !isLoading ? handleBarcodeScanned : undefined}
            pictureSize={mode === "packaging" ? "medium" : undefined}
          />
        )}

        {showCamera && mode === "packaging" && !isLoading && (
          <View style={s.ocrOverlay}>
            <View style={s.ocrGuide}>
              <Text style={s.ocrGuideText}>Point at the full medicine box</Text>
            </View>
            <TouchableOpacity style={s.shutterBtn} onPress={handleCapture}>
              <View style={s.shutterInner} />
            </TouchableOpacity>
          </View>
        )}

        {showCamera && mode === "barcode" && !isLoading && (
          <View style={s.overlay}>
            <View style={s.frame}>
              <View style={[s.corner, s.tl]} />
              <View style={[s.corner, s.tr]} />
              <View style={[s.corner, s.bl]} />
              <View style={[s.corner, s.br]} />
            </View>
            <Text style={s.hint}>Align barcode within the frame</Text>
          </View>
        )}

        {isLoading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.white} />
            <Text style={s.loadingText}>
              {mode === "barcode" ? "Looking up medicine…" : "Reading medicine box…"}
            </Text>
          </View>
        )}

        {state.status === "not_found" && (
          <ResultPanel
            icon="search-outline"
            iconColor={Colors.orange}
            title="Barcode Not Found"
            subtitle="Not in global database. Try scanning the full medicine box instead — works for Indian medicines."
          >
            <TouchableOpacity style={s.primaryBtn} onPress={switchToPackaging}>
              <Ionicons name="scan-outline" size={18} color={Colors.white} style={{ marginRight: 6 }} />
              <Text style={s.primaryBtnText}>Scan Box Instead</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.ghostBtn}
              onPress={() => {
                navigation.navigate("Inventory", { screen: "AddMedicine", params: {} });
                reset();
              }}
            >
              <Text style={s.ghostBtnText}>Add Manually</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostBtn} onPress={reset}>
              <Text style={s.ghostBtnText}>Scan Again</Text>
            </TouchableOpacity>
          </ResultPanel>
        )}

        {state.status === "ocr_fail" && (
          <ResultPanel
            icon="eye-off-outline"
            iconColor={Colors.orange}
            title="Could Not Read Box"
            subtitle="Make sure the medicine box text is clearly visible and well-lit. Try holding steady."
          >
            <TouchableOpacity style={s.primaryBtn} onPress={reset}>
              <Text style={s.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </ResultPanel>
        )}

        {state.status === "error" && (
          <ResultPanel
            icon="cloud-offline-outline"
            iconColor={Colors.alertRed}
            title="Something Went Wrong"
            subtitle={state.message}
          >
            <TouchableOpacity style={s.primaryBtn} onPress={reset}>
              <Text style={s.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </ResultPanel>
        )}
      </View>
    </View>
  );
}

function ResultPanel({
  icon, iconColor, title, subtitle, children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.resultPanel}>
      <Ionicons name={icon} size={52} color={iconColor} style={{ marginBottom: 12 }} />
      <Text style={s.resultTitle}>{title}</Text>
      <Text style={s.resultSubtitle}>{subtitle}</Text>
      <View style={s.resultActions}>{children}</View>
    </View>
  );
}

const CORNER = 24;
const BORDER = 3;

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: Colors.bg },
  header:        { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  title:         { fontSize: 20, fontWeight: "bold", color: Colors.white },
  subtitle:      { fontSize: 13, color: Colors.primaryPale, marginTop: 4 },
  chipRow:       { flexDirection: "row", gap: 10, padding: 14, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: "#EEEEEE" },
  chip:          { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F0F0F0", borderWidth: 1, borderColor: "#E0E0E0" },
  chipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:      { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  chipTextActive:{ color: Colors.white },
  cameraWrap:    { flex: 1, overflow: "hidden", position: "relative", backgroundColor: "#000" },
  overlay:       { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame:         { width: 240, height: 160, position: "relative" },
  corner:        { position: "absolute", width: CORNER, height: CORNER, borderColor: Colors.white, borderWidth: BORDER },
  tl:            { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr:            { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl:            { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br:            { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint:          { color: Colors.white, fontSize: 13, marginTop: 20, textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  ocrOverlay:    { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "space-between", paddingVertical: 40 },
  ocrGuide:      { backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  ocrGuideText:  { color: Colors.white, fontSize: 13, fontWeight: "500" },
  shutterBtn:    { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: Colors.white },
  shutterInner:  { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.white },
  loadingOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText:   { color: Colors.white, fontSize: 15, fontWeight: "500" },
  resultPanel:   { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center", padding: 32 },
  resultTitle:   { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8, textAlign: "center" },
  resultSubtitle:{ fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  resultActions: { width: "100%", gap: 12 },
  primaryBtn:    { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, alignItems: "center" },
  primaryBtnText:{ color: Colors.white, fontWeight: "600", fontSize: 15 },
  ghostBtn:      { borderWidth: 1.5, borderColor: Colors.primary, paddingVertical: 13, paddingHorizontal: 32, borderRadius: 12, alignItems: "center" },
  ghostBtnText:  { color: Colors.primary, fontWeight: "600", fontSize: 15 },
  permTitle:     { fontSize: 18, fontWeight: "600", color: Colors.textPrimary, marginBottom: 8, textAlign: "center" },
  permSub:       { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginBottom: 24 },
});
