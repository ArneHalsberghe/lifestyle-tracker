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

export async function addProject(name: string, hourlyRate: number) {
  const { supabase, userId } = await auth();
  if (!name.trim()) throw new Error("Geef een naam.");
  const { error } = await supabase.from("work_projects").insert({
    user_id: userId,
    name: name.trim(),
    hourly_rate: hourlyRate >= 0 ? hourlyRate : 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/work");
}

export async function updateProject(
  id: string,
  patch: { name?: string; hourly_rate?: number; active?: boolean },
) {
  const { supabase } = await auth();
  const { error } = await supabase
    .from("work_projects")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/work");
}

export async function logHours(projectId: string, date: string, hours: number) {
  const { supabase, userId } = await auth();
  const { error } = await supabase.from("work_logs").upsert(
    {
      user_id: userId,
      project_id: projectId,
      date,
      hours: hours >= 0 ? hours : 0,
    },
    { onConflict: "project_id,date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/work");
  revalidatePath("/dashboard");
}

export async function setMonthlyFixedCosts(amount: number | null) {
  const { supabase, userId } = await auth();
  const { error } = await supabase.from("finance_settings").upsert(
    { user_id: userId, monthly_fixed_costs: amount },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/work");
}
