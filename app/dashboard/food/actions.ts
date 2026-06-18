"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MEALS, type MealKey } from "@/lib/food";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");
  return { supabase, userId: user.id };
}

async function patchFoodDay(date: string, patch: Record<string, unknown>) {
  const { supabase, userId } = await auth();
  const { error } = await supabase.from("food_days").upsert(
    { user_id: userId, date, ...patch },
    { onConflict: "user_id,date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/food");
  revalidatePath("/dashboard/checkin");
}

export async function setMealEaten(date: string, meal: MealKey, eaten: boolean | null) {
  const def = MEALS.find((m) => m.key === meal)!;
  const patch: Record<string, unknown> = { [def.eatenCol]: eaten };
  if (eaten !== true) patch[def.healthyCol] = null;
  await patchFoodDay(date, patch);
}

export async function setMealHealthy(date: string, meal: MealKey, healthy: boolean) {
  const def = MEALS.find((m) => m.key === meal)!;
  await patchFoodDay(date, { [def.eatenCol]: true, [def.healthyCol]: healthy });
}

export async function setAlcohol(date: string, units: number) {
  await patchFoodDay(date, { alcohol_units: units >= 0 ? units : 0 });
}

export async function markCaffeine(date: string, which: "first" | "last") {
  const col = which === "first" ? "first_caffeine_at" : "last_caffeine_at";
  await patchFoodDay(date, { [col]: new Date().toISOString() });
}

export async function clearCaffeine(date: string, which: "first" | "last") {
  const col = which === "first" ? "first_caffeine_at" : "last_caffeine_at";
  await patchFoodDay(date, { [col]: null });
}

export async function saveFoodNotes(date: string, notes: string) {
  await patchFoodDay(date, { notes: notes.trim() || null });
}

export async function addSnack(
  date: string,
  input: { healthy: boolean | null; note?: string },
) {
  const { supabase, userId } = await auth();
  const { error } = await supabase.from("snacks").insert({
    user_id: userId,
    date,
    healthy: input.healthy,
    note: input.note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/food");
}

export async function deleteSnack(id: string) {
  const { supabase } = await auth();
  await supabase.from("snacks").delete().eq("id", id);
  revalidatePath("/dashboard/food");
}
