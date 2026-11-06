import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Icon, IconButton, Message, Muted } from "@/components/ui";
import { confirm } from "@/lib/confirm";
import { removeItem, updateItem, useSurvey } from "@/lib/store";
import type { Dims } from "@/lib/types";
import { toCm, toFt3 } from "@/lib/units";
import { C, R } from "@/theme";

const NAMES = ["Length", "Width", "Height"] as const;

/** Edit one item: quantity, size in cm, notes. Volume is worked out from the size. */
export default function EditItem() {
  const { id, roomId, itemId } = useLocalSearchParams<{ id: string; roomId: string; itemId: string }>();
  const survey = useSurvey(id);
  const item = survey?.rooms.find((r) => r.id === roomId)?.items.find((it) => it.id === itemId);

  const [name, setName] = useState(item?.label ?? "");
  const [qty, setQty] = useState(item?.qty ?? 1);
  const [cm, setCm] = useState<string[]>(item ? item.dims.map((m) => String(toCm(m))) : ["", "", ""]);
  const [comment, setComment] = useState(item?.comment ?? "");
  const [error, setError] = useState("");

  if (!item) return <Message title="Item not found" action={<Button title="Back" kind="outline" small onPress={() => router.back()} />} />;

  const nums = cm.map((v) => Number(v.replace(",", ".")));
  const valid = nums.every((n) => Number.isFinite(n) && n > 0 && n <= 2000);
  const volFt3 = valid ? toFt3((nums[0] / 100) * (nums[1] / 100) * (nums[2] / 100) * qty) : 0;

  const save = () => {
    if (!name.trim()) return setError("Please give the item a name.");
    if (!valid) return setError("Please enter each size in cm (between 1 and 2000).");
    const dims = nums.map((n) => n / 100) as Dims;
    const sizeChanged = dims.some((d, i) => toCm(d) !== toCm(item.dims[i]));
    updateItem(id, roomId, itemId, {
      label: name.trim(),
      qty,
      dims,
      comment: comment.trim() || undefined,
      // A size the surveyor typed in is no longer an AI guess.
      ...(sizeChanged && item.confidence !== "manual" ? { confidence: "high" as const, notes: [] } : {}),
    });
    router.back();
  };

  const del = async () => {
    if (await confirm(`Delete ${item.label}?`, "It will be removed from this room.", "Delete", true)) {
      removeItem(id, roomId, itemId);
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
          <View style={st.head}>
            <View style={st.thumb}>
              {item.thumbnail ? <Image source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name="cube-outline" size={30} color={C.primary} />}
            </View>
            <TextInput style={[st.input, st.nameInput]} value={name} onChangeText={setName} placeholder="Item name" placeholderTextColor={C.faint} />
          </View>

          <View style={st.line}>
            <Text style={st.label}>Quantity</Text>
            <View style={st.stepper}>
              <IconButton name="remove" label="Fewer" onPress={() => setQty((q) => Math.max(1, q - 1))} size={38} />
              <Text style={st.qty}>{qty}</Text>
              <IconButton name="add" label="More" onPress={() => setQty((q) => Math.min(99, q + 1))} size={38} />
            </View>
          </View>

          {NAMES.map((n, i) => (
            <View key={n} style={st.line}>
              <Text style={st.label}>{n} (cm)</Text>
              <TextInput
                style={[st.input, st.num]}
                value={cm[i]}
                onChangeText={(v) => setCm((c) => c.map((x, j) => (j === i ? v.replace(/[^0-9.,]/g, "") : x)))}
                keyboardType="decimal-pad"
                selectTextOnFocus
                accessibilityLabel={`${n} in centimetres`}
              />
            </View>
          ))}

          <View style={st.line}>
            <Text style={st.label}>Volume (cft)</Text>
            <View style={[st.num, st.volBox]}>
              <Text style={st.vol}>{valid ? volFt3.toFixed(1) : "–"}</Text>
              <Icon name="calculator-outline" size={18} color={C.primary} />
            </View>
          </View>
          {qty > 1 && valid && <Muted style={{ textAlign: "right", marginTop: -6 }}>{(volFt3 / qty).toFixed(1)} cft each × {qty}</Muted>}

          <Text style={[st.label, { marginTop: 6 }]}>Notes (optional)</Text>
          <TextInput
            style={[st.input, st.notes]}
            value={comment}
            onChangeText={setComment}
            placeholder="e.g. Fabric sofa, good condition"
            placeholderTextColor={C.faint}
            multiline
            textAlignVertical="top"
          />

          {error ? <Text style={st.error}>{error}</Text> : null}
          <Button title="Delete item" kind="ghost" icon="trash-outline" onPress={del} style={{ alignSelf: "center" }} small />
        </ScrollView>
        <View style={st.foot}>
          <Button title="Cancel" kind="outline" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button title="Update" onPress={save} style={{ flex: 1 }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 16, gap: 14, paddingBottom: 24 },
  head: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  thumb: { width: 76, height: 76, borderRadius: 12, backgroundColor: C.tint, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  nameInput: { flex: 1, fontSize: 17, fontWeight: "800" },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 15, color: C.text, fontWeight: "600" },
  input: { minHeight: 48, borderWidth: 1.5, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 12, fontSize: 16, color: C.text, backgroundColor: C.white },
  num: { width: 150, textAlign: "left" },
  volBox: { minHeight: 48, borderWidth: 1.5, borderColor: C.primary, borderRadius: R.sm, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.tint },
  vol: { fontSize: 16, fontWeight: "800", color: C.primaryDark },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14 },
  qty: { fontSize: 18, fontWeight: "800", color: C.text, minWidth: 24, textAlign: "center" },
  notes: { minHeight: 90, paddingTop: 12 },
  error: { color: C.red, fontSize: 14 },
  foot: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
});
