"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProfileInput {
  full_name: string;
  birthdate: string | null;
  height_cm: number | null;
  location: string;
  occupation: string;
  languages: string;
  medical_notes: string;
  goals: string;
  kpis: string;
  report: string;
}

export async function saveProfile(input: ProfileInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const { error } = await supabase.from("user_profile").upsert({
    user_id: user.id,
    full_name: input.full_name.trim() || null,
    birthdate: input.birthdate || null,
    height_cm: input.height_cm || null,
    location: input.location.trim() || null,
    occupation: input.occupation.trim() || null,
    languages: input.languages.trim() || null,
    medical_notes: input.medical_notes.trim() || null,
    goals: input.goals.trim() || null,
    kpis: input.kpis.trim() || null,
    report: input.report.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/profile");
}
