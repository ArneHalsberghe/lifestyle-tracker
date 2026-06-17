"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function brusselsToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(new Date());
}

export async function logWorkout(input: {
  activity_type: string;
  duration_min: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");
  if (!input.activity_type) throw new Error("Kies een sport.");

  const { error } = await supabase.from("workouts").insert({
    user_id: user.id,
    started_at: new Date().toISOString(),
    activity_type: input.activity_type,
    duration_min: input.duration_min > 0 ? input.duration_min : null,
    source: "manueel",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/move");
  revalidatePath("/dashboard");
}

export async function logWeight(input: {
  weight_kg: number;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");
  if (!(input.weight_kg > 0)) throw new Error("Geef een geldig gewicht.");

  const { error } = await supabase.from("body_measurements").upsert(
    {
      user_id: user.id,
      date: brusselsToday(),
      weight_kg: input.weight_kg,
      body_fat_pct: input.body_fat_pct ?? null,
      muscle_mass_kg: input.muscle_mass_kg ?? null,
    },
    { onConflict: "user_id,date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/move");
  revalidatePath("/dashboard");
}
