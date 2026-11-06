import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { durationText, timeText } from "@/lib/format";
import type { VoiceNote } from "@/lib/types";
import { C, R } from "@/theme";
import { Icon, IconButton } from "./ui";

/** One recording: play / pause, length, transcript (or its status), retry and delete. */
export default function VoiceNoteRow({ note, onRetry, onDelete, readOnly }: { note: VoiceNote; onRetry: () => void; onDelete: () => void; readOnly?: boolean }) {
  const player = useAudioPlayer(note.uri);
  const status = useAudioPlayerStatus(player);
  const [open, setOpen] = useState(false);

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.duration && status.currentTime >= status.duration - 0.2) player.seekTo(0);
      player.play();
    }
  };
  const progress = status.duration ? Math.min(1, status.currentTime / status.duration) : 0;

  return (
    <View style={st.card}>
      <View style={st.top}>
        <IconButton name={status.playing ? "pause" : "play"} label={status.playing ? "Pause" : "Play"} onPress={toggle} color={C.white} bg={C.primary} size={42} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={st.track}>
            <View style={[st.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={st.meta}>
            {status.playing || status.currentTime > 0 ? `${durationText(status.currentTime * 1000)} / ` : ""}
            {durationText(note.durationMs)} · recorded {timeText(note.createdAt)}
          </Text>
        </View>
        {!readOnly && <IconButton name="trash-outline" label="Delete recording" onPress={onDelete} color={C.red} bg={C.redTint} size={36} />}
      </View>

      {note.status === "done" ? (
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={open ? "Hide transcript" : "Show full transcript"}>
          <Text style={st.transcript} numberOfLines={open ? undefined : 3}>{note.transcript}</Text>
          {(note.transcript?.length ?? 0) > 160 && <Text style={st.more}>{open ? "Show less" : "Show full transcript"}</Text>}
        </Pressable>
      ) : note.status === "error" ? (
        <View style={st.statusRow}>
          <Icon name="alert-circle" size={18} color={C.red} />
          <Text style={[st.status, { color: C.red, flex: 1 }]}>{note.error}</Text>
          {!readOnly && (
            <Pressable onPress={onRetry} hitSlop={8}>
              <Text style={st.more}>Retry</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={st.statusRow}>
          <Icon name="sparkles-outline" size={18} color={C.primary} />
          <Text style={st.status}>{note.status === "uploading" ? "Uploading recording…" : "Writing the transcript…"}</Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: 12, gap: 10 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.tint, overflow: "hidden" },
  fill: { height: 6, backgroundColor: C.primary },
  meta: { fontSize: 12, color: C.muted, fontVariant: ["tabular-nums"] },
  transcript: { fontSize: 14, lineHeight: 20, color: C.text, backgroundColor: C.bg, padding: 10, borderRadius: R.sm },
  more: { color: C.primary, fontWeight: "700", fontSize: 13, marginTop: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  status: { fontSize: 13, color: C.muted },
});
