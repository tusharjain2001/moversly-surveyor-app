import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type RecordingOptions } from "expo-audio";
import { useLocalSearchParams } from "expo-router";
import { H1, Icon, Message, Muted } from "@/components/ui";
import VoiceNoteRow from "@/components/VoiceNoteRow";
import { confirm, notify } from "@/lib/confirm";
import { durationText } from "@/lib/format";
import { addVoiceNote, removeVoiceNote, setNotes, transcribe, useSurvey } from "@/lib/store";
import { C, R } from "@/theme";

/** Mono, 64 kbps AAC in the app's documents folder: small to upload, plenty for speech. */
const VOICE: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000, directory: "document" };
/** Keep each recording under 30 minutes so the upload stays reasonable. */
const MAX_MS = 30 * 60 * 1000;

export default function NotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const survey = useSurvey(id);
  const recorder = useAudioRecorder(VOICE);
  const rec = useAudioRecorderState(recorder, 250);
  const [text, setText] = useState(survey?.notes ?? "");
  const [busy, setBusy] = useState(false);

  // Save typed notes shortly after typing stops.
  useEffect(() => {
    if (!survey || text === survey.notes) return;
    const t = setTimeout(() => setNotes(id, text), 400);
    return () => clearTimeout(t);
  }, [text, id, survey]);

  const stop = async () => {
    const ms = rec.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    const uri = recorder.uri;
    if (uri && ms >= 1000) addVoiceNote(id, uri, ms);
  };

  useEffect(() => {
    if (rec.isRecording && rec.durationMillis >= MAX_MS) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.durationMillis, rec.isRecording]);

  if (!survey) return <Message title="Survey not found" />;
  const locked = survey.status === "submitted";

  const start = async () => {
    setBusy(true);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        notify("Microphone permission needed", "Allow the microphone in the phone's settings to record the discussion.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e: any) {
      notify("Couldn't start recording", e?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const del = async (noteId: string) => {
    if (await confirm("Delete this recording?", "The audio and its transcript will be removed.", "Delete", true)) removeVoiceNote(id, noteId);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
          <View>
            <H1>Customer discussion</H1>
            <Muted>Record the talk with the customer. Each recording is turned into text automatically.</Muted>
          </View>

          {!locked && (
            <View style={[st.recCard, rec.isRecording && st.recCardOn]}>
              {rec.isRecording ? (
                <>
                  <View style={st.dot} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.recTitle}>Recording… {durationText(rec.durationMillis)}</Text>
                    <Muted style={{ fontSize: 12 }}>Tap stop when the discussion ends</Muted>
                  </View>
                  <Pressable onPress={stop} style={st.stopBtn} accessibilityRole="button" accessibilityLabel="Stop recording">
                    <View style={st.stopSquare} />
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={{ flex: 1 }}>
                    <Text style={st.recTitle}>Record discussion</Text>
                    <Muted style={{ fontSize: 12 }}>Special requests, fragile items, access, parking…</Muted>
                  </View>
                  <Pressable onPress={start} disabled={busy} style={[st.micBtn, busy && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="Start recording">
                    <Icon name="mic" size={26} color={C.white} />
                  </Pressable>
                </>
              )}
            </View>
          )}

          {survey.voiceNotes.length > 0 && (
            <View style={{ gap: 10 }}>
              {[...survey.voiceNotes].reverse().map((n) => (
                <VoiceNoteRow key={n.id} note={n} readOnly={locked} onRetry={() => transcribe(id, n.id)} onDelete={() => del(n.id)} />
              ))}
            </View>
          )}

          <View style={{ gap: 6 }}>
            <Text style={st.label}>Notes (optional)</Text>
            <TextInput
              style={st.notes}
              value={text}
              onChangeText={setText}
              editable={!locked}
              placeholder={"e.g. Customer will arrange parking.\nFragile items: artwork and piano."}
              placeholderTextColor={C.faint}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: 16, gap: 16, paddingBottom: 32 },
  recCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: R.lg, backgroundColor: C.tint, borderWidth: 1, borderColor: C.tint2 },
  recCardOn: { backgroundColor: C.redTint, borderColor: "#F7C9C9" },
  recTitle: { fontSize: 16, fontWeight: "800", color: C.text, fontVariant: ["tabular-nums"] },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.red },
  micBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  stopBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.white, borderWidth: 2, borderColor: C.red, alignItems: "center", justifyContent: "center" },
  stopSquare: { width: 20, height: 20, borderRadius: 4, backgroundColor: C.red },
  label: { fontSize: 15, fontWeight: "800", color: C.text },
  notes: { minHeight: 120, borderWidth: 1.5, borderColor: C.border, borderRadius: R.md, padding: 12, fontSize: 15, color: C.text, backgroundColor: C.white },
});
