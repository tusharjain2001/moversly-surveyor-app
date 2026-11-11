// What create-order-for-pricing needs to save the survey on the customer's order.
// Tested on a test order (Nov 2026):
//  - It fails without the customer's details ("Name is null"): shipment_mode, shipment_type,
//    moving_type, moving_date, name, email, phone, origin_country and destination_country.
//  - It OVERWRITES the order with whatever it is sent (missing addresses became "null"), so we
//    copy the details unchanged from GET /api/v1/order/{id}. Checked: two saves left the name,
//    email, phone, addresses, moving date and move type exactly as they were.
//  - Each call REPLACES the items saved before, so one call per room (as in their document) kept
//    only the last room. Until room_name can take a list (tech team, Nov 2026), we send every
//    room's items in ONE call with the room names joined by commas, like the Moving to India page.
import type { Survey } from "./types";
import { M3_TO_FT3, roomM3, surveyRooms, unitM3 } from "./units";

const KG_PER_M3 = 110; // the AI gives no weights; same estimate as the Moving to India page

/** First value of `key` anywhere inside `o`. */
function find(o: unknown, key: string): any {
  const queue: unknown[] = [o];
  while (queue.length) {
    const cur = queue.shift();
    if (!cur || typeof cur !== "object") continue;
    for (const [k, v] of Object.entries(cur)) if (k === key && v != null) return v;
    for (const v of Object.values(cur)) if (v && typeof v === "object") queue.push(v);
  }
  return undefined;
}

/** The backend saves street_lines as "<address> , <country>": take the country back off. */
function addressOf(a: any) {
  let s = String(a?.street_lines ?? "").trim();
  const suffix = a?.country_name ? ` , ${a.country_name}` : "";
  if (suffix && s.endsWith(suffix)) s = s.slice(0, -suffix.length).trim();
  if (!s || s === "null") s = String(a?.city ?? "").trim();
  return s === "null" ? "" : s;
}

/** The customer's own details from GET /api/v1/order/{id}, in the shape create-order-for-pricing takes. */
export function baseFromOrder(order: any) {
  const p = order?.payload ?? {};
  const u = p.user_info ?? {};
  const s = p.schedule_shipment ?? {};
  const sd = p.shipment_details ?? {};
  const from = s.from_address ?? {};
  const to = s.to_address ?? {};
  return {
    name: [u.given_name, u.family_name].map((x: unknown) => String(x ?? "").trim()).filter(Boolean).join(" "),
    email: String(u.email ?? ""),
    phone: String(u.contact_no || u.phone || ""),
    origin_country: String(from.country_name ?? ""),
    origin_postal_code: String(from.postal_code ?? ""),
    origin_address: addressOf(from),
    destination_country: String(to.country_name ?? ""),
    destination_postal_code: String(to.postal_code ?? ""),
    destination_address: addressOf(to),
    moving_date: s.moving_date ?? 0,
    shipment_mode: String(sd.shipment_mode || "SEA"),
    shipment_type: String(find(sd, "sea_designation") || "CONSOLE"),
    moving_type: String(find(sd, "moving_type") || "FULL_HOUSEHOLD"),
    need_packing: !!find(sd, "need_packing"),
  };
}

/** Our room names -> the names their system uses (LIVING ROOM, MASTER BED ROOM, BED ROOM 2…). */
const ROOM_NAMES: Record<string, string> = {
  "living room": "LIVING ROOM",
  "dining room": "DINING ROOM",
  "master bedroom": "MASTER BED ROOM",
  "master bed room": "MASTER BED ROOM",
  kitchen: "KITCHEN",
  balcony: "BALCONY",
  "storage / other": "STORAGE",
  storage: "STORAGE",
  "store room": "STORE ROOM",
  washroom: "WASHROOM",
  bathroom: "WASHROOM",
  entrance: "ENTRANCE",
  garage: "GARAGE",
};

export function backendRoomName(name: string) {
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  const bed = n.match(/^bed ?room ?(\d+)$/);
  if (bed) return `BED ROOM ${bed[1]}`;
  return ROOM_NAMES[n] ?? name.trim().toUpperCase();
}

/** The survey part of the request, all rooms together: room names joined by commas
 *  ("LIVING ROOM, BED ROOM 1"), every item, and the totals. Null when no room has items. */
export function surveyRequest(survey: Survey) {
  const rooms = surveyRooms(survey).filter((r) => r.items.length > 0);
  if (!rooms.length) return null;
  const items = rooms.flatMap((r) => r.items);
  const m3 = rooms.reduce((s, r) => s + roomM3(r), 0);
  const kg = items.reduce((s, it) => s + unitM3(it) * KG_PER_M3 * it.qty, 0);
  return {
    room_name: [...new Set(rooms.map((r) => backendRoomName(r.name)))].join(", "),
    volume: { magnitude: m3.toFixed(2), unit: "CUBIC_M" },
    items: items.map((it) => ({
      name: it.label,
      dimensions: it.dims.map((m) => Math.round(m * 100)).join(" x "),
      quantity: String(it.qty),
      volumeFt3: (unitM3(it) * M3_TO_FT3).toFixed(2),
      volumeM3: unitM3(it).toFixed(2),
      weightKg: String(Math.round(unitM3(it) * KG_PER_M3)),
    })),
    total_volume: Math.round(m3 * 100) / 100,
    total_volume_ft3: Math.round(m3 * M3_TO_FT3),
    total_weight: Math.round(kg),
    recommended_container: "",
  };
}
