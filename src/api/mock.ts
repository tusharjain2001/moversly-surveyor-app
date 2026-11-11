// Sample customers for a demo without a login (EXPO_PUBLIC_USE_MOCK=true in config.ts).
// Same fields as the leads API; dates are relative to today.
import type { Appointment, Surveyor } from "@/lib/types";

const at = (offsetDays: number, hour = 0, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

export const MOCK_USER: Surveyor = { id: "u-1", name: "Arun Kumar", role: "Surveyor", email: "arun@moversly.com" };

const lead = (id: string, name: string, phone: string, email: string, from: string, to: string, movingIn: number, apptDay: number, apptHour: number, extra: Partial<Appointment> = {}): Appointment => ({
  id,
  customer: { name, phone, email },
  from,
  to,
  movingDate: at(movingIn),
  appointmentAt: at(apptDay, apptHour),
  appointmentStatus: "ACCEPTED",
  orderState: "SELF_SURVEY_INPROGRESS",
  shipmentMode: "SEA",
  ...extra,
});

const appointments: Appointment[] = [
  lead("05112026_082048_000101", "John Smith", "91234567", "john.smith@email.com", "12 Holland Road, #08-03, 258716, SG", "Sydney, AU", 7, 0, 10),
  lead("05112026_090512_000102", "Maria Fernandes", "82345678", "maria.f@email.com", "88 Tanjong Pagar Road, #15-11, 088509, SG", "London, GB", 23, 0, 14, { appointmentStatus: "ACTIVE" }),
  lead("06112026_111204_000104", "Priya Sharma", "94567890", "priya.sharma@email.com", "21 Pasir Ris Drive 3, #10-21, 519498, SG", "Mumbai, IN", 40, 1, 11, { volumeFt3: 400 }),
  lead("06112026_123010_000105", "Wei Ling Tan", "95678901", "weiling.tan@email.com", "3 Toh Tuck Road, #02-07, 596693, SG", "Singapore, SG", 45, 2, 15, { shipmentMode: "ROAD", orderState: "CUSTOMER_QUOTE_ISSUED_STATE", volumeFt3: 975 }),
];

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export async function login(userName: string, password: string) {
  await wait(600);
  if (!userName.trim() || !password) throw new Error("Please enter your email and password.");
  return { token: "demo-token", user: { ...MOCK_USER, email: userName } };
}

export async function listAppointments() {
  await wait();
  return appointments.map((a) => ({ ...a }));
}

export async function getAppointment(id: string) {
  await wait(150);
  const a = appointments.find((x) => x.id === id);
  if (!a) throw new Error("This customer is no longer in your list.");
  return { ...a };
}

export async function submitSurvey(id: string) {
  await wait(800);
  if (__DEV__) console.log("[mock] survey saved for", id);
}
