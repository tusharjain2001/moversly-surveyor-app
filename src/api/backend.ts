// The tech team's API: login, the surveyor's appointments and saving the survey.
// The real paths and shapes are NOT known yet: every call below says what we need
// (see docs/API-NEEDED.md). Until then USE_MOCK serves sample data from mock.ts.
import type { Appointment, Surveyor } from "@/lib/types";
import { BACKEND_URL, USE_MOCK } from "./config";
import * as mock from "./mock";

let token: string | null = null;
export const setToken = (t: string | null) => {
  token = t;
};

/** Called when the server says the login has expired (401), so the app can sign out. */
let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

async function req<T>(path: string, { method = "GET", body }: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BACKEND_URL + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  if (res.status === 401 && token) onUnauthorized?.();
  if (!res.ok) {
    const msg = (data && typeof data === "object" && (data.message || data.error || data.detail)) || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

// TODO(tech team): login path and response.
export function login(email: string, password: string): Promise<{ token: string; user: Surveyor }> {
  if (USE_MOCK) return mock.login(email, password);
  return req("/TODO/surveyor/login", { method: "POST", body: { email, password } });
}

// TODO(tech team): the logged-in surveyor's visits (today, upcoming, completed).
export function listAppointments(): Promise<Appointment[]> {
  if (USE_MOCK) return mock.listAppointments();
  return req("/TODO/surveyor/appointments");
}

// TODO(tech team): one visit with the customer's details and full address.
export function getAppointment(id: string): Promise<Appointment> {
  if (USE_MOCK) return mock.getAppointment(id);
  return req(`/TODO/surveyor/appointments/${encodeURIComponent(id)}`);
}

// TODO(tech team): dashboard counts.
export function getStats(): Promise<{ completed: number; pending: number }> {
  if (USE_MOCK) return mock.getStats();
  return req("/TODO/surveyor/stats");
}

// TODO(tech team): save the finished survey (rooms, items, volume, notes, transcripts)
// and mark the visit as completed. Shape: lib/payload.ts.
export function submitSurvey(appointmentId: string, payload: unknown): Promise<void> {
  if (USE_MOCK) return mock.submitSurvey(appointmentId, payload);
  return req(`/TODO/surveyor/appointments/${encodeURIComponent(appointmentId)}/survey`, { method: "POST", body: payload });
}
