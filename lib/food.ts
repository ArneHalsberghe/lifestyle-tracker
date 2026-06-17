import type { FoodDay } from "@/lib/types";

export type MealKey = "breakfast" | "lunch" | "dinner";

export interface MealDef {
  key: MealKey;
  label: string;
  emoji: string;
  eatenCol: keyof FoodDay;
  healthyCol: keyof FoodDay;
}

export const MEALS: MealDef[] = [
  {
    key: "breakfast",
    label: "Ontbijt",
    emoji: "🥣",
    eatenCol: "breakfast_eaten",
    healthyCol: "breakfast_healthy",
  },
  {
    key: "lunch",
    label: "Middagmaal",
    emoji: "🥗",
    eatenCol: "lunch_eaten",
    healthyCol: "lunch_healthy",
  },
  {
    key: "dinner",
    label: "Avondmaal",
    emoji: "🍽️",
    eatenCol: "dinner_eaten",
    healthyCol: "dinner_healthy",
  },
];

export const TZ = "Europe/Brussels";

export function brusselsToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("nl-BE", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
