import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { Item } from "@/lib/types";
import { cft, dimsText, itemM3 } from "@/lib/units";
import { C, R } from "@/theme";
import { Icon, IconButton } from "./ui";

const CHECK: Partial<Record<Item["confidence"], [string, string]>> = {
  medium: ["Check size", C.amber],
  low: ["Estimate – please check", C.red],
};

/** One item: photo with the AI outline, name, size, cft, edit and delete. */
export default function ItemRow({ item, onEdit, onDelete, readOnly }: { item: Item; onEdit: () => void; onDelete: () => void; readOnly?: boolean }) {
  const check = CHECK[item.confidence];
  return (
    <View style={st.row}>
      <View style={st.thumb}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`Photo of ${item.label}`} />
        ) : (
          <Icon name="cube-outline" size={26} color={C.primary} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={st.name} numberOfLines={2}>
          {item.label}
          {item.qty > 1 ? <Text style={st.qty}>  × {item.qty}</Text> : null}
        </Text>
        <Text style={st.dims}>{dimsText(item.dims)}</Text>
        {check ? <Text style={[st.check, { color: check[1] }]}>{check[0]}</Text> : item.confidence === "manual" ? <Text style={st.check}>Added by hand</Text> : null}
        {item.comment ? <Text style={st.comment} numberOfLines={1}>“{item.comment}”</Text> : null}
      </View>
      <View style={st.vol}>
        <Text style={st.volText}>{cft(itemM3(item))}</Text>
      </View>
      {!readOnly && (
        <View style={{ gap: 6 }}>
          <IconButton name="pencil" label={`Edit ${item.label}`} onPress={onEdit} size={34} />
          <IconButton name="trash-outline" label={`Delete ${item.label}`} onPress={onDelete} size={34} color={C.red} bg={C.redTint} />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: 10 },
  thumb: { width: 68, height: 68, borderRadius: 10, backgroundColor: C.tint, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "800", color: C.text },
  qty: { color: C.primary },
  dims: { fontSize: 13, color: C.muted },
  check: { fontSize: 12, fontWeight: "700", color: C.muted },
  comment: { fontSize: 12, color: C.muted, fontStyle: "italic" },
  vol: { backgroundColor: C.tint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  volText: { fontSize: 13, fontWeight: "800", color: C.primaryDark },
});
