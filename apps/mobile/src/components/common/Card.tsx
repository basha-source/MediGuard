import { View, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "@mediguard/shared";

type Props = { children: React.ReactNode; style?: ViewStyle };

export function Card({ children, style }: Props) {
  return <View style={[s.card, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
});
