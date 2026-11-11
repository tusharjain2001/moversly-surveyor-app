import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Icon, IconButton, Message, Muted } from "@/components/ui";
import { confirm } from "@/lib/confirm";
import { removeItem, updateItem, useSurvey } from "@/lib/store";
import type { Dims } from "@/lib/types";
import { toCm, toFt3, unitM3 } from "@/lib/units";
import { C, R } from "@/theme";

const NAMES = ["Length", "Width", "Height"] as const;
const toNum = (v: string) => Number(v.replace(",", "."));
const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);
const clean = (v: string) => v.replace(/[^0-9.,]/g, "");

/** Edit one item: quantity, size in cm, volume, notes. The volume follows the size (plus the packing
 *  allowance on scanned items, which is not shown: client, 2026-11-11) until the surveyor types a cft
 *  of their own; changing a size again goes back to the size-based volume. */
export default function EditItem() {
  const { id, roomId, itemId } = useLocalSearchParams<{ id: string; roomId: string; itemId: string }>();
  const survey = useSurvey(id);
  const item = survey?.rooms.find((r) => r.id === roomId)?.items.find((it) => it.id === itemId);
  const extra = item?.extraFt3 ?? 0;

  const [name, setName] = useState(item?.label ?? "");
  const [qty, setQty] = useState(item?.qty ?? 1);
  const [cm, setCm] = useState<string[]>(item ? item.dims.map((m) => String(toCm(m))) : ["", "", ""]);
  const [typed, setTyped] = useState(item?.typedFt3 != null);
  const [cftText, setCftText] = useState(item ? oneDecimal(toFt3(unitM3(item))) : "");
  const [comment, setComment] = useState(item?.comment ?? "");
  const [error, setError] = useState("");

  if (!item) return <Message title="Item not found" action={<Button title="Back" kind="outline" small onPress={() => router.back()} />} />;

  const nums = cm.map(toNum);
  const valid = nums.every((n) => Number.isFinite(n) && n > 0 && n <= 2000);
  /** cft of one unit from the size, plus the packing allowance. */
  const sizeFt3 = (c: number[]) => toFt3((c[0] / 100) * (c[1] / 100) * (c[2] / 100)) + extra;
  const each = toNum(cftText);
  const cftValid = Number.isFinite(each) && each > 0 && each <= 5000;

  const setSize = (i: number, v: string) => {
    const next = cm.map((x, j) => (j === i ? clean(v) : x));
    setCm(next);
    const n = next.map(toNum);
    setTyped(false);
    setCftText(n.every((x) => Number.isFinite(x) && x > 0) ? oneDecimal(sizeFt3(n)) : "");
  };
  const setCft = (v: string) => {
    setCftText(clean(v));
    setTyped(true);
  };
  const useSize = () => {
    setTyped(false);
    setCftText(valid ? oneDecimal(sizeFt3(nums)) : "");
  };

  const save = () => {
    if (!name.trim()) return setError("Please give the item a name.");
    if (!valid) return setError("Please enter each size in cm (between 1 and 2000).");
    if (typed && !cftValid) return setError("Please enter the volume in cft (more than 0).");
    const dims = nums.map((n) => n / 100) as Dims;
    const sizeChanged = dims.some((d, i) => toCm(d) !== toCm(item.dims[i]));
    updateItem(id, roomId, itemId, {
      label: name.trim(),
      qty,
      dims,
      typedFt3: typed ? Math.round(each * 10) / 10 : undefined,
      comment: comment.trim() || undefined,
      // A size or volume the surveyor typed in is no longer an AI guess.
      ...((sizeChanged || typed) && item.confidence !== "manual" ? { confidence: "high" as const, notes: [] } : {}),
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
                onChangeText={(v) => setSize(i, v)}
                keyboardType="decimal-pad"
                selectTextOnFocus
                accessibilityLabel={`${n} in centimetres`}
              />
            </View>
          ))}

          <View style={st.line}>
            <Text style={st.label}>{qty > 1 ? "Volume each (cft)" : "Volume (cft)"}</Text>
            <View style={[st.num, st.volBox]}>
              <TextInput
                style={st.vol}
                value={cftText}
                onChangeText={setCft}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholder="–"
                placeholderTextColor={C.faint}
                accessibilityLabel="Volume in cubic feet"
              />
              <Icon name="pencil" size={16} color={C.primary} />
            </View>
          </View>
          {typed ? (
            <Pressable onPress={useSize} hitSlop={8} style={{ alignSelf: "flex-end", marginTop: -6 }} accessibilityRole="button">
              <Text style={st.link}>Volume typed by you · Use the size instead</Text>
            </Pressable>
          ) : (
            <Muted style={st.right}>Tap to type the volume yourself</Muted>
          )}
          {qty > 1 && cftValid && <Muted style={st.right}>{oneDecimal(each)} cft × {qty} = {oneDecimal(each * qty)} cft</Muted>}

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
  vol: { flex: 1, minHeight: 44, fontSize: 16, fontWeight: "800", color: C.primaryDark, padding: 0 },
  right: { textAlign: "right", marginTop: -6, fontSize: 13 },
  link: { color: C.primary, fontWeight: "700", fontSize: 13 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14 },
  qty: { fontSize: 18, fontWeight: "800", color: C.text, minWidth: 24, textAlign: "center" },
  notes: { minHeight: 90, paddingTop: 12 },
  error: { color: C.red, fontSize: 14 },
  foot: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
});
