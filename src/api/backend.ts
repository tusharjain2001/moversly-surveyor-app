// The Moversly tech team's API (api.moversly.com), from their "API For Mobile App" document:
//   POST /api/v1/auth/login                                  {user_name, password} -> tokens
//   GET  /api/v1/auth/user-info                              the logged-in user
//   GET  /api/v1/order/my-orders/for-app?show-summary=true   the user's leads ("matching_orders")
//   POST /api/v1/order/create-order-for-pricing              the survey items, all rooms in one call
// Plus GET /api/v1/order/{id} (also used by the Moving to India page): create-order-for-pricing
// fails without the customer's details and overwrites the order with whatever it is sent, so we
// read them first and send them back unchanged (see lib/saveRequest.ts).
import { baseFromOrder, surveyRequest } from "@/lib/saveRequest";
import type { Appointment, Survey, Surveyor } from "@/lib/types";
import { BACKEND_URL, USE_MOCK } from "./config";
import * as mock from "./mock";

let token: string | null = null;
let leads: Appointment[] | null = null;
export const setToken = (t: string | null) => {
  token = t;
  leads = null;
};

/** Called when the server says the login has expired (401), so the app can sign out. */
let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

async function req<T>(path: string, { method = "GET", body, auth = true }: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BACKEND_URL + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your internet and try again.");
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (res.status === 401 && auth && token) onUnauthorized?.();
  if (!res.ok) {
    // Their errors look like {"error_code": "PRO_ERR_014", "message": "Login failed. ..."}.
    const msg = (data && typeof data === "object" && (data.message || data.error || data.detail)) || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

/** First value for any of these keys, anywhere in a nested response (their shapes vary). */
function deepGet(obj: unknown, keys: string[]): any {
  const want = keys.map((k) => k.toLowerCase());
  const queue: unknown[] = [obj];
  while (queue.length) {
    const cur = queue.shift();
    if (!cur || typeof cur !== "object") continue;
    for (const [k, v] of Object.entries(cur)) if (want.includes(k.toLowerCase()) && v != null && v !== "") return v;
    for (const v of Object.values(cur)) if (v && typeof v === "object") queue.push(v);
  }
  return undefined;
}
const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

function toSurveyor(info: unknown, userName: string): Surveyor {
  const given = text(deepGet(info, ["given_name", "givenName", "first_name", "firstName"]));
  const family = text(deepGet(info, ["family_name", "familyName", "last_name", "lastName"]));
  const roleRaw = deepGet(info, ["role", "roles", "user_role", "userRole", "designation", "user_type", "userType"]);
  const role = Array.isArray(roleRaw) ? roleRaw.filter((r) => typeof r === "string").join(", ") : text(roleRaw);
  return {
    id: text(deepGet(info, ["id", "user_id", "userId", "sub"])),
    name: [given, family].filter(Boolean).join(" ") || text(deepGet(info, ["name", "full_name", "fullName"])) || userName,
    role,
    email: text(deepGet(info, ["email"])) || userName,
  };
}

/** Login, then the user's details. */
export async function login(userName: string, password: string): Promise<{ token: string; user: Surveyor }> {
  if (USE_MOCK) return mock.login(userName, password);
  const res = await req<unknown>("/api/v1/auth/login", { method: "POST", body: { user_name: userName, password }, auth: false });
  const access = text(deepGet(res, ["access_token", "accessToken"])) || text(deepGet(res, ["id_token", "idToken", "token"]));
  if (!access) throw new Error("Logged in, but the server didn't send a login token. Please tell the tech team.");
  token = access;
  const info = await req<unknown>("/api/v1/auth/user-info").catch(() => null);
  return { token: access, user: toSurveyor(info ?? res, userName) };
}

// One lead as the API sends it (only the fields we show).
interface Lead {
  request_id: string;
  given_name?: string | null;
  family_name?: string | null;
  phone?: string | null;
  contact_no?: string | null;
  email?: string | null;
  address?: string | null;
  from_address?: string | null;
  to_address?: string | null;
  moving_date?: number | null;
  appointment_date?: number | null;
  appointment_status?: string | null;
  order_state?: string | null;
  shipment_mode?: string | null;
  weight_or_volume?: string | null;
}

/** Epoch seconds (or milliseconds) -> ISO. */
const when = (s?: number | null) => (s ? new Date(s > 1e12 ? s : s * 1000).toISOString() : undefined);

/** "975.00 CUBIC_FT" -> 975; "0 CUBIC_FT" -> undefined. */
function cftOf(v?: string | null) {
  const m = (v || "").match(/([\d.]+)\s*CUBIC_(FT|M)/i);
  if (!m) return undefined;
  const n = Number(m[1]) * (m[2].toUpperCase() === "M" ? 35.3147 : 1);
  return n > 0 ? n : undefined;
}

function toAppointment(o: Lead): Appointment {
  return {
    id: o.request_id,
    customer: {
      name: [o.given_name, o.family_name].map((x) => (x || "").trim()).filter(Boolean).join(" ") || "Customer",
      phone: (o.contact_no || o.phone || "").trim(),
      email: (o.email || "").trim(),
    },
    from: (o.from_address || o.address || "").trim(),
    to: (o.to_address || "").trim(),
    movingDate: when(o.moving_date),
    appointmentAt: when(o.appointment_date),
    appointmentStatus: o.appointment_status || undefined,
    orderState: o.order_state || undefined,
    shipmentMode: o.shipment_mode || undefined,
    volumeFt3: cftOf(o.weight_or_volume),
  };
}

/** The logged-in user's leads. */
export async function listAppointments(): Promise<Appointment[]> {
  if (USE_MOCK) return mock.listAppointments();
  const res = await req<{ matching_orders?: Lead[] }>("/api/v1/order/my-orders/for-app?show-summary=true");
  leads = (res?.matching_orders ?? []).filter((o) => o?.request_id).map(toAppointment);
  return leads;
}

/** One lead (from the list; there's no single-lead call in the document). */
export async function getAppointment(id: string): Promise<Appointment> {
  if (USE_MOCK) return mock.getAppointment(id);
  const found = leads?.find((a) => a.id === id) ?? (await listAppointments()).find((a) => a.id === id);
  if (!found) throw new Error("This customer is no longer in your list.");
  return found;
}

/** Save the survey items on the customer's order: one create-order-for-pricing call with all rooms. */
export async function submitSurvey(id: string, survey: Survey): Promise<void> {
  if (USE_MOCK) return mock.submitSurvey(id);
  const part = surveyRequest(survey);
  if (!part) throw new Error("No items to save yet. Scan or add items in at least one room.");
  const order = await req<unknown>(`/api/v1/order/${encodeURIComponent(id)}`, { auth: false }).catch((e: Error) => {
    throw new Error(`Couldn't read this customer's order: ${e.message}`);
  });
  const base = baseFromOrder(order);
  if (!base.name || !base.origin_country || !base.destination_country) {
    throw new Error("This customer's order has no name or countries, so the items can't be saved yet. Please ask the office to complete the order.");
  }
  await req("/api/v1/order/create-order-for-pricing", { method: "POST", body: { order_id: id, ...base, ...part }, auth: false });
}
