import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator }     from "@react-navigation/stack";
import { Colors }                   from "@mediguard/shared";
import { Text }                     from "react-native";

import { HomeScreen }               from "@/screens/patient/HomeScreen";
import { MedicineInventoryScreen }  from "@/screens/patient/MedicineInventoryScreen";
import { MedicineDetailScreen }     from "@/screens/patient/MedicineDetailScreen";
import { ScannerScreen }            from "@/screens/patient/ScannerScreen";
import { DoseTrackerScreen }        from "@/screens/patient/DoseTrackerScreen";
import { ProfileScreen }            from "@/screens/patient/ProfileScreen";

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"           component={HomeScreen} />
    </Stack.Navigator>
  );
}

function InventoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Inventory"      component={MedicineInventoryScreen} />
      <Stack.Screen name="MedicineDetail" component={MedicineDetailScreen} />
    </Stack.Navigator>
  );
}

export function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { height: 84, paddingBottom: 12 },
        tabBarLabel: ({ color }) => (
          <Text style={{ fontSize: 10, color }}>{route.name}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home"      component={HomeStack} />
      <Tab.Screen name="Inventory" component={InventoryStack} />
      <Tab.Screen name="Scan"      component={ScannerScreen} />
      <Tab.Screen name="Tracker"   component={DoseTrackerScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}
