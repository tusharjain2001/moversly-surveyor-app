import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as backend from "@/api/backend";
import { USE_MOCK } from "@/api/config";
import Logo from "@/components/Logo";
import { Avatar, Button, Icon, IconButton, Loading, Message, Muted, Pill } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { confirm } from "@/lib/confirm";
import { dateText, firstName, initials, sameDay, timeText } from "@/lib/format";
import { useAllSurveys } from "@/lib/store";
import type { Appointment, Survey } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { C, R, shadow } from "@/theme";

type Tab = "today" | "upcoming" | "completed";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const surveys = useAllSurveys();
  const list = useAsync(backend.listAppointments);
  const stats = useAsync(backend.getStats);
  const [tab, setTab] = useState<Tab>("today");

  const groups = useMemo(() => {
    const today = new Date();
    const out: Record<Tab, Appointment[]> = { today: [], upcoming: [], completed: [] };
    for (const a of list.data ?? []) {
      const done = a.status === "completed" || surveys[a.id]?.status === "submitted";
      const at = new Date(a.surveyAt);
      if (done) out.completed.push(a);
      else if (sameDay(at, today) || at < today) out.today.push(a); // overdue visits stay on Today
      else out.upcoming.push(a);
    }
    const byTime = (x: Appointment, y: Appointment) => x.surveyAt.localeCompare(y.surveyAt);
    out.today.sort(byTime);
    out.upcoming.sort(byTime);
    out.completed.sort((x, y) => y.surveyAt.localeCompare(x.surveyAt));
    return out;
  }, [list.data, surveys]);

  const refresh = () => {
    list.reload();
    stats.reload();
  };

  const logout = async () => {
    if (await confirm("Log out?", "Surveys you haven't submitted stay saved on this phone.", "Log out")) signOut();
  };

  const shown = groups[tab];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={st.topBar}>
        <Logo />
        <IconButton name="log-out-outline" label="Log out" onPress={logout} bg="transparent" color={C.text} />
      </View>

      <ScrollView
        contentContainerStyle={st.wrap}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={refresh} colors={[C.primary]} tintColor={C.primary} />}
      >
        <View style={st.hello}>
          <Avatar text={initials(user?.name ?? "")} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={st.hi}>Hi, {firstName(user?.name ?? "there")}</Text>
            <Muted>{user?.role ?? "Relocation Surveyor"}</Muted>
          </View>
        </View>

        <View style={st.stats}>
          <Stat icon="checkmark-circle" color={C.green} bg={C.greenTint} label="Surveys completed" value={stats.data?.completed} />
          <Stat icon="time" color={C.amber} bg={C.amberTint} label="Pending" value={stats.data?.pending} />
        </View>

        <View style={st.tabs}>
          {(["today", "upcoming", "completed"] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[st.tab, tab === t && st.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
              <Text style={[st.tabText, tab === t && st.tabTextOn]}>
                {t === "today" ? "Today" : t === "upcoming" ? "Upcoming" : "Completed"} ({groups[t].length})
              </Text>
            </Pressable>
          ))}
        </View>

        {list.loading ? (
          <Loading />
        ) : list.error ? (
          <Message icon="cloud-offline-outline" title="Couldn't load your visits" text={list.error} action={<Button title="Try again" kind="outline" small onPress={refresh} />} />
        ) : shown.length === 0 ? (
          <Message
            icon="calendar-clear-outline"
            title={tab === "today" ? "No visits today" : tab === "upcoming" ? "No upcoming visits" : "No completed surveys yet"}
            text="Pull down to refresh."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {shown.map((a) => (
              <VisitCard key={a.id} a={a} survey={surveys[a.id]} showDate={tab !== "today"} />
            ))}
          </View>
        )}

        {USE_MOCK && <Text style={st.demo}>Demo mode · sample customers</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, color, bg, label, value }: { icon: "checkmark-circle" | "time"; color: string; bg: string; label: string; value?: number }) {
  return (
    <View style={[st.stat, { backgroundColor: bg }]}>
      <Icon name={icon} size={26} color={color} />
      <Text style={st.statLabel}>{label}</Text>
      <Text style={[st.statValue, { color }]}>{value ?? "–"}</Text>
    </View>
  );
}

function VisitCard({ a, survey, showDate }: { a: Appointment; survey?: Survey; showDate: boolean }) {
  const done = a.status === "completed" || survey?.status === "submitted";
  const started = !done && survey && survey.rooms.some((r) => r.items.length > 0 || r.status !== "empty");
  const overdue = !done && new Date(a.surveyAt) < new Date() && !sameDay(new Date(a.surveyAt), new Date());
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/customer/[id]", params: { id: a.id } })}
      style={({ pressed }) => [st.visit, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`${a.customer.name}, moving to ${a.destination}`}
    >
      <View style={st.visitIcon}>
        <Icon name="person-outline" color={C.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={st.visitName}>{a.customer.name}</Text>
          {done && <Pill text="Completed" color={C.green} bg={C.greenTint} />}
          {started && <Pill text="In progress" />}
          {overdue && <Pill text="Overdue" color={C.red} bg={C.redTint} />}
        </View>
        <Muted>Moving to: {a.destination}</Muted>
        <View style={st.visitLine}>
          <Icon name="calendar-outline" size={15} color={C.muted} />
          <Text style={st.visitMeta}>Survey: {showDate ? `${dateText(a.surveyAt)}, ` : ""}{timeText(a.surveyAt)}</Text>
        </View>
        <View style={st.visitLine}>
          <Icon name="cube-outline" size={15} color={C.muted} />
          <Text style={st.visitMeta}>Moving: {dateText(a.movingDate)}</Text>
        </View>
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
  stats: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, borderRadius: R.lg, padding: 14, gap: 4 },
  statLabel: { fontSize: 13, color: C.text, fontWeight: "600", marginTop: 4 },
  statValue: { fontSize: 28, fontWeight: "800" },
  tabs: { flexDirection: "row", backgroundColor: C.white, borderRadius: R.md, padding: 4, borderWidth: 1, borderColor: C.border },
  tab: { flex: 1, paddingVertical: 9, borderRadius: R.sm, alignItems: "center" },
  tabOn: { backgroundColor: C.primary },
  tabText: { fontSize: 13, fontWeight: "700", color: C.muted },
  tabTextOn: { color: C.white },
  visit: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.border, ...shadow },
  visitIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.tint, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  visitName: { fontSize: 16, fontWeight: "800", color: C.text },
  visitLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  visitMeta: { fontSize: 13, color: C.muted },
  demo: { textAlign: "center", color: C.faint, fontSize: 12, marginTop: 8 },
});
