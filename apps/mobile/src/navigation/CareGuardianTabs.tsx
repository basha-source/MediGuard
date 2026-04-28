import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Colors }                   from "@mediguard/shared";
import { Text }                     from "react-native";

import { CGDashboardScreen }        from "@/screens/careGuardian/CGDashboardScreen";
import { CGPatientMonitorScreen }   from "@/screens/careGuardian/CGPatientMonitorScreen";
import { CGAlertScreen }            from "@/screens/careGuardian/CGAlertScreen";
import { ProfileScreen }            from "@/screens/patient/ProfileScreen";

const Tab = createBottomTabNavigator();

export function CareGuardianTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   Colors.greenDark,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { height: 84, paddingBottom: 12 },
        tabBarLabel: ({ color }) => (
          <Text style={{ fontSize: 10, color }}>{route.name}</Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={CGDashboardScreen} />
      <Tab.Screen name="Monitor"   component={CGPatientMonitorScreen} />
      <Tab.Screen name="Alerts"    component={CGAlertScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}
