import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { getCatalog } from "@/api/survey";
import { Icon, Loading, Message } from "@/components/ui";
import { addItem } from "@/lib/store";
import type { CatalogItem } from "@/lib/types";
import { dimsText } from "@/lib/units";
import { C, R } from "@/theme";

/** Pick furniture from the AI's item list (typical sizes), or type something else. */
export default function AddItem() {
  const { id, roomId } = useLocalSearchParams<{ id: string; roomId: string }>();
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [q, setQ] = useState("");
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    getCatalog().then(setCatalog);
  }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (catalog ?? []).filter((c) => !t || c.label.toLowerCase().includes(t));
  }, [catalog, q]);

  const pick = (c: CatalogItem) => {
    addItem(id, roomId, c);
    setAdded((a) => [...a, c.label]);
  };

  /** Something not in the list: added at a 50 cm cube, then the size screen opens. */
  const addCustom = () => {
    const label = q.trim();
    if (!label) return;
    const itemId = addItem(id, roomId, { key: "custom", label, typical: [0.5, 0.5, 0.5] });
    router.replace({ pathname: "/survey/[id]/item/[roomId]/[itemId]", params: { id, roomId, itemId } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }} edges={["bottom"]}>
      <View style={st.searchWrap}>
        <Icon name="search" size={18} color={C.muted} />
        <TextInput style={st.search} value={q} onChangeText={setQ} placeholder="Search furniture (e.g. sofa)" placeholderTextColor={C.faint} autoFocus returnKeyType="done" />
      </View>
      {added.length > 0 && (
        <View style={st.added}>
          <Icon name="checkmark-circle" size={18} color={C.green} />
          <Text style={st.addedText} numberOfLines={2}>Added: {added.join(", ")}</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={st.done}>Done</Text>
          </Pressable>
        </View>
      )}
      {catalog === null ? (
        <Loading />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(c) => c.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={
            q.trim() ? (
              <Pressable onPress={addCustom} style={({ pressed }) => [st.row, st.custom, pressed && { opacity: 0.8 }]}>
                <Icon name="add-circle" color={C.primary} size={24} />
                <View style={{ flex: 1 }}>
                  <Text style={st.name}>Add “{q.trim()}”</Text>
                  <Text style={st.sub}>Not in the list? Add it and enter the size</Text>
                </View>
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={!catalog.length ? <Message icon="cloud-offline-outline" title="Couldn't load the item list" text="Check your internet, or type the item name above to add it." /> : undefined}
          renderItem={({ item: c }) => (
            <Pressable onPress={() => pick(c)} style={({ pressed }) => [st.row, pressed && { backgroundColor: C.tint }]} accessibilityRole="button" accessibilityLabel={`Add ${c.label}`}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{c.label}</Text>
                <Text style={st.sub}>Typical {dimsText(c.typical)}</Text>
              </View>
              <Icon name="add" color={C.primary} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, marginBottom: 8, paddingHorizontal: 12, borderWidth: 1.5, borderColor: C.border, borderRadius: R.md },
  search: { flex: 1, minHeight: 48, fontSize: 16, color: C.text },
  added: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 6, padding: 10, borderRadius: R.sm, backgroundColor: C.greenTint },
  addedText: { flex: 1, color: C.green, fontSize: 13, fontWeight: "600" },
  done: { color: C.primary, fontWeight: "800", fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  custom: { backgroundColor: C.tint },
  name: { fontSize: 16, fontWeight: "700", color: C.text },
  sub: { fontSize: 13, color: C.muted, marginTop: 1 },
});
