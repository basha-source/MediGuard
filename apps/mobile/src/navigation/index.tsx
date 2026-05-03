import { NavigationContainer }  from "@react-navigation/native";
import { View, ActivityIndicator } from "react-native";
import { AuthStack }           from "./AuthStack";
import { PatientTabs }         from "./PatientTabs";
import { CareGuardianTabs }    from "./CareGuardianTabs";
import { useAuthStore }        from "@/store/authStore";
import { useAuth }             from "@/hooks/useAuth";
import { Colors }              from "@mediguard/shared";

export function RootNavigator() {
  const { user, loading } = useAuthStore();
  useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user
        ? <AuthStack />
        : user.role === "careGuardian"
        ? <CareGuardianTabs />
        : <PatientTabs />
      }
    </NavigationContainer>
  );
}
