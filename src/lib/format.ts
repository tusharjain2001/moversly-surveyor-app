// Dates written by hand (not Intl) so they look the same on every phone.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v.length === 10 ? `${v}T00:00:00` : v));

/** 12 Nov 2026 */
export function dateText(v: string | Date) {
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 10:00 AM */
export function timeText(v: string | Date) {
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return "—";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

/** 24 Oct 2026, 10:00 AM */
export const dateTimeText = (v: string | Date) => `${dateText(v)}, ${timeText(v)}`;

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 1:05 */
export function durationText(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "John Smith" -> "JS" */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

// The API's codes in plain words.
const LABELS: Record<string, string> = {
  SELF_SURVEY_INPROGRESS: "Self survey in progress",
  CUSTOMER_QUOTE_ISSUED_STATE: "Quote issued",
  QUOTE_REJECTED_STATE: "Quote rejected",
  NEW: "New",
  SEA: "Sea",
  ROAD: "Road",
  AIR: "Air",
};

/** "SELF_SURVEY_INPROGRESS" -> "Self survey in progress"; text that isn't a code is kept as it is. */
export function labelOf(code?: string) {
  if (!code) return "";
  if (LABELS[code]) return LABELS[code];
  if (/[a-z]/.test(code)) return code;
  const s = code.replace(/_STATE$/, "").replace(/INPROGRESS/g, "IN_PROGRESS").replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
