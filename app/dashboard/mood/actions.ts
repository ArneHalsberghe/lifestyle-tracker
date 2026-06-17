"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = new Set([
  "up_before_9",
  "no_daytime_sleep",
  "steps_7000",
  "enough_water",
  "ate_healthy",
  "no_impulse_spending",
  "no_online_gambling",
  "slept_on_time",
  "household_done",
]);

function brusselsToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(new Date());
}

export async function toggleHabit(key: string, value: boolean) {
  if (!ALLOWED.has(key)) throw new Error("Onbekende gewoonte");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const { error } = await supabase.from("daily_habits").upsert(
    { user_id: user.id, date: brusselsToday(), [key]: value },
    { onConflict: "user_id,date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/mood");
  revalidatePath("/dashboard/checkin");
}
