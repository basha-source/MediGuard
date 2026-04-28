import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "@mediguard/shared";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = "primary", style }: Props) {
  return (
    <TouchableOpacity
      style={[variant === "primary" ? s.primary : s.secondary, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={variant === "primary" ? s.primaryTxt : s.secondaryTxt}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  primary:      { backgroundColor: Colors.primary, borderRadius: 26, paddingVertical: 16, alignItems: "center" },
  secondary:    { backgroundColor: Colors.primaryPale, borderRadius: 26, paddingVertical: 16, alignItems: "center" },
  primaryTxt:   { color: Colors.white, fontWeight: "600", fontSize: 15 },
  secondaryTxt: { color: Colors.primary, fontWeight: "600", fontSize: 15 },
});
