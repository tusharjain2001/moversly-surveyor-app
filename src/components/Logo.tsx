import { Text, View } from "react-native";
import { C } from "@/theme";

/** Placeholder logo in the design's style (purple "M" badge + Moversly). Swap for the real logo file. */
export default function Logo({ size = 18 }: { size?: number }) {
  const badge = size * 1.45;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }} accessibilityLabel="Moversly">
      <View style={{ width: badge, height: badge, borderRadius: badge / 2, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.white, fontWeight: "900", fontSize: size * 0.95 }}>M</Text>
      </View>
      <Text style={{ color: C.text, fontWeight: "800", fontSize: size, letterSpacing: -0.2 }}>
        Moversly<Text style={{ color: C.primary }}>.</Text>
      </Text>
    </View>
  );
}
