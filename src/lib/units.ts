import type { Item, Room, Survey } from "./types";

export const M3_TO_FT3 = 35.3147;

/** Volume of one unit, m³. */
export const unitM3 = (it: Item) => it.dims[0] * it.dims[1] * it.dims[2];
/** Volume of the line (all units), m³. */
export const itemM3 = (it: Item) => unitM3(it) * it.qty;
export const roomM3 = (room: Room) => room.items.reduce((s, it) => s + itemM3(it), 0);
export const roomCount = (room: Room) => room.items.reduce((n, it) => n + it.qty, 0);

/** Rooms that are part of the survey: ticked, or already holding items. */
export const surveyRooms = (s: Survey) => s.rooms.filter((r) => r.selected || r.items.length > 0);
export const surveyM3 = (s: Survey) => surveyRooms(s).reduce((t, r) => t + roomM3(r), 0);
export const surveyCount = (s: Survey) => surveyRooms(s).reduce((t, r) => t + roomCount(r), 0);

export const toFt3 = (m3: number) => m3 * M3_TO_FT3;
export const cft = (m3: number) => `${toFt3(m3).toFixed(1)} cft`;
export const m3Text = (m3: number) => `${m3.toFixed(2)} m³`;
export const dimsText = (d: Item["dims"]) => `${d.map((m) => Math.round(m * 100)).join(" × ")} cm`;
export const toCm = (m: number) => Math.round(m * 100);
