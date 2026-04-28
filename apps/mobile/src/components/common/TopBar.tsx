import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Colors } from "@mediguard/shared";

type Props = { title: string; showBack?: boolean };

export function TopBar({ title, showBack = false }: Props) {
  const navigation = useNavigation();
  return (
    <View style={s.bar}>
      {showBack && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backTxt}>← Back</Text>
        </TouchableOpacity>
      )}
      <Text style={s.title}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar:     { backgroundColor: Colors.primary, height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  back:    { marginRight: 12 },
  backTxt: { color: Colors.white, fontSize: 13 },
  title:   { color: Colors.white, fontSize: 17, fontWeight: "600" },
});
