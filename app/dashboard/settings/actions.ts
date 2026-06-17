"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");
  return { supabase, userId: user.id };
}

export async function setHousehold(enabled: boolean, minutes: number) {
  const { supabase, userId } = await auth();
  const { error } = await supabase.from("app_settings").upsert(
    {
      user_id: userId,
      household_enabled: enabled,
      household_minutes: minutes > 0 ? Math.round(minutes) : 10,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/checkin");
}

export async function generateHealthToken(): Promise<string> {
  const { supabase, userId } = await auth();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("app_settings").upsert(
    { user_id: userId, health_token: token },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
  return token;
}

export async function setReminderPref(input: {
  key: string;
  enabled: boolean;
  hour: number;
  minute: number;
}) {
  const { supabase, userId } = await auth();
  const { error } = await supabase.from("reminder_prefs").upsert(
    {
      user_id: userId,
      reminder_key: input.key,
      enabled: input.enabled,
      hour: Math.min(23, Math.max(0, Math.round(input.hour))),
      minute: Math.min(59, Math.max(0, Math.round(input.minute))),
    },
    { onConflict: "user_id,reminder_key" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function setTaxRate(ratePct: number) {
  const { supabase, userId } = await auth();
  const rate = Math.min(100, Math.max(0, ratePct)) / 100;
  const { error } = await supabase.from("finance_settings").upsert(
    { user_id: userId, income_tax_rate: rate },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/work");
}
