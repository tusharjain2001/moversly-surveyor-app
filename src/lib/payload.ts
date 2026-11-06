// What we send when the surveyor submits. A proposal for the tech team (docs/API-NEEDED.md):
// they may ask for different names. Sizes are cm, volumes cft and m³.
import type { Appointment, Survey } from "./types";
import { itemM3, roomCount, roomM3, surveyCount, surveyM3, surveyRooms, toCm, toFt3, unitM3 } from "./units";

const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildSurveyPayload(survey: Survey, appointment?: Appointment) {
  const total = surveyM3(survey);
  return {
    appointment_id: survey.appointmentId,
    order_id: appointment?.orderId ?? null,
    started_at: survey.startedAt,
    submitted_at: new Date().toISOString(),
    total_items: surveyCount(survey),
    total_volume_ft3: r2(toFt3(total)),
    total_volume_m3: r2(total),
    rooms: surveyRooms(survey)
      .filter((r) => r.items.length > 0)
      .map((r) => ({
        name: r.name,
        method: r.manual ? "manual" : "video",
        item_count: roomCount(r),
        volume_ft3: r2(toFt3(roomM3(r))),
        items: r.items.map((it) => ({
          name: it.label,
          key: it.key,
          length_cm: toCm(it.dims[0]),
          width_cm: toCm(it.dims[1]),
          height_cm: toCm(it.dims[2]),
          quantity: it.qty,
          unit_volume_ft3: r2(toFt3(unitM3(it))),
          volume_ft3: r2(toFt3(itemM3(it))),
          volume_m3: r2(itemM3(it)),
          source: it.confidence === "manual" ? "manual" : "ai",
          confidence: it.confidence,
          note: it.comment || "",
          // Photo with the item's outline (JPEG, ~20 KB). Format to agree with the tech team.
          image: it.thumbnail ?? null,
        })),
      })),
    notes: survey.notes,
    voice_notes: survey.voiceNotes.map((n) => ({
      recorded_at: n.createdAt,
      duration_seconds: Math.round(n.durationMs / 1000),
      transcript: n.transcript ?? null,
    })),
  };
}
