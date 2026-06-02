import { useRef, useState } from "react";
import { createStackNavigator }  from "@react-navigation/stack";
import { useNavigation }          from "@react-navigation/native";
import {
  View, Text, TouchableOpacity, TouchableWithoutFeedback,
  ScrollView, StyleSheet, Alert, Animated, Easing, Dimensions, Image,
} from "react-native";
import { useSafeAreaInsets }  from "react-native-safe-area-context";
import { Ionicons }           from "@expo/vector-icons";
import { Colors }             from "@mediguard/shared";
import { useAuthStore }       from "@/store/authStore";
import { signOutUser }        from "@mediguard/firebase";
import { DrawerContext }      from "./drawerContext";

import { PatientTabs }              from "./PatientTabs";
import { AdherenceDashboardScreen } from "@/screens/patient/AdherenceDashboardScreen";
import { VitalsScreen }             from "@/screens/patient/VitalsScreen";
import { VaccinationScreen }        from "@/screens/patient/VaccinationScreen";
import { DrugInteractionScreen }    from "@/screens/patient/DrugInteractionScreen";
import { ExpiryAlertScreen }        from "@/screens/patient/ExpiryAlertScreen";
import { SubstituteFinderScreen }   from "@/screens/patient/SubstituteFinderScreen";
import { MedicineHistoryScreen }    from "@/screens/patient/MedicineHistoryScreen";
import { SideEffectsScreen }        from "@/screens/patient/SideEffectsScreen";
import { AIAssistantScreen }        from "@/screens/patient/AIAssistantScreen";
import { PrescriptionUploadScreen } from "@/screens/patient/PrescriptionUploadScreen";
import { PharmacyMapScreen }        from "@/screens/patient/PharmacyMapScreen";
import { FamilyProfilesScreen }     from "@/screens/patient/FamilyProfilesScreen";
import { HealthProfileScreen }      from "@/screens/patient/HealthProfileScreen";
import { MissedDoseScreen }         from "@/screens/patient/MissedDoseScreen";
import { TravelModeScreen }         from "@/screens/patient/TravelModeScreen";
import { EmergencySOSScreen }       from "@/screens/patient/EmergencySOSScreen";
import { DisposalGuideScreen }      from "@/screens/patient/DisposalGuideScreen";
import { DoctorReportScreen }          from "@/screens/patient/DoctorReportScreen";
import { MissedDoseInsightsScreen }    from "@/screens/patient/MissedDoseInsightsScreen";
import { ExportDataScreen }            from "@/screens/patient/ExportDataScreen";
import { NotificationPrefsScreen }     from "@/screens/patient/NotificationPrefsScreen";
import { NotificationSettingsScreen }  from "@/screens/patient/NotificationSettingsScreen";
import { DailyLogScreen }              from "@/screens/patient/DailyLogScreen";
import { WellnessProgressScreen }      from "@/screens/patient/WellnessProgressScreen";

export type PatientStackParams = {
  Main:               undefined;
  AdherenceDashboard: undefined;
  Vitals:             undefined;
  Vaccination:        undefined;
  DrugInteractions:   undefined;
  ExpiryAlerts:       undefined;
  SubstituteFinder:   undefined;
  MedicineHistory:    undefined;
  SideEffects:        undefined;
  AIAssistant:        undefined;
  PrescriptionUpload: undefined;
  PharmacyMap:        undefined;
  FamilyProfiles:     undefined;
  HealthProfile:      undefined;
  MissedDose:         undefined;
  MissedDoseInsights: undefined;
  TravelMode:         undefined;
  EmergencySOS:       undefined;
  DisposalGuide:      undefined;
  DoctorReport:       undefined;
  ExportData:         undefined;
  NotificationPrefs:  undefined;
  NotificationSettings: undefined;
  DailyLog:           undefined;
  WellnessProgress:   undefined;
};

const Stack   = createStackNavigator<PatientStackParams>();
const DRAWER_W = Math.min(300, Dimensions.get("window").width * 0.82);
const GREEN    = Colors.primary;

// ─── Menu definition ─────────────────────────────────────────────────────────
type MenuItem = { icon: keyof typeof Ionicons.glyphMap; label: string; screen: keyof PatientStackParams };
type MenuSection = { title: string; items: MenuItem[] };

const MENU: MenuSection[] = [
  {
    title: "Health Tracking",
    items: [
      { icon: "bar-chart-outline",   label: "Adherence Dashboard",  screen: "AdherenceDashboard" },
      { icon: "medkit-outline",      label: "Vaccination",          screen: "Vaccination" },
      { icon: "alarm-outline",       label: "Missed Doses",         screen: "MissedDose" },
      { icon: "analytics-outline",   label: "Missed Dose Insights", screen: "MissedDoseInsights" },
      { icon: "happy-outline",       label: "Daily Log",            screen: "DailyLog" },
      { icon: "trending-up-outline", label: "Wellness Progress",    screen: "WellnessProgress" },
      { icon: "heart-outline",       label: "Vitals",               screen: "Vitals" },
    ],
  },
  {
    title: "Medicines",
    items: [
      { icon: "swap-horizontal-outline", label: "Drug Interactions", screen: "DrugInteractions" },
      { icon: "time-outline",            label: "Expiry Alerts",     screen: "ExpiryAlerts" },
      { icon: "refresh-outline",         label: "Substitute Finder", screen: "SubstituteFinder" },
      { icon: "list-outline",            label: "Medicine History",  screen: "MedicineHistory" },
      { icon: "warning-outline",         label: "Side Effects",      screen: "SideEffects" },
    ],
  },
  {
    title: "Tools & Services",
    items: [
      { icon: "chatbubble-ellipses-outline", label: "AI Assistant",        screen: "AIAssistant" },
      { icon: "document-text-outline",       label: "Prescription Upload", screen: "PrescriptionUpload" },
      { icon: "map-outline",                 label: "Pharmacy Map",        screen: "PharmacyMap" },
    ],
  },
  {
    title: "Family & Care",
    items: [
      { icon: "people-outline", label: "Family Profiles", screen: "FamilyProfiles" },
      { icon: "person-outline", label: "Health Profile",  screen: "HealthProfile" },
    ],
  },
  {
    title: "Reports",
    items: [
      { icon: "document-outline",       label: "Doctor Report", screen: "DoctorReport" },
      { icon: "cloud-download-outline", label: "Export Data",   screen: "ExportData" },
    ],
  },
  {
    title: "Safety & Settings",
    items: [
      { icon: "airplane-outline",      label: "Travel Mode",    screen: "TravelMode" },
      { icon: "alert-circle-outline",  label: "Emergency SOS",  screen: "EmergencySOS" },
      { icon: "trash-outline",         label: "Disposal Guide", screen: "DisposalGuide" },
    ],
  },
];

// ─── Drawer panel content ─────────────────────────────────────────────────────
function PatientSideDrawer({ onClose }: { onClose: () => void }) {
  const insets   = useSafeAreaInsets();
  const nav      = useNavigation<any>();
  const { user } = useAuthStore();
  const initials = (user?.name ?? user?.email ?? "P").slice(0, 2).toUpperCase();

  function goTo(screen: keyof PatientStackParams) {
    onClose();
    // navigate after drawer starts closing
    setTimeout(() => nav.navigate(screen as any), 200);
  }

  function handleLogout() {
    onClose();
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOutUser },
    ]);
  }

  return (
    <View style={[d.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      {/* ── User header ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => { onClose(); setTimeout(() => nav.navigate("Main" as any, { screen: "Profile" } as any), 200); }}
      >
        <View style={d.header}>
          {user?.profilePhotoURL ? (
            <Image source={{ uri: user.profilePhotoURL }} style={d.avatarImg} />
          ) : (
            <View style={d.avatar}><Text style={d.avatarTxt}>{initials}</Text></View>
          )}
          <Text style={d.name} numberOfLines={1}>{user?.name ?? "Patient"}</Text>
          <Text style={d.email} numberOfLines={1}>{user?.email ?? ""}</Text>
          <View style={d.badge}><Text style={d.badgeTxt}>Patient</Text></View>
        </View>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
        {/* ── Dashboard shortcut ── */}
        <TouchableOpacity
          style={d.homeBtn}
          onPress={() => { onClose(); nav.navigate("Main" as any); }}
          activeOpacity={0.8}
        >
          <Ionicons name="home" size={17} color={Colors.white} />
          <Text style={d.homeBtnTxt}>Dashboard</Text>
        </TouchableOpacity>

        {/* ── Sections ── */}
        {MENU.map((section) => (
          <View key={section.title}>
            <Text style={d.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.screen}
                style={d.item}
                onPress={() => goTo(item.screen)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon} size={17} color="#78909C" style={{ width: 24 }} />
                <Text style={d.itemTxt}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* ── Sign out ── */}
      <TouchableOpacity style={d.logout} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={17} color={Colors.alertRed} />
        <Text style={d.logoutTxt}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const d = StyleSheet.create({
  root:      { flex: 1, backgroundColor: Colors.white },
  header:    { backgroundColor: GREEN, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  avatar:    { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarTxt: { fontSize: 22, fontWeight: "700", color: Colors.white },
  avatarImg: { width: 56, height: 56, borderRadius: 28, marginBottom: 12 },
  name:      { fontSize: 16, fontWeight: "700", color: Colors.white, marginBottom: 2 },
  email:     { fontSize: 12, color: "rgba(255,255,255,0.75)" },
  badge:     { marginTop: 10, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt:  { fontSize: 11, color: Colors.white, fontWeight: "600" },
  homeBtn:   { flexDirection: "row", alignItems: "center", backgroundColor: GREEN, marginHorizontal: 14, marginTop: 14, marginBottom: 6, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, gap: 8 },
  homeBtnTxt:{ fontSize: 14, fontWeight: "700", color: Colors.white },
  sectionTitle: { fontSize: 10, fontWeight: "700", color: "#90A4AE", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 18, marginBottom: 4, marginHorizontal: 20 },
  item:      { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 8, borderRadius: 10, gap: 10 },
  itemTxt:   { fontSize: 14, color: "#546E7A", fontWeight: "500" },
  logout:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#ECEFF1", gap: 10 },
  logoutTxt: { fontSize: 14, color: Colors.alertRed, fontWeight: "600" },
});

// ─── Tab screen with animated drawer overlay ─────────────────────────────────
function PatientTabsWithDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim   = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  function openDrawer() {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: -DRAWER_W, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,         duration: 240, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  }

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={{ flex: 1 }}>
        <PatientTabs />

        {drawerOpen && (
          <>
            {/* Semi-transparent backdrop — tapping closes the drawer */}
            <TouchableWithoutFeedback onPress={closeDrawer}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  { backgroundColor: "rgba(0,0,0,0.45)", opacity: overlayAnim },
                ]}
              />
            </TouchableWithoutFeedback>

            {/* Sliding panel */}
            <Animated.View
              style={[
                p.panel,
                { transform: [{ translateX: slideAnim }] },
              ]}
            >
              <PatientSideDrawer onClose={closeDrawer} />
            </Animated.View>
          </>
        )}
      </View>
    </DrawerContext.Provider>
  );
}

const p = StyleSheet.create({
  panel: {
    position:        "absolute",
    left: 0, top: 0, bottom: 0,
    width:           DRAWER_W,
    shadowColor:     "#000",
    shadowOffset:    { width: 4, height: 0 },
    shadowOpacity:   0.18,
    shadowRadius:    12,
    elevation:       16,
  },
});

// ─── Stack navigator (exported as PatientDrawer to match RootNavigator) ───────
export function PatientDrawer() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
      <Stack.Screen name="Main"               component={PatientTabsWithDrawer} />
      <Stack.Screen name="AdherenceDashboard" component={AdherenceDashboardScreen} />
      <Stack.Screen name="Vitals"             component={VitalsScreen} />
      <Stack.Screen name="Vaccination"        component={VaccinationScreen} />
      <Stack.Screen name="DrugInteractions"   component={DrugInteractionScreen} />
      <Stack.Screen name="ExpiryAlerts"       component={ExpiryAlertScreen} />
      <Stack.Screen name="SubstituteFinder"   component={SubstituteFinderScreen} />
      <Stack.Screen name="MedicineHistory"    component={MedicineHistoryScreen} />
      <Stack.Screen name="SideEffects"        component={SideEffectsScreen} />
      <Stack.Screen name="AIAssistant"        component={AIAssistantScreen} />
      <Stack.Screen name="PrescriptionUpload" component={PrescriptionUploadScreen} />
      <Stack.Screen name="PharmacyMap"        component={PharmacyMapScreen} />
      <Stack.Screen name="FamilyProfiles"     component={FamilyProfilesScreen} />
      <Stack.Screen name="HealthProfile"      component={HealthProfileScreen} />
      <Stack.Screen name="MissedDose"         component={MissedDoseScreen} />
      <Stack.Screen name="MissedDoseInsights" component={MissedDoseInsightsScreen} />
      <Stack.Screen name="TravelMode"         component={TravelModeScreen} />
      <Stack.Screen name="EmergencySOS"       component={EmergencySOSScreen} />
      <Stack.Screen name="DisposalGuide"      component={DisposalGuideScreen} />
      <Stack.Screen name="DoctorReport"       component={DoctorReportScreen} />
      <Stack.Screen name="ExportData"         component={ExportDataScreen} />
      <Stack.Screen name="NotificationPrefs"  component={NotificationPrefsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="DailyLog"           component={DailyLogScreen} />
      <Stack.Screen name="WellnessProgress"   component={WellnessProgressScreen} />
    </Stack.Navigator>
  );
}
