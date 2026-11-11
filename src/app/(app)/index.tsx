import { useCallback, useMemo, useRef } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as backend from "@/api/backend";
import { USE_MOCK } from "@/api/config";
import Logo from "@/components/Logo";
import { Avatar, Button, Icon, IconButton, Loading, Message, Muted, Pill } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { confirm } from "@/lib/confirm";
import { dateText, firstName, initials, labelOf, sameDay, timeText } from "@/lib/format";
import { useAllSurveys } from "@/lib/store";
import type { Appointment, Survey } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { C, R, shadow } from "@/theme";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const surveys = useAllSurveys();
  const list = useAsync(backend.listAppointments);

  // Ask the server again every time the surveyor comes back to this screen (e.g. after a survey),
  // so the list never shows old details. The first time, useAsync has just loaded it.
  const firstFocus = useRef(true);
  const { refresh } = list;
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else refresh();
    }, [refresh]),
  );

  // All leads in one list: by survey appointment (soonest first), ones submitted from this phone last.
  const shown = useMemo(() => {
    const sent = (a: Appointment) => surveys[a.id]?.status === "submitted";
    const time = (a: Appointment) => (a.appointmentAt ? Date.parse(a.appointmentAt) : Infinity);
    return [...(list.data ?? [])].sort((x, y) => Number(sent(x)) - Number(sent(y)) || time(x) - time(y));
  }, [list.data, surveys]);

  const logout = async () => {
    if (await confirm("Log out?", "Surveys you haven't submitted stay saved on this phone.", "Log out")) signOut();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={st.topBar}>
        <Logo />
        <IconButton name="log-out-outline" label="Log out" onPress={logout} bg="transparent" color={C.text} />
      </View>

      <ScrollView
        contentContainerStyle={st.wrap}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} colors={[C.primary]} tintColor={C.primary} />}
      >
        <View style={st.hello}>
          <Avatar text={initials(user?.name ?? "")} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={st.hi}>Hi, {firstName(user?.name ?? "there")}</Text>
            {user?.role ? <Muted>{labelOf(user.role)}</Muted> : null}
          </View>
        </View>

        <Text style={st.listTitle}>Customers{list.data ? ` (${shown.length})` : ""}</Text>

        {list.loading ? (
          <Loading />
        ) : list.error ? (
          <Message icon="cloud-offline-outline" title="Couldn't load your customers" text={list.error} action={<Button title="Try again" kind="outline" small onPress={list.reload} />} />
        ) : shown.length === 0 ? (
          <Message icon="people-outline" title="No customers yet" text="Pull down to refresh." />
        ) : (
          <View style={{ gap: 12 }}>
            {shown.map((a) => (
              <LeadCard key={a.id} a={a} survey={surveys[a.id]} />
            ))}
          </View>
        )}

        {USE_MOCK && <Text style={st.demo}>Demo mode · sample customers</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function LeadCard({ a, survey }: { a: Appointment; survey?: Survey }) {
  const sent = survey?.status === "submitted";
  const started = !sent && !!survey && survey.rooms.some((r) => r.items.length > 0 || r.status !== "empty");
  const appt = a.appointmentAt ? new Date(a.appointmentAt) : null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/customer/[id]", params: { id: a.id } })}
      style={({ pressed }) => [st.card, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`${a.customer.name}${a.to ? `, moving to ${a.to}` : ""}`}
    >
      <View style={st.cardIcon}>
        <Icon name="person-outline" color={C.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={st.cardName}>{a.customer.name}</Text>
          {sent ? <Pill text="Survey submitted" color={C.green} bg={C.greenTint} /> : started ? <Pill text="Survey in progress" /> : null}
        </View>
        {a.to ? <Muted>Moving to: {a.to}</Muted> : null}
        {appt ? (
          <View style={st.cardLine}>
            <Icon name="calendar-outline" size={15} color={C.muted} />
            <Text style={st.cardMeta}>Survey: {sameDay(appt, new Date()) ? "Today" : dateText(appt)}, {timeText(appt)}</Text>
          </View>
        ) : null}
        {a.movingDate ? (
          <View style={st.cardLine}>
            <Icon name="cube-outline" size={15} color={C.muted} />
            <Text style={st.cardMeta}>Moving: {dateText(a.movingDate)}</Text>
          </View>
        ) : null}
        {a.orderState ? <Text style={st.state}>{labelOf(a.orderState)}</Text> : null}
      </View>
      <Icon name="chevron-forward" color={C.faint} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: C.white },
  wrap: { padding: 16, paddingBottom: 40, gap: 16 },
  hello: { flexDirection: "row", alignItems: "center", gap: 14 },
  hi: { fontSize: 24, fontWeight: "800", color: C.text },
  listTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.border, ...shadow },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.tint, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  cardName: { fontSize: 16, fontWeight: "800", color: C.text },
  cardLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardMeta: { fontSize: 13, color: C.muted },
  state: { fontSize: 12, color: C.primary, fontWeight: "700", marginTop: 2 },
  demo: { textAlign: "center", color: C.faint, fontSize: 12, marginTop: 8 },
});
