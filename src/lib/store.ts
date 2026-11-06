// All surveys on this phone, one per appointment. Saved to a file so a survey survives
// closing the app. Room videos go to the AI server and voice notes to the transcript
// service; the jobs are polled every 2 seconds while the app is open.
import { useEffect, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import { getJob, getTranscript, uploadAudio, uploadVideo, type JobResultItem } from "@/api/survey";
import type { CatalogItem, Item, Room, Survey, VoiceNote } from "./types";

type State = Record<string, Survey>;

const FILE_NAME = "surveys.json";
const POLL_MS = 2000;
/** Rooms from the design; the first five are ticked. */
const DEFAULT_ROOMS: [string, boolean][] = [
  ["Living Room", true],
  ["Dining Room", true],
  ["Master Bedroom", true],
  ["Bedroom 2", true],
  ["Kitchen", true],
  ["Study / Office", false],
  ["Storage / Other", false],
];

export const uid = () => Math.random().toString(36).slice(2, 10);
const newRoom = (name: string, selected: boolean): Room => ({ id: uid(), name, selected, status: "empty", progress: 0, items: [] });

// ── persistence ─────────────────────────────────────────────────────────────

function readSaved(): State {
  try {
    if (Platform.OS === "web") return JSON.parse(globalThis.localStorage?.getItem(FILE_NAME) || "{}");
    const f = new File(Paths.document, FILE_NAME);
    return f.exists ? JSON.parse(f.textSync() || "{}") : {};
  } catch {
    return {};
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const text = JSON.stringify(state);
    try {
      if (Platform.OS === "web") {
        globalThis.localStorage?.setItem(FILE_NAME, text);
        return;
      }
      const f = new File(Paths.document, FILE_NAME);
      if (!f.exists) f.create();
      f.write(text);
    } catch (e) {
      if (__DEV__) console.warn("Could not save surveys", e);
    }
  }, 300);
}

/** Uploads can't resume after the app was closed; server jobs can (they keep their jobId). */
function afterRestart(s: State): State {
  const out: State = {};
  for (const [id, sv] of Object.entries(s)) {
    out[id] = {
      ...sv,
      rooms: sv.rooms.map((r) =>
        r.status === "uploading" ? { ...r, status: "error", error: "The upload was interrupted. Please record the room again." } : r,
      ),
      voiceNotes: (sv.voiceNotes || []).map((n) =>
        n.status === "uploading" ? { ...n, status: "error", error: "The upload was interrupted. Tap Retry." } : n,
      ),
    };
  }
  return out;
}

// ── store ───────────────────────────────────────────────────────────────────

let state: State = afterRestart(readSaved());
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
  scheduleSave();
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function updateSurvey(id: string, fn: (s: Survey) => Survey) {
  const cur = state[id];
  if (cur) setState({ ...state, [id]: fn(cur) });
}
function updateRoom(id: string, roomId: string, fields: Partial<Room> | ((r: Room) => Partial<Room>)) {
  updateSurvey(id, (s) => ({
    ...s,
    rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, ...(typeof fields === "function" ? fields(r) : fields) } : r)),
  }));
}
function updateNote(id: string, noteId: string, fields: Partial<VoiceNote>) {
  updateSurvey(id, (s) => ({ ...s, voiceNotes: s.voiceNotes.map((n) => (n.id === noteId ? { ...n, ...fields } : n)) }));
}

export const getSurvey = (id: string): Survey | undefined => state[id];
export const useSurvey = (id: string) => useSyncExternalStore(subscribe, () => state[id]);
export const useAllSurveys = () => useSyncExternalStore(subscribe, () => state);

/** Creates the survey the first time; returns the existing one after that. */
export function startSurvey(appointmentId: string): Survey {
  if (state[appointmentId]) return state[appointmentId];
  const s: Survey = {
    appointmentId,
    rooms: DEFAULT_ROOMS.map(([n, sel]) => newRoom(n, sel)),
    notes: "",
    voiceNotes: [],
    status: "draft",
    startedAt: new Date().toISOString(),
  };
  setState({ ...state, [appointmentId]: s });
  return s;
}

export function removeSurvey(appointmentId: string) {
  const next = { ...state };
  delete next[appointmentId];
  setState(next);
}

// ── rooms ───────────────────────────────────────────────────────────────────

export const setRoomSelected = (id: string, roomId: string, selected: boolean) => updateRoom(id, roomId, { selected });

export function addRoom(id: string, name: string) {
  const room = newRoom(name.trim() || "Room", true);
  updateSurvey(id, (s) => ({ ...s, rooms: [...s.rooms, room] }));
  return room.id;
}

export const resetRoom = (id: string, roomId: string) =>
  updateRoom(id, roomId, { status: "empty", progress: 0, items: [], stage: undefined, error: undefined, jobId: undefined, manual: undefined });

/** Upload the room video; polling picks the job up once it has a jobId. */
export async function scanRoom(id: string, roomId: string, uri: string) {
  const room = state[id]?.rooms.find((r) => r.id === roomId);
  if (!room) return;
  updateRoom(id, roomId, { selected: true, status: "uploading", progress: 0, stage: "Uploading video", error: undefined, items: [], manual: undefined });
  try {
    const jobId = await uploadVideo(uri, room.name, (p) => updateRoom(id, roomId, { progress: p }));
    updateRoom(id, roomId, { status: "processing", jobId, progress: 0, stage: "Starting analysis" });
  } catch (e: any) {
    updateRoom(id, roomId, { status: "error", error: e?.message || "Upload failed." });
  }
}

const fromJobItem = (it: JobResultItem): Item => ({
  id: it.id || uid(),
  key: it.key,
  label: it.label,
  dims: it.dims_m,
  qty: 1,
  confidence: it.confidence,
  notes: it.notes || [],
  thumbnail: it.thumbnail,
});

// ── items ───────────────────────────────────────────────────────────────────

export function updateItem(id: string, roomId: string, itemId: string, fields: Partial<Item>) {
  updateRoom(id, roomId, (r) => ({ items: r.items.map((it) => (it.id === itemId ? { ...it, ...fields } : it)) }));
}

export function removeItem(id: string, roomId: string, itemId: string) {
  updateRoom(id, roomId, (r) => ({ items: r.items.filter((it) => it.id !== itemId) }));
}

/** Add from the item list (typical size) or a custom name. A room without a video becomes "added by hand". */
export function addItem(id: string, roomId: string, c: CatalogItem): string {
  const item: Item = { id: uid(), key: c.key, label: c.label, dims: [...c.typical], qty: 1, confidence: "manual", notes: [] };
  updateRoom(id, roomId, (r) => ({
    selected: true,
    status: "done",
    manual: r.status === "done" ? r.manual : true,
    error: undefined,
    items: [...r.items, item],
  }));
  return item.id;
}

// ── notes ───────────────────────────────────────────────────────────────────

export const setNotes = (id: string, notes: string) => updateSurvey(id, (s) => ({ ...s, notes }));

export function addVoiceNote(id: string, uri: string, durationMs: number) {
  const note: VoiceNote = { id: uid(), uri, durationMs, createdAt: new Date().toISOString(), status: "uploading" };
  updateSurvey(id, (s) => ({ ...s, voiceNotes: [...s.voiceNotes, note] }));
  transcribe(id, note.id);
}

export async function transcribe(id: string, noteId: string) {
  const note = state[id]?.voiceNotes.find((n) => n.id === noteId);
  if (!note) return;
  updateNote(id, noteId, { status: "uploading", error: undefined });
  try {
    const jobId = await uploadAudio(note.uri);
    updateNote(id, noteId, { status: "transcribing", jobId });
  } catch (e: any) {
    updateNote(id, noteId, { status: "error", error: e?.message || "Upload failed." });
  }
}

export function removeVoiceNote(id: string, noteId: string) {
  const note = state[id]?.voiceNotes.find((n) => n.id === noteId);
  updateSurvey(id, (s) => ({ ...s, voiceNotes: s.voiceNotes.filter((n) => n.id !== noteId) }));
  if (note && Platform.OS !== "web") {
    try {
      const f = new File(note.uri);
      if (f.exists) f.delete();
    } catch {
      // Already gone.
    }
  }
}

export const markSubmitted = (id: string) =>
  updateSurvey(id, (s) => ({ ...s, status: "submitted", submittedAt: new Date().toISOString() }));

// ── polling ─────────────────────────────────────────────────────────────────

let polling = false;
async function pollOnce() {
  if (polling) return;
  polling = true;
  try {
    for (const s of Object.values(state)) {
      for (const room of s.rooms) {
        if (room.status !== "processing" || !room.jobId) continue;
        try {
          const job = await getJob(room.jobId);
          if (!job) updateRoom(s.appointmentId, room.id, { status: "error", error: "The AI server lost this video. Please record the room again." });
          else if (job.status === "done" && job.result)
            updateRoom(s.appointmentId, room.id, { status: "done", progress: 1, stage: undefined, error: undefined, items: job.result.items.map(fromJobItem) });
          else if (job.status === "error") updateRoom(s.appointmentId, room.id, { status: "error", error: job.error || "The analysis failed." });
          else updateRoom(s.appointmentId, room.id, { stage: job.stage, progress: job.progress ?? 0 });
        } catch {
          // Network blip: try again next time.
        }
      }
      for (const note of s.voiceNotes) {
        if (note.status !== "transcribing" || !note.jobId) continue;
        try {
          const job = await getTranscript(note.jobId);
          if (!job) updateNote(s.appointmentId, note.id, { status: "error", error: "The server lost this recording. Tap Retry." });
          else if (job.status === "done") updateNote(s.appointmentId, note.id, { status: "done", transcript: (job.text || "").trim() || "(No speech found)" });
          else if (job.status === "error") updateNote(s.appointmentId, note.id, { status: "error", error: job.error || "The transcript failed. Tap Retry." });
        } catch {
          // Network blip.
        }
      }
    }
  } finally {
    polling = false;
  }
}

/** Mount once (in the signed-in layout) to keep scans and transcripts moving. */
export function useJobPolling() {
  useEffect(() => {
    pollOnce();
    const t = setInterval(pollOnce, POLL_MS);
    return () => clearInterval(t);
  }, []);
}
