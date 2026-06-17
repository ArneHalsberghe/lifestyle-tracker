"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TZ, brusselsHM, GOAL_WAKE_H, GOAL_WAKE_GRACE_MIN } from "@/lib/sleep";

function brusselsToday(): string {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");
  return { supabase, userId: user.id };
}

async function findOpenNight(
  supabase: Awaited<ReturnType<typeof auth>>["supabase"],
) {
  const { data } = await supabase
    .from("sleep_logs")
    .select("id, sleep_start_at, wake_at")
    .is("wake_at", null)
    .not("sleep_start_at", "is", null)
    .order("sleep_start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** "Telefoon weg — slapen": start (of herstart) de nacht. */
export async function goToSleep() {
  const { supabase, userId } = await auth();
  const now = new Date().toISOString();
  const open = await findOpenNight(supabase);

  if (open) {
    await supabase
      .from("sleep_logs")
      .update({ sleep_start_at: now })
      .eq("id", open.id);
  } else {
    const { error } = await supabase.from("sleep_logs").insert({
      user_id: userId,
      date: brusselsToday(),
      sleep_start_at: now,
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/dashboard/sleep");
}

/** "Dag starten — gsm nemen": sluit de nacht af. */
export async function wakeUp() {
  const { supabase, userId } = await auth();
  const open = await findOpenNight(supabase);
  if (!open) throw new Error("Er loopt geen nacht. Druk eerst op 'telefoon weg'.");

  const now = new Date().toISOString();
  const duration = open.sleep_start_at
    ? Math.round(
        (Date.now() - new Date(open.sleep_start_at).getTime()) / 60000,
      )
    : null;

  const date = brusselsToday();

  const { error } = await supabase
    .from("sleep_logs")
    .update({ wake_at: now, date, duration_min: duration })
    .eq("id", open.id);
  if (error) throw new Error(error.message);

  // Leid de gewoontes automatisch af uit de knop-tijden (geen vraag meer in de check-in).
  const sleptOnTime = open.sleep_start_at
    ? brusselsHM(open.sleep_start_at).h >= 12 // naar bed vóór middernacht
    : null;
  const wake = brusselsHM(now);
  const upBefore9 = wake.h * 60 + wake.m <= GOAL_WAKE_H * 60 + GOAL_WAKE_GRACE_MIN;

  await supabase.from("daily_habits").upsert(
    {
      user_id: userId,
      date,
      slept_on_time: sleptOnTime,
      up_before_9: upBefore9,
    },
    { onConflict: "user_id,date" },
  );

  revalidatePath("/dashboard/sleep");
  revalidatePath("/dashboard/checkin");
  revalidatePath("/dashboard");
}

/** Per ongeluk gedrukt: maak de lopende nacht ongedaan. */
export async function cancelSleep() {
  const { supabase } = await auth();
  const open = await findOpenNight(supabase);
  if (open) {
    await supabase.from("sleep_logs").delete().eq("id", open.id);
  }
  revalidatePath("/dashboard/sleep");
}

export async function logNap(input: { durationMin?: number; note?: string }) {
  const { supabase, userId } = await auth();
  const { error } = await supabase.from("naps").insert({
    user_id: userId,
    date: brusselsToday(),
    duration_min: input.durationMin ?? null,
    note: input.note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/sleep");
}

export async function deleteNap(id: string) {
  const { supabase } = await auth();
  await supabase.from("naps").delete().eq("id", id);
  revalidatePath("/dashboard/sleep");
}
