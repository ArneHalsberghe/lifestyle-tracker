"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function brusselsToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(new Date());
}

export async function addJournalNote(content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");
  if (!content.trim()) throw new Error("Lege notitie");

  const { error } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    date: brusselsToday(),
    content: content.trim(),
    source: "self",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/journal");
}

export async function deleteJournalEntry(id: string) {
  const supabase = await createClient();
  await supabase.from("journal_entries").delete().eq("id", id);
  revalidatePath("/dashboard/journal");
}
