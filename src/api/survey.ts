// Our AI survey server (instant-booking.moversly.com/ai), the same calls as the Moving to India page:
//   POST /jobs        multipart video=<file>, room=<name>  -> { job_id }
//   GET  /jobs/{id}   -> { status: queued|running|done|error, stage, progress, result?, error? }
//   GET  /catalog     -> items for "Add item"
// Voice notes (Whisper on Modal):
//   POST /transcribe       multipart audio=<file>  -> { job_id }
//   GET  /transcribe/{id}  -> { status: queued|running|done|error, text?, error? }
import type { CatalogItem, Confidence, Dims } from "@/lib/types";
import { SURVEY_API_URL } from "./config";

export interface JobResultItem {
  id?: string;
  key: string;
  label: string;
  dims_m: Dims;
  confidence: Confidence;
  notes?: string[];
  thumbnail?: string;
  /** Packing allowance per item (cft) that the app adds to the volume. */
  extra_ft3?: number;
}
export interface Job {
  status: "queued" | "running" | "done" | "error";
  stage?: string;
  progress?: number;
  error?: string;
  result?: { items: JobResultItem[] };
}
export interface TranscriptJob {
  status: "queued" | "running" | "done" | "error";
  text?: string;
  error?: string;
}

const mimeOf = (uri: string, kind: "video" | "audio") => {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase() || "";
  if (kind === "video") return { ext: ext || "mp4", type: ext === "mov" ? "video/quicktime" : "video/mp4" };
  const types: Record<string, string> = { m4a: "audio/mp4", mp4: "audio/mp4", aac: "audio/aac", "3gp": "audio/3gpp", wav: "audio/wav", webm: "audio/webm" };
  return { ext: ext || "m4a", type: types[ext] || "audio/mp4" };
};

/** Upload a file from the phone with progress (fetch can't report upload progress). */
function upload(path: string, field: string, uri: string, kind: "video" | "audio", extra: Record<string, string>, onProgress?: (p: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const { ext, type } = mimeOf(uri, kind);
    const form = new FormData();
    // React Native reads the file from the uri itself.
    form.append(field, { uri, name: `${kind}.${ext}`, type } as unknown as Blob);
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", SURVEY_API_URL + path);
    // On mobile data Android can resend part of the file after a dropped connection and counts those
    // bytes again (the team saw "133%"), so never report more than 100% or go backwards.
    let shown = 0;
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !e.total) return;
      shown = Math.max(shown, Math.min(1, e.loaded / e.total));
      onProgress?.(shown);
    };
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // not JSON
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.job_id) resolve(body.job_id);
      else reject(new Error(body?.detail || uploadError(xhr.status, kind)));
    };
    xhr.onerror = () => reject(new Error("Couldn't reach the AI server. Check your internet and try again."));
    xhr.send(form);
  });
}

function uploadError(status: number, kind: "video" | "audio") {
  if (status === 404 && kind === "audio") return "Transcripts aren't switched on on the server yet. The recording is kept; try again later.";
  if (status === 413) return kind === "video" ? "The video is too large. Please record a shorter clip." : "The recording is too large.";
  if (status >= 500) return "The upload didn't reach the AI server. Check your internet and try again.";
  return `Upload failed (error ${status}). Please try again.`;
}

export const uploadVideo = (uri: string, room: string, onProgress?: (p: number) => void) =>
  upload("/jobs", "video", uri, "video", { room }, onProgress);

export const uploadAudio = (uri: string, onProgress?: (p: number) => void) =>
  upload("/transcribe", "audio", uri, "audio", {}, onProgress);

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(SURVEY_API_URL + path, { cache: "no-store" } as RequestInit);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Status check failed (${res.status})`);
  return res.json();
}

export const getJob = (jobId: string) => getJson<Job>(`/jobs/${encodeURIComponent(jobId)}`);
export const getTranscript = (jobId: string) => getJson<TranscriptJob>(`/transcribe/${encodeURIComponent(jobId)}`);

let catalogPromise: Promise<CatalogItem[]> | null = null;
export function getCatalog(): Promise<CatalogItem[]> {
  if (!catalogPromise) {
    catalogPromise = fetch(`${SURVEY_API_URL}/catalog`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: CatalogItem[]) => list.sort((a, b) => a.label.localeCompare(b.label)))
      .catch(() => {
        catalogPromise = null;
        return [];
      });
  }
  return catalogPromise;
}
