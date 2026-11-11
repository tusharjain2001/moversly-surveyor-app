import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as backend from "@/api/backend";
import { Avatar, Button, Card, Icon, InfoRow, Loading, Message, Muted, Pill } from "@/components/ui";
import { dateText, dateTimeText, durationText, initials, labelOf } from "@/lib/format";
import { startSurvey, useSurvey } from "@/lib/store";
import { useAsync } from "@/lib/useAsync";
import { C, R } from "@/theme";

export default function CustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: a, error, loading, reload } = useAsync(() => backend.getAppointment(id), [id]);
  const survey = useSurvey(id);

  if (loading) return <Loading />;
  if (error || !a) return <Message icon="alert-circle-outline" title="Couldn't load this customer" text={error ?? ""} action={<Button title="Try again" kind="outline" small onPress={reload} />} />;

  const submitted = survey?.status === "submitted";
  const started = !submitted && !!survey && survey.rooms.some((r) => r.items.length > 0 || r.status !== "empty");
  const voiceCount = survey?.voiceNotes.length ?? 0;
  const voiceMs = survey?.voiceNotes.reduce((t, n) => t + n.durationMs, 0) ?? 0;
  const { name, phone, email } = a.customer;

  const open = (url: string) => Linking.openURL(url).catch(() => {});
  const goSurvey = () => {
    startSurvey(id);
    router.push({ pathname: "/survey/[id]/rooms", params: { id } });
  };
  const goNotes = () => {
    startSurvey(id);
    router.push({ pathname: "/survey/[id]/notes", params: { id } });
  };

  // Only what the leads API gives.
  const rows = [
    a.to && { icon: "location-outline", label: "Moving to", value: a.to },
    a.movingDate && { icon: "calendar-outline", label: "Moving date", value: dateText(a.movingDate) },
    a.appointmentAt && {
      icon: "time-outline",
      label: "Survey appointment",
      value: `${dateTimeText(a.appointmentAt)}${a.appointmentStatus ? ` · ${labelOf(a.appointmentStatus)}` : ""}`,
    },
    a.shipmentMode && { icon: "boat-outline", label: "Shipment", value: labelOf(a.shipmentMode) },
    a.volumeFt3 && { icon: "cube-outline", label: "Volume on the order", value: `${Math.round(a.volumeFt3).toLocaleString()} cft` },
    a.orderState && { icon: "flag-outline", label: "Lead status", value: labelOf(a.orderState) },
    { icon: "document-text-outline", label: "Order no.", value: a.id },
  ].filter(Boolean) as { icon: "time-outline"; label: string; value: string }[];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={st.wrap}>
        <Card>
          <View style={st.head}>
            <Avatar text={initials(name)} size={56} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={st.name}>{name}</Text>
              {submitted ? <Pill text="Survey submitted" color={C.green} bg={C.greenTint} /> : started ? <Pill text="Survey in progress" /> : null}
            </View>
          </View>
          {phone ? (
            <View style={st.contact}>
              <Icon name="call-outline" size={18} color={C.primary} />
              <Text style={st.contactText}>{phone}</Text>
            </View>
          ) : null}
          {email ? (
            <Pressable style={st.contact} onPress={() => open(`mailto:${email}`)} accessibilityRole="link">
              <Icon name="mail-outline" size={18} color={C.primary} />
              <Text style={[st.contactText, { color: C.primary }]}>{email}</Text>
            </Pressable>
          ) : null}
        </Card>

        {a.from ? (
          <Pressable onPress={() => open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.from)}`)} accessibilityRole="link">
            <Card style={st.address}>
              <Icon name="map-outline" color={C.primary} />
              <View style={{ flex: 1 }}>
                <Muted style={{ fontSize: 12 }}>Moving from (survey address)</Muted>
                <Text style={st.addressText}>{a.from}</Text>
              </View>
              <Text style={st.link}>Map</Text>
            </Card>
          </Pressable>
        ) : null}

        <Card style={{ paddingVertical: 4 }}>
          {rows.map((r, i) => (
            <InfoRow key={r.label} icon={r.icon} label={r.label} value={r.value} last={i === rows.length - 1} />
          ))}
        </Card>

        <Pressable onPress={goNotes} accessibilityRole="button">
          <Card style={st.notes}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={st.notesTitle}>Discussion / Voice notes</Text>
              <Muted>{voiceCount ? `${voiceCount} recording${voiceCount === 1 ? "" : "s"} · ${durationText(voiceMs)}` : "Tap to record the discussion with the customer"}</Muted>
            </View>
            <View style={st.mic}>
              <Icon name="mic" color={C.white} />
            </View>
          </Card>
        </Pressable>
      </ScrollView>

      <View style={st.foot}>
        {submitted ? (
          <Button title="View survey" kind="outline" icon="document-text-outline" onPress={() => router.push({ pathname: "/survey/[id]/summary", params: { id } })} disabled={!survey} />
        ) : (
          <Button title={started ? "Continue survey" : "Start survey"} icon="camera-outline" iconRight="arrow-forward" onPress={goSurvey} />
        )}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 16, gap: 14, paddingBottom: 24 },
  head: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  name: { fontSize: 21, fontWeight: "800", color: C.text },
  contact: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10 },
  contactText: { flex: 1, fontSize: 15, color: C.text, fontWeight: "600" },
  address: { flexDirection: "row", alignItems: "center", gap: 12 },
  addressText: { fontSize: 15, color: C.text, fontWeight: "700", marginTop: 2 },
  link: { color: C.primary, fontWeight: "700" },
  notes: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.tint, borderColor: C.tint2 },
  notesTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  mic: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  foot: { padding: 16, paddingTop: 10, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, borderRadius: R.sm },
});
