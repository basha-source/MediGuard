import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Colors }                   from "@mediguard/shared";
import { Text, View, StyleSheet }   from "react-native";
import { Ionicons }                 from "@expo/vector-icons";

import { CGDashboardScreen }        from "@/screens/careGuardian/CGDashboardScreen";
import { CGPatientMonitorScreen }   from "@/screens/careGuardian/CGPatientMonitorScreen";
import { CGAlertScreen }            from "@/screens/careGuardian/CGAlertScreen";
import { ProfileScreen }            from "@/screens/patient/ProfileScreen";

const Tab = createBottomTabNavigator();

type IconSet = { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap };

const TAB_ICONS: Record<string, IconSet> = {
  Dashboard: { active: "grid",          inactive: "grid-outline"          },
  Monitor:   { active: "eye",           inactive: "eye-outline"           },
  Alerts:    { active: "notifications", inactive: "notifications-outline" },
  Profile:   { active: "person",        inactive: "person-outline"        },
};

export function CareGuardianTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const icons = TAB_ICONS[route.name];
        return {
          headerShown: false,
          tabBarActiveTintColor:   Colors.greenDark,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: ts.bar,
          tabBarLabel: ({ focused, color }) => (
            <Text style={[ts.label, { color, fontWeight: focused ? "700" : "400" }]}>
              {route.name}
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <View style={[ts.iconWrap, focused && ts.iconWrapActive]}>
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={22}
                color={focused ? Colors.white : Colors.textSecondary}
              />
            </View>
          ),
        };
      }}
    >
      <Tab.Screen name="Dashboard" component={CGDashboardScreen} />
      <Tab.Screen name="Monitor"   component={CGPatientMonitorScreen} />
      <Tab.Screen name="Alerts"    component={CGAlertScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const ts = StyleSheet.create({
  bar: {
    height: 88,
    paddingBottom: 8,
    paddingTop: 6,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  iconWrap: {
    width: 52,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: Colors.greenDark,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
});
