"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CheckinMetricKey, Phase } from "@/lib/checkin";

export interface SavePhaseInput {
  phase: Phase;
  date: string;
  metrics: Partial<Record<CheckinMetricKey, number | null>>;
  habits: Record<string, boolean>;
  food: Record<string, boolean | null>;
  alcohol?: number | null;
  spending?: number | null;
  notes?: string;
}

export async function savePhase(input: SavePhaseInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const doneCol = `${input.phase}_done`;

  // 1) subjective metrics + phase-done flag (+ notes in the evening)
  const checkinRow: Record<string, unknown> = {
    user_id: user.id,
    date: input.date,
    ...input.metrics,
    [doneCol]: true,
  };
  if (input.notes !== undefined) checkinRow.notes = input.notes.trim() || null;
  if (input.spending !== undefined) checkinRow.spending_eur = input.spending;

  const { error: e1 } = await supabase
    .from("daily_checkins")
    .upsert(checkinRow, { onConflict: "user_id,date" });
  if (e1) throw new Error(e1.message);

  // 2) habits (only the ones in this phase)
  if (Object.keys(input.habits).length > 0) {
    const { error: e2 } = await supabase
      .from("daily_habits")
      .upsert(
        { user_id: user.id, date: input.date, ...input.habits },
        { onConflict: "user_id,date" },
      );
    if (e2) throw new Error(e2.message);
  }

  // 3) food (meals + alcohol)
  const foodRow: Record<string, unknown> = { ...input.food };
  if (input.alcohol !== undefined) foodRow.alcohol_units = input.alcohol;
  if (Object.keys(foodRow).length > 0) {
    const { error: e3 } = await supabase
      .from("food_days")
      .upsert(
        { user_id: user.id, date: input.date, ...foodRow },
        { onConflict: "user_id,date" },
      );
    if (e3) throw new Error(e3.message);
  }

  revalidatePath("/dashboard/checkin");
  revalidatePath("/dashboard/food");
  revalidatePath("/dashboard");
}
