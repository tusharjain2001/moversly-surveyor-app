// Sample data used until the tech team's API is ready (USE_MOCK in config.ts).
// Dates are made relative to today so "Today's schedule" always has visits.
import type { Appointment, Surveyor } from "@/lib/types";

const day = (offset: number, hour = 0, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, min, 0, 0);
  return d;
};
const iso = (d: Date) => d.toISOString();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const MOCK_USER: Surveyor = {
  id: "u-1",
  name: "Arun Kumar",
  role: "Relocation Surveyor",
  email: "arun@moversly.com",
};

const appointments: Appointment[] = [
  {
    id: "a-101", orderId: "05112026_082048_000101",
    customer: { name: "John Smith", phone: "+65 9123 4567", email: "john.smith@email.com" },
    origin: "Singapore", destination: "Sydney, Australia",
    address: "12 Holland Road, #08-03, Singapore 258716",
    movingDate: ymd(day(7)), surveyAt: iso(day(0, 10)), moveSize: "Full household", status: "pending",
    source: "instant-booking.moversly.com",
  },
  {
    id: "a-102", orderId: "05112026_090512_000102",
    customer: { name: "Maria Fernandes", phone: "+65 8234 5678", email: "maria.f@email.com" },
    origin: "Singapore", destination: "London, UK",
    address: "88 Tanjong Pagar Road, #15-11, Singapore 088509",
    movingDate: ymd(day(23)), surveyAt: iso(day(0, 14)), moveSize: "Partial household", status: "pending",
    source: "Moving to UK page",
  },
  {
    id: "a-103", orderId: "05112026_101533_000103",
    customer: { name: "David Lee", phone: "+65 9345 6789", email: "david.lee@email.com" },
    origin: "Singapore", destination: "New York, USA",
    address: "5 Bukit Timah Road, #03-02, Singapore 229838",
    movingDate: ymd(day(30)), surveyAt: iso(day(0, 16, 30)), moveSize: "Full household", status: "pending",
    source: "Talk to AI",
  },
  {
    id: "a-104", orderId: "06112026_111204_000104",
    customer: { name: "Priya Sharma", phone: "+65 9456 7890", email: "priya.sharma@email.com" },
    origin: "Singapore", destination: "Mumbai, India",
    address: "21 Pasir Ris Drive 3, #10-21, Singapore 519498",
    movingDate: ymd(day(40)), surveyAt: iso(day(1, 11)), moveSize: "Full household", status: "pending",
    source: "Moving to India page",
  },
  {
    id: "a-105", orderId: "06112026_123010_000105",
    customer: { name: "Wei Ling Tan", phone: "+65 9567 8901", email: "weiling.tan@email.com" },
    origin: "Singapore", destination: "Bengaluru, India",
    address: "3 Toh Tuck Road, #02-07, Singapore 596693",
    movingDate: ymd(day(45)), surveyAt: iso(day(2, 15)), moveSize: "A few boxes", status: "pending",
    source: "Moving to India page",
  },
  {
    id: "a-099", orderId: "03112026_094400_000099",
    customer: { name: "Ahmed Khan", phone: "+65 9678 9012", email: "ahmed.khan@email.com" },
    origin: "Singapore", destination: "Dubai, UAE",
    address: "40 Marine Parade Road, #12-04, Singapore 449305",
    movingDate: ymd(day(12)), surveyAt: iso(day(-1, 10)), moveSize: "Full household", status: "completed",
    source: "instant-booking.moversly.com",
  },
];

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export async function login(email: string, password: string) {
  await wait(600);
  if (!email.includes("@") || !password) throw new Error("Please enter your email and password.");
  return { token: "demo-token", user: { ...MOCK_USER, email } };
}

export async function listAppointments() {
  await wait();
  return appointments.map((a) => ({ ...a }));
}

export async function getAppointment(id: string) {
  await wait(150);
  const a = appointments.find((x) => x.id === id);
  if (!a) throw new Error("This appointment was not found.");
  return { ...a };
}

export async function getStats() {
  await wait(150);
  // A made-up history plus today's sample list.
  return {
    completed: 37 + appointments.filter((a) => a.status === "completed").length,
    pending: appointments.filter((a) => a.status === "pending").length,
  };
}

export async function submitSurvey(appointmentId: string, payload: unknown) {
  await wait(800);
  const a = appointments.find((x) => x.id === appointmentId);
  if (a) a.status = "completed";
  if (__DEV__) console.log("[mock] survey submitted", appointmentId, JSON.stringify(payload).length, "bytes");
}
