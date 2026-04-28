import { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Colors } from "@mediguard/shared";

type ScanResult = { type: string; data: string } | null;

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]           = useState(false);
  const [result, setResult]             = useState<ScanResult>(null);

  const handleBarcodeScanned = useCallback(
    ({ type, data }: { type: string; data: string }) => {
      if (scanned) return;
      setScanned(true);
      setResult({ type, data });
    },
    [scanned],
  );

  const reset = useCallback(() => {
    setScanned(false);
    setResult(null);
  }, []);

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
        <Text style={s.permTitle}>Camera Access Required</Text>
        <Text style={s.permSub}>
          MediGuard needs camera access to scan medicine barcodes.
        </Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Scan Medicine</Text>
        <Text style={s.subtitle}>Point at a barcode or QR code on the medicine</Text>
      </View>

      <View style={s.cameraWrapper}>
        {!scanned && (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e"],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        )}

        {/* Scanning frame overlay */}
        {!scanned && (
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

        {/* Result panel */}
        {scanned && result && (
          <View style={s.resultPanel}>
            <Text style={s.resultIcon}>✅</Text>
            <Text style={s.resultLabel}>Barcode Detected</Text>
            <Text style={s.resultType}>{result.type.toUpperCase()}</Text>
            <Text style={s.resultData} numberOfLines={2}>{result.data}</Text>
            <TouchableOpacity style={s.btn} onPress={reset}>
              <Text style={s.btnText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const CORNER = 24;
const BORDER = 3;

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.bg },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: Colors.bg },
  header:      { padding: 20, paddingTop: 48, backgroundColor: Colors.primary },
  title:       { fontSize: 20, fontWeight: "bold", color: Colors.white },
  subtitle:    { fontSize: 13, color: Colors.primaryPale, marginTop: 4 },
  cameraWrapper: { flex: 1, overflow: "hidden", position: "relative" },

  overlay:     { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame:       { width: 240, height: 240, position: "relative" },
  corner:      { position: "absolute", width: CORNER, height: CORNER, borderColor: Colors.white, borderWidth: BORDER },
  tl:          { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr:          { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl:          { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br:          { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint:        { color: Colors.white, fontSize: 13, marginTop: 16, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  resultPanel: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center", padding: 32 },
  resultIcon:  { fontSize: 48, marginBottom: 12 },
  resultLabel: { fontSize: 16, fontWeight: "600", color: Colors.textPrimary, marginBottom: 4 },
  resultType:  { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  resultData:  { fontSize: 18, fontWeight: "bold", color: Colors.primary, textAlign: "center", marginBottom: 24 },

  permTitle:   { fontSize: 18, fontWeight: "600", color: Colors.textPrimary, marginBottom: 8, textAlign: "center" },
  permSub:     { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginBottom: 24 },
  btn:         { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  btnText:     { color: Colors.white, fontWeight: "600", fontSize: 15 },
});
