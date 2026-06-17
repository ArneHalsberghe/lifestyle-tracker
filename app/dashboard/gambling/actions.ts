"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EntryKind, GameType } from "@/lib/types";

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");
  return { supabase, userId: user.id };
}

export async function startSession(input: {
  gameType: GameType;
  platform?: string;
  initialIn?: number;
}) {
  const { supabase, userId } = await getUserId();

  // Prevent two running sessions at once.
  const { data: active } = await supabase
    .from("gambling_sessions")
    .select("id")
    .is("ended_at", null)
    .maybeSingle();
  if (active) throw new Error("Er loopt al een sessie.");

  const { data: session, error } = await supabase
    .from("gambling_sessions")
    .insert({
      user_id: userId,
      game_type: input.gameType,
      platform: input.platform?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (input.initialIn && input.initialIn > 0) {
    await supabase.from("gambling_entries").insert({
      user_id: userId,
      session_id: session.id,
      kind: "in",
      amount: input.initialIn,
      label: input.gameType === "poker" ? "buy-in" : "inzet",
    });
  }

  revalidatePath("/dashboard/gambling");
}

export async function addEntry(input: {
  sessionId: string;
  kind: EntryKind;
  amount: number;
  label?: string;
}) {
  const { supabase, userId } = await getUserId();
  if (!(input.amount > 0)) throw new Error("Bedrag moet groter dan 0 zijn.");

  const { error } = await supabase.from("gambling_entries").insert({
    user_id: userId,
    session_id: input.sessionId,
    kind: input.kind,
    amount: input.amount,
    label: input.label?.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/gambling");
}

export async function deleteEntry(entryId: string) {
  const { supabase } = await getUserId();
  const { error } = await supabase
    .from("gambling_entries")
    .delete()
    .eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/gambling");
}

export async function endSession(input: {
  sessionId: string;
  cashout?: number;
  notes?: string;
}) {
  const { supabase, userId } = await getUserId();

  if (input.cashout && input.cashout > 0) {
    await supabase.from("gambling_entries").insert({
      user_id: userId,
      session_id: input.sessionId,
      kind: "out",
      amount: input.cashout,
      label: "cashout",
    });
  }

  const { error } = await supabase
    .from("gambling_sessions")
    .update({
      ended_at: new Date().toISOString(),
      notes: input.notes?.trim() || null,
    })
    .eq("id", input.sessionId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/gambling");
}

export async function deleteSession(sessionId: string) {
  const { supabase } = await getUserId();
  const { error } = await supabase
    .from("gambling_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/gambling");
}

export async function setWeeklyBudget(limit: number | null) {
  const { supabase, userId } = await getUserId();
  const { error } = await supabase.from("gambling_limits").upsert({
    user_id: userId,
    weekly_loss_limit: limit,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/gambling");
}
