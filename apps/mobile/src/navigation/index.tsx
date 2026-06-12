import { useEffect }                from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { View, ActivityIndicator }  from "react-native";
import Constants                    from "expo-constants";
import { AuthStack }                from "./AuthStack";
import { PatientDrawer }            from "./PatientDrawer";
import { CareGuardianDrawer }       from "./CareGuardianDrawer";
import { useAuthStore }             from "@/store/authStore";
import { useAuth }                  from "@/hooks/useAuth";
import { Colors }                   from "@mediguard/shared";

const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";

export const navigationRef = createNavigationContainerRef<any>();

export function RootNavigator() {
  const { user, loading } = useAuthStore();
  useAuth();

  useEffect(() => {
    if (IS_EXPO_GO) return;
    let Notifs: typeof import("expo-notifications") | null = null;
    try {
      Notifs = require("expo-notifications");
    } catch {
      return;
    }
    if (!Notifs) return;

    const responseSub = Notifs.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as {
        screen?: string;
        medicineId?: string;
        type?: string;
      };
      const actionId = response.actionIdentifier;

      if (!navigationRef.isReady()) return;

      // "Mark as Taken" action button → go to MissedDose
      if (actionId === "MARK_TAKEN") {
        navigationRef.navigate("MissedDose");
        return;
      }

      // Default tap → navigate to the screen stored in notification data
      const target = data?.screen;
      if (target) {
        navigationRef.navigate(target as never);
      }
    });

    return () => responseSub.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {!user
        ? <AuthStack />
        : user.role === "careGuardian"
        ? <CareGuardianDrawer />
        : <PatientDrawer />
      }
    </NavigationContainer>
  );
}
