/** Sizes are metres: [length, width (depth), height]. */
export type Dims = [number, number, number];

/** high / medium / low come from the AI; manual = added by the surveyor. */
export type Confidence = "high" | "medium" | "low" | "manual";

export interface Item {
  id: string;
  key: string;
  label: string;
  dims: Dims;
  qty: number;
  confidence: Confidence;
  /** The AI's notes about the measurement (e.g. "partly hidden"). */
  notes: string[];
  /** The surveyor's own note, e.g. "Fabric sofa, good condition". */
  comment?: string;
  /** Photo of the item with its outline, from the AI (data:image/jpeg;base64,...). */
  thumbnail?: string;
}

export type RoomStatus = "empty" | "uploading" | "processing" | "done" | "error";

export interface Room {
  id: string;
  name: string;
  selected: boolean;
  status: RoomStatus;
  progress: number;
  stage?: string;
  error?: string;
  jobId?: string;
  items: Item[];
  /** Items were added by hand, no video. */
  manual?: boolean;
}

export type VoiceNoteStatus = "uploading" | "transcribing" | "done" | "error";

export interface VoiceNote {
  id: string;
  uri: string;
  durationMs: number;
  createdAt: string;
  status: VoiceNoteStatus;
  jobId?: string;
  transcript?: string;
  error?: string;
}

export interface Survey {
  appointmentId: string;
  rooms: Room[];
  notes: string;
  voiceNotes: VoiceNote[];
  status: "draft" | "submitted";
  startedAt: string;
  submittedAt?: string;
}

export interface Surveyor {
  id: string;
  name: string;
  role: string;
  email: string;
}

export type MoveSize = "Full household" | "Partial household" | "A few boxes";

/** One survey visit booked with a customer (comes from the tech team's API). */
export interface Appointment {
  id: string;
  /** The order / lead number on the Moversly system. */
  orderId?: string;
  customer: { name: string; phone: string; email: string };
  origin: string;
  destination: string;
  /** Full address where the survey happens. */
  address: string;
  /** ISO date (YYYY-MM-DD). */
  movingDate: string;
  /** ISO date-time of the visit. */
  surveyAt: string;
  moveSize: MoveSize;
  status: "pending" | "completed";
  /** Which website or page the lead came from. */
  source?: string;
}

export interface CatalogItem {
  key: string;
  label: string;
  typical: Dims;
}
