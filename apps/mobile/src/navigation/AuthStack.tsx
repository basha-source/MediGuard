import { createStackNavigator } from "@react-navigation/stack";
import { SplashScreen }           from "@/screens/onboarding/SplashScreen";
import { Onboarding1Screen }      from "@/screens/onboarding/Onboarding1Screen";
import { Onboarding2Screen }      from "@/screens/onboarding/Onboarding2Screen";
import { Onboarding3Screen }      from "@/screens/onboarding/Onboarding3Screen";
import { LoginScreen }            from "@/screens/auth/LoginScreen";
import { RoleSelectionScreen }    from "@/screens/auth/RoleSelectionScreen";
import { HealthConditionsScreen } from "@/screens/auth/HealthConditionsScreen";

export type AuthStackParams = {
  Splash:           undefined;
  Onboarding1:      undefined;
  Onboarding2:      undefined;
  Onboarding3:      undefined;
  Login:            undefined;
  RoleSelection:    undefined;
  HealthConditions: { role: "patient" | "careGuardian" };
};

const Stack = createStackNavigator<AuthStackParams>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash"            component={SplashScreen} />
      <Stack.Screen name="Onboarding1"       component={Onboarding1Screen} />
      <Stack.Screen name="Onboarding2"       component={Onboarding2Screen} />
      <Stack.Screen name="Onboarding3"       component={Onboarding3Screen} />
      <Stack.Screen name="Login"             component={LoginScreen} />
      <Stack.Screen name="RoleSelection"     component={RoleSelectionScreen} />
      <Stack.Screen name="HealthConditions"  component={HealthConditionsScreen} />
    </Stack.Navigator>
  );
}
