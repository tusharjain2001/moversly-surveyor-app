import type { Room, Survey } from "./types";

/** The next ticked room still to scan, after `afterId` (wrapping round). */
export function nextRoom(s: Survey, afterId?: string): Room | undefined {
  const sel = s.rooms.filter((r) => r.selected);
  const i = afterId ? sel.findIndex((r) => r.id === afterId) : -1;
  const ordered = i >= 0 ? [...sel.slice(i + 1), ...sel.slice(0, i)] : sel;
  return ordered.find((r) => r.status === "empty" || r.status === "error");
}

export const isBusy = (r: Room) => r.status === "uploading" || r.status === "processing";
