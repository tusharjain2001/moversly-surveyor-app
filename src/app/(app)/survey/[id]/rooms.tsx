import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { roomIcon } from "@/components/roomIcon";
import { Button, H1, Icon, IconButton, Message, Muted } from "@/components/ui";
import { isBusy, nextRoom } from "@/lib/flow";
import { addRoom, setRoomSelected, useSurvey } from "@/lib/store";
import type { Room } from "@/lib/types";
import { cft, roomCount, roomM3 } from "@/lib/units";
import { C, R } from "@/theme";

export default function RoomsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const survey = useSurvey(id);
  const [newName, setNewName] = useState("");
  if (!survey) return <Message title="Survey not found" text="Go back and open the customer again." />;

  const locked = survey.status === "submitted";
  const selected = survey.rooms.filter((r) => r.selected);
  const next = nextRoom(survey);
  const anyDone = survey.rooms.some((r) => r.status === "done" || isBusy(r));

  const openRoom = (r: Room) => router.push({ pathname: "/survey/[id]/room/[roomId]", params: { id, roomId: r.id } });
  const onRow = (r: Room) => {
    if (r.status !== "empty" || locked) openRoom(r);
    else setRoomSelected(id, r.id, !r.selected);
  };
  const add = () => {
    if (!newName.trim()) return;
    addRoom(id, newName);
    setNewName("");
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton name="mic-outline" label="Discussion notes" onPress={() => router.push({ pathname: "/survey/[id]/notes", params: { id } })} />
          ),
        }}
      />
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <View>
          <H1>Select rooms to survey</H1>
          <Muted>Tick the rooms to scan. Tap a scanned room to see its items.</Muted>
        </View>

        <View style={st.list}>
          {survey.rooms.map((r, i) => (
            <RoomRow key={r.id} room={r} last={i === survey.rooms.length - 1} onPress={() => onRow(r)} />
          ))}
        </View>

        {!locked && (
          <View style={st.addRow}>
            <TextInput
              style={st.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Add another room (e.g. Bedroom 3)"
              placeholderTextColor={C.faint}
              returnKeyType="done"
              onSubmitEditing={add}
            />
            <IconButton name="add" label="Add room" onPress={add} color={C.white} bg={C.primary} size={48} />
          </View>
        )}
      </ScrollView>

      <View style={st.foot}>
        {next && !locked ? (
          <Button title={`Start scanning – ${next.name}`} icon="camera-outline" onPress={() => openRoom(next)} />
        ) : (
          <Button
            title={selected.length ? "Survey summary" : "Tick at least one room"}
            iconRight="arrow-forward"
            disabled={!selected.length}
            onPress={() => router.push({ pathname: "/survey/[id]/summary", params: { id } })}
          />
        )}
        {next && anyDone && !locked && (
          <Button title="Survey summary" kind="ghost" small onPress={() => router.push({ pathname: "/survey/[id]/summary", params: { id } })} />
        )}
      </View>
    </SafeAreaView>
  );
}

function RoomRow({ room, last, onPress }: { room: Room; last: boolean; onPress: () => void }) {
  const n = roomCount(room);
  const sub =
    room.status === "done" ? `${n} item${n === 1 ? "" : "s"} · ${cft(roomM3(room))}${room.manual ? " · added by hand" : ""}`
    : room.status === "uploading" ? `Uploading ${Math.round(room.progress * 100)}%`
    : room.status === "processing" ? "AI is measuring…"
    : room.status === "error" ? "Didn't work – tap to try again"
    : room.selected ? "To scan" : "Not included";
  const subColor = room.status === "error" ? C.red : room.status === "done" ? C.green : C.muted;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.row, !last && st.rowLine, pressed && { backgroundColor: C.tint }]} accessibilityRole={room.status === "empty" ? "checkbox" : "button"} accessibilityState={{ checked: room.selected }}>
      <View style={st.rowIcon}>
        <Icon name={roomIcon(room.name)} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.rowName}>{room.name}</Text>
        <Text style={[st.rowSub, { color: subColor }]}>{sub}</Text>
      </View>
      {room.status === "empty" ? (
        <View style={[st.check, room.selected && st.checkOn]}>{room.selected && <Icon name="checkmark" size={16} color={C.white} />}</View>
      ) : room.status === "done" ? (
        <Icon name="checkmark-circle" size={24} color={C.green} />
      ) : room.status === "error" ? (
        <Icon name="alert-circle" size={24} color={C.red} />
      ) : (
        <Icon name="hourglass-outline" size={22} color={C.primary} />
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 16, gap: 16, paddingBottom: 24 },
  list: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" },
  rowName: { fontSize: 16, fontWeight: "700", color: C.text },
  rowSub: { fontSize: 13, marginTop: 1 },
  check: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: C.faint, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  addRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: { flex: 1, minHeight: 48, borderWidth: 1.5, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 14, fontSize: 15, color: C.text, backgroundColor: C.white },
  foot: { padding: 16, paddingTop: 10, gap: 4, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
});
