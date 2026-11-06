import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as backend from "@/api/backend";
import { Button, Card, Icon, Muted } from "@/components/ui";
import { useSurvey } from "@/lib/store";
import { useAsync } from "@/lib/useAsync";
import { cft, m3Text, surveyCount, surveyM3, surveyRooms } from "@/lib/units";
import { C } from "@/theme";

export default function DoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const survey = useSurvey(id);
  const { data: a } = useAsync(() => backend.getAppointment(id), [id]);
  const total = survey ? surveyM3(survey) : 0;
  const rooms = survey ? surveyRooms(survey).filter((r) => r.items.length > 0).length : 0;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={st.wrap}>
        <View style={st.badge}>
          <Icon name="checkmark" size={56} color={C.white} />
        </View>
        <Text style={st.title}>Survey completed!</Text>
        <Muted style={{ textAlign: "center" }}>The home survey{a ? ` for ${a.customer.name}` : ""} has been submitted.</Muted>

        {survey && (
          <Card style={st.stats}>
            <Stat value={cft(total)} label={m3Text(total)} />
            <Stat value={String(surveyCount(survey))} label="items" />
            <Stat value={String(rooms)} label={rooms === 1 ? "room" : "rooms"} />
          </Card>
        )}
      </ScrollView>
      <View style={st.foot}>
        <Button title="View survey" kind="outline" icon="document-text-outline" onPress={() => router.push({ pathname: "/survey/[id]/summary", params: { id } })} />
        <Button title="Back to dashboard" icon="home-outline" onPress={() => router.dismissTo("/")} />
      </View>
    </SafeAreaView>
  );
}

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View style={{ flex: 1, alignItems: "center" }}>
    <Text style={st.statValue}>{value}</Text>
    <Muted style={{ fontSize: 12 }}>{label}</Muted>
  </View>
);

const st = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 12 },
  badge: { width: 104, height: 104, borderRadius: 52, backgroundColor: C.green, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "800", color: C.text },
  stats: { flexDirection: "row", alignSelf: "stretch", marginTop: 16 },
  statValue: { fontSize: 18, fontWeight: "800", color: C.text },
  foot: { padding: 16, gap: 10, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
});
