import type { IconName } from "./ui";

const ROOM_ICONS: [RegExp, IconName][] = [
  [/living|lounge/i, "tv-outline"],
  [/dining/i, "restaurant-outline"],
  [/bed/i, "bed-outline"],
  [/kitchen/i, "flame-outline"],
  [/study|office/i, "desktop-outline"],
  [/storage|other|store/i, "cube-outline"],
  [/balcony|garden/i, "leaf-outline"],
  [/bath/i, "water-outline"],
];

/** An icon that fits the room's name. */
export const roomIcon = (name: string): IconName => ROOM_ICONS.find(([re]) => re.test(name))?.[1] ?? "grid-outline";
