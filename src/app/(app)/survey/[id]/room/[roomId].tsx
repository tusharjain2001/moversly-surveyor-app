import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import ItemRow from "@/components/ItemRow";
import { Button, Card, H1, Icon, Message, Muted, ProgressBar } from "@/components/ui";
import { confirm } from "@/lib/confirm";
import { isBusy, nextRoom } from "@/lib/flow";
import { removeItem, resetRoom, useSurvey } from "@/lib/store";
import { cft, roomCount, roomM3 } from "@/lib/units";
import { C, R } from "@/theme";

const TIPS = [
  "Walk slowly around the room (20–60 seconds)",
  "Keep each item in view for a moment",
  "Include a door – it helps measure sizes",
  "Point slightly down so the floor shows",
];

export default function RoomScreen() {
  const { id, roomId } = useLocalSearchParams<{ id: string; roomId: string }>();
  const survey = useSurvey(id);
  const room = survey?.rooms.find((r) => r.id === roomId);
  if (!survey || !room) return <Message title="Room not found" />;

  const locked = survey.status === "submitted";
  const next = nextRoom(survey, room.id);
  const count = roomCount(room);
  // Items can be added at any time, also while the video uploads or is measured (they stay when the AI's items arrive).
  const showItems = room.status === "done" || room.items.length > 0;

  const record = () => router.push({ pathname: "/survey/[id]/record/[roomId]", params: { id, roomId } });
  const addItems = () => router.push({ pathname: "/survey/[id]/add/[roomId]", params: { id, roomId } });
  const goNext = () =>
    next
      ? router.replace({ pathname: "/survey/[id]/room/[roomId]", params: { id, roomId: next.id } })
      : router.push({ pathname: "/survey/[id]/summary", params: { id } });

  const rescan = async () => {
    const msg = room.manual ? "This removes the items you added in this room." : "This removes the items found in this room so you can record it again.";
    if (await confirm(room.manual ? "Start over?" : "Rescan this room?", msg, room.manual ? "Start over" : "Rescan", true)) resetRoom(id, roomId);
  };
  const del = async (itemId: string, label: string) => {
    if (await confirm(`Delete ${label}?`, "It will be removed from this room.", "Delete", true)) removeItem(id, roomId, itemId);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={st.wrap}>
        <View>
          <H1>{room.status === "done" ? `${room.name} – Items` : `Scan – ${room.name}`}</H1>
          {showItems && (
            <Muted>
              {count} item{count === 1 ? "" : "s"} · {cft(roomM3(room))}
              {room.manual ? " · added by hand" : isBusy(room) ? " so far" : ""}
            </Muted>
          )}
        </View>

        {(room.status === "empty" || room.status === "error") && (
          <>
            {room.status === "error" && (
              <View style={st.alert}>
                <Icon name="alert-circle" color={C.red} />
                <Text style={st.alertText}>{room.error}</Text>
              </View>
            )}
            <Card style={{ gap: 10 }}>
              <Text style={st.tipsTitle}>How to record</Text>
              {TIPS.map((t) => (
                <View key={t} style={st.tip}>
                  <Icon name="checkmark-circle-outline" size={18} color={C.primary} />
                  <Text style={st.tipText}>{t}</Text>
                </View>
              ))}
            </Card>
            {!locked && (
              <>
                <Button title="Record the room" icon="videocam" onPress={record} />
                {room.items.length === 0 && <Button title="Add items without recording" kind="outline" icon="add" onPress={addItems} />}
              </>
            )}
          </>
        )}

        {isBusy(room) && (
          <Card style={{ gap: 12 }}>
            <View style={st.busyHead}>
              <Icon name={room.status === "uploading" ? "cloud-upload-outline" : "sparkles-outline"} size={24} color={C.primary} />
              <Text style={st.busyTitle}>{room.status === "uploading" ? "Uploading video…" : "AI is measuring the furniture…"}</Text>
            </View>
            <ProgressBar value={room.progress} />
            <Muted>{room.stage || "Please wait"} · {Math.round(room.progress * 100)}%</Muted>
            <Muted>You can add items by hand or scan the next room while this one is measured. The first scan of the day can take a minute longer.</Muted>
          </Card>
        )}

        {showItems && (
          <View style={{ gap: 10 }}>
            {room.status === "done" && room.items.length === 0 && <Message icon="cube-outline" title="No items in this room" text="Add items or rescan the room." />}
            {room.items.map((it) => (
              <ItemRow
                key={it.id}
                item={it}
                readOnly={locked}
                onEdit={() => router.push({ pathname: "/survey/[id]/item/[roomId]/[itemId]", params: { id, roomId, itemId: it.id } })}
                onDelete={() => del(it.id, it.label)}
              />
            ))}
            {!locked && <Button title="Add item" kind="outline" icon="add" onPress={addItems} />}
          </View>
        )}
        {!locked && isBusy(room) && room.items.length === 0 && <Button title="Add item" kind="outline" icon="add" onPress={addItems} />}
      </ScrollView>

      {!locked && (room.status === "done" || isBusy(room)) && (
        <View style={st.foot}>
          {room.status === "done" && <Button title={room.manual ? "Start over" : "Rescan"} kind="outline" icon="refresh" onPress={rescan} style={{ flex: 1 }} />}
          <Button title={next ? "Next room" : "Summary"} iconRight="arrow-forward" onPress={goNext} style={{ flex: 1.4 }} />
        </View>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 16, gap: 14, paddingBottom: 24 },
  alert: { flexDirection: "row", gap: 10, padding: 12, borderRadius: R.md, backgroundColor: C.redTint, alignItems: "center" },
  alertText: { flex: 1, color: C.red, fontSize: 14 },
  tipsTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  tip: { flexDirection: "row", gap: 8, alignItems: "center" },
  tipText: { flex: 1, fontSize: 14, color: C.text },
  busyHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  busyTitle: { fontSize: 16, fontWeight: "800", color: C.text, flex: 1 },
  foot: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 10, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
});
