import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as backend from "@/api/backend";
import { roomIcon } from "@/components/roomIcon";
import { Button, Card, H1, Icon, IconButton, Message, Muted } from "@/components/ui";
import { confirm, notify } from "@/lib/confirm";
import { isBusy } from "@/lib/flow";
import { dateTimeText } from "@/lib/format";
import { markSubmitted, useSurvey } from "@/lib/store";
import { cft, m3Text, roomCount, roomM3, surveyCount, surveyM3, surveyRooms } from "@/lib/units";
import { C, R } from "@/theme";

/** All rooms with item counts and cft, the total volume, then Submit. (No pricing for now.) */
export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const survey = useSurvey(id);
  const [sending, setSending] = useState(false);
  if (!survey) return <Message title="Survey not found" />;

  const locked = survey.status === "submitted";
  const rooms = surveyRooms(survey);
  const total = surveyM3(survey);
  const busy = rooms.filter(isBusy);
  const notScanned = rooms.filter((r) => (r.status === "empty" || r.status === "error") && r.items.length === 0);

  const submit = async () => {
    if (busy.length) {
      notify("Still measuring", `Please wait for ${busy.map((r) => r.name).join(", ")} to finish.`);
      return;
    }
    if (surveyCount(survey) === 0) {
      notify("No items yet", "Scan a room or add items before submitting.");
      return;
    }
    const warnings = [
      notScanned.length ? `Not scanned: ${notScanned.map((r) => r.name).join(", ")} (they will be left out).` : "",
      "The items are saved on the customer's order. Voice notes and typed notes stay on this phone for now.",
    ].filter(Boolean);
    const ok = await confirm("Submit survey?", [...warnings, "You can't change the survey after submitting."].join("\n\n"), "Submit");
    if (!ok) return;
    setSending(true);
    try {
      await backend.submitSurvey(id, survey);
      markSubmitted(id);
      router.replace({ pathname: "/survey/[id]/done", params: { id } });
    } catch (e: any) {
      notify("Couldn't submit", `${e?.message || "Please try again."}\n\nThe survey is saved on this phone.`);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={st.wrap}>
        <View>
          <H1>Survey summary</H1>
          {locked && survey.submittedAt ? <Muted>Submitted {dateTimeText(survey.submittedAt)}</Muted> : <Muted>Check every room before you submit.</Muted>}
        </View>

        <View style={st.list}>
          {rooms.length === 0 && <Message title="No rooms ticked" text="Go back and tick the rooms to survey." />}
          {rooms.map((r, i) => {
            const n = roomCount(r);
            const done = r.status === "done";
            return (
              <Pressable
                key={r.id}
                onPress={() => router.push({ pathname: "/survey/[id]/room/[roomId]", params: { id, roomId: r.id } })}
                style={({ pressed }) => [st.row, i < rooms.length - 1 && st.rowLine, pressed && { backgroundColor: C.tint }]}
                accessibilityRole="button"
              >
                <Icon name={done ? "checkmark-circle" : isBusy(r) ? "hourglass-outline" : "ellipse-outline"} size={22} color={done ? C.green : isBusy(r) ? C.primary : C.faint} />
                <Icon name={roomIcon(r.name)} size={18} color={C.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={st.rowName} numberOfLines={1}>{r.name}</Text>
                  <Text style={st.rowCount}>
                    {done ? `${n} item${n === 1 ? "" : "s"}` : isBusy(r) ? `Measuring…${n ? ` · ${n} added by hand` : ""}` : n ? `${n} added by hand` : "Not scanned"}
                  </Text>
                </View>
                <Text style={st.rowVol}>{done || n ? cft(roomM3(r)) : ""}</Text>
                {!locked && (
                  <IconButton
                    name="add"
                    label={`Add an item to ${r.name}`}
                    onPress={() => router.push({ pathname: "/survey/[id]/add/[roomId]", params: { id, roomId: r.id } })}
                    size={32}
                  />
                )}
                <Icon name="chevron-forward" size={18} color={C.faint} />
              </Pressable>
            );
          })}
        </View>

        <Card style={st.total}>
          <View style={st.totalIcon}>
            <Icon name="cube" size={26} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.totalLabel}>Total volume</Text>
            <Muted style={{ fontSize: 12 }}>{surveyCount(survey)} items</Muted>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={st.totalValue}>{cft(total)}</Text>
            <Muted style={{ fontSize: 13 }}>({m3Text(total)})</Muted>
          </View>
        </Card>

        <Pressable onPress={() => router.push({ pathname: "/survey/[id]/notes", params: { id } })} accessibilityRole="button">
          <Card style={st.notesRow}>
            <Icon name="mic-outline" color={C.primary} />
            <Text style={{ flex: 1, color: C.text, fontWeight: "700" }}>
              Discussion: {survey.voiceNotes.length} recording{survey.voiceNotes.length === 1 ? "" : "s"}
              {survey.notes.trim() ? " + notes" : ""}
            </Text>
            <Icon name="chevron-forward" size={18} color={C.faint} />
          </Card>
        </Pressable>
      </ScrollView>

      <View style={st.foot}>
        {locked ? (
          <Button title="Back to dashboard" icon="home-outline" onPress={() => router.dismissTo("/")} />
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title="Edit items" kind="outline" icon="create-outline" onPress={() => router.push({ pathname: "/survey/[id]/rooms", params: { id } })} style={{ flex: 1 }} />
            <Button title="Submit survey" iconRight="checkmark" onPress={submit} loading={sending} style={{ flex: 1.3 }} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 16, gap: 14, paddingBottom: 24 },
  list: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 12 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowName: { fontSize: 15, fontWeight: "700", color: C.text },
  rowCount: { fontSize: 13, color: C.muted },
  rowVol: { fontSize: 14, fontWeight: "800", color: C.text, minWidth: 74, textAlign: "right" },
  total: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.tint, borderColor: C.tint2 },
  totalIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  totalLabel: { fontSize: 16, fontWeight: "800", color: C.text },
  totalValue: { fontSize: 22, fontWeight: "800", color: C.primaryDark },
  notesRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  foot: { padding: 16, paddingTop: 10, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
});
