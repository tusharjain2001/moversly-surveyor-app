import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Icon, Message } from "@/components/ui";
import { notify } from "@/lib/confirm";
import { durationText } from "@/lib/format";
import { scanRoom, useSurvey } from "@/lib/store";
import { C } from "@/theme";

// Same limits as the website: 5–90 seconds (the server reads up to 180 s).
const MIN_S = 5;
const MAX_S = 90;

/** Full-screen camera for one room. The video is uploaded as soon as recording stops. */
export default function RecordScreen() {
  const { id, roomId } = useLocalSearchParams<{ id: string; roomId: string }>();
  const survey = useSurvey(id);
  const room = survey?.rooms.find((r) => r.id === roomId);
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const discard = useRef(false);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 250);
    return () => clearInterval(t);
  }, [recording]);

  if (Platform.OS === "web") {
    return <Message icon="phone-portrait-outline" title="Recording needs the phone app" text="Open the app on an Android phone to record a room." action={<Button title="Back" kind="outline" small onPress={() => router.back()} />} />;
  }
  if (!perm) return <View style={{ flex: 1, backgroundColor: C.black }} />;
  if (!perm.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
        <Message
          icon="camera-outline"
          title="Camera permission needed"
          text="The app records a short video of each room so the AI can measure the furniture."
          action={
            <View style={{ gap: 8, alignSelf: "stretch" }}>
              <Button title="Allow camera" onPress={requestPerm} />
              <Button title="Back" kind="ghost" onPress={() => router.back()} />
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  const start = async () => {
    if (!cam.current || !ready || recording) return;
    discard.current = false;
    startedAt.current = Date.now();
    setElapsed(0);
    setRecording(true);
    try {
      const res = await cam.current.recordAsync({ maxDuration: MAX_S });
      const secs = (Date.now() - startedAt.current) / 1000;
      setRecording(false);
      if (discard.current || !res?.uri) return;
      if (secs < MIN_S) {
        notify("Too short", `Please record for at least ${MIN_S} seconds, walking slowly around the room.`);
        return;
      }
      scanRoom(id, roomId, res.uri);
      router.back();
    } catch (e: any) {
      setRecording(false);
      notify("Recording failed", e?.message || "Please try again.");
    }
  };
  const stop = () => cam.current?.stopRecording();
  const close = () => {
    if (recording) {
      discard.current = true;
      stop();
    }
    router.back();
  };

  const left = Math.max(0, MAX_S * 1000 - elapsed);

  return (
    <View style={{ flex: 1, backgroundColor: C.black }}>
      <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" mode="video" mute videoQuality="720p" onCameraReady={() => setReady(true)} />
      <SafeAreaView style={st.overlay} edges={["top", "bottom"]}>
        <View style={st.top}>
          <Pressable onPress={close} style={st.round} accessibilityLabel="Close camera" hitSlop={8}>
            <Icon name="close" size={24} color={C.white} />
          </Pressable>
          <Text style={st.title}>Scan – {room?.name ?? "Room"}</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={st.frame} pointerEvents="none">
          <View style={[st.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }]} />
          <View style={[st.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }]} />
          <View style={[st.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
          <View style={[st.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }]} />
          <View style={st.hint}>
            <Text style={st.hintText}>{recording ? (elapsed < MIN_S * 1000 ? "Keep going…" : "Walk slowly round the room") : "Slowly move your camera across the room"}</Text>
          </View>
        </View>

        <View style={st.bottom}>
          {recording && (
            <View style={st.timer}>
              <View style={st.dot} />
              <Text style={st.timerText}>{durationText(elapsed)}  ·  {Math.ceil(left / 1000)}s left</Text>
            </View>
          )}
          <Pressable
            onPress={recording ? stop : start}
            disabled={!ready}
            style={[st.shutter, !ready && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel={recording ? "Stop recording" : "Start recording"}
          >
            <View style={recording ? st.stopInner : st.recInner} />
          </Pressable>
          <Text style={st.under}>{recording ? "Tap to stop" : ready ? "Tap to record" : "Starting camera…"}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "space-between" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  title: { color: C.white, fontSize: 17, fontWeight: "800" },
  frame: { flex: 1, margin: 28, justifyContent: "flex-end", alignItems: "center" },
  corner: { position: "absolute", width: 36, height: 36, borderColor: C.white, borderRadius: 4 },
  hint: { backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginBottom: 24 },
  hintText: { color: C.white, fontSize: 14, fontWeight: "600", textAlign: "center" },
  bottom: { alignItems: "center", paddingBottom: 18, gap: 10 },
  timer: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.red },
  timerText: { color: C.white, fontWeight: "700", fontVariant: ["tabular-nums"] },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: C.white, alignItems: "center", justifyContent: "center" },
  recInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.red },
  stopInner: { width: 30, height: 30, borderRadius: 6, backgroundColor: C.red },
  under: { color: C.white, fontSize: 13, fontWeight: "600" },
});
