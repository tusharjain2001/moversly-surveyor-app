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
  /** Packing allowance per unit (cft) from our server, added to the size's volume. Scanned items only. */
  extraFt3?: number;
  /** The surveyor's own volume per unit (cft). Replaces the size-based volume and the allowance. */
  typedFt3?: number;
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

/** One lead from the tech team's API (GET /api/v1/order/my-orders/for-app, "matching_orders"). */
export interface Appointment {
  /** request_id: the order number on the Moversly system. */
  id: string;
  customer: { name: string; phone: string; email: string };
  /** from_address, e.g. "188 Keng Lee Rd, Singapore 308414, SG": where the survey happens. */
  from: string;
  /** to_address, e.g. "Pune, IN". */
  to: string;
  /** ISO date-times (the API sends epoch seconds). */
  movingDate?: string;
  appointmentAt?: string;
  /** appointment_status, e.g. ACCEPTED / ACTIVE. */
  appointmentStatus?: string;
  /** order_state, e.g. SELF_SURVEY_INPROGRESS. */
  orderState?: string;
  /** shipment_mode: SEA / ROAD / AIR. */
  shipmentMode?: string;
  /** weight_or_volume in cft, when the order already has one. */
  volumeFt3?: number;
}

export interface CatalogItem {
  key: string;
  label: string;
  typical: Dims;
}
