import { NavigationContainer } from "@react-navigation/native";
import { AuthStack } from "./AuthStack";
import { PatientTabs } from "./PatientTabs";
import { CareGuardianTabs } from "./CareGuardianTabs";
import { useAuthStore } from "@/store/authStore";

export function RootNavigator() {
  const { user } = useAuthStore();

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
