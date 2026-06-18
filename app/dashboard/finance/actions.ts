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

export async function addCategory(name: string, direction: "in" | "out") {
  const { supabase, userId } = await auth();
  if (!name.trim()) throw new Error("Geef een naam.");
  const { error } = await supabase.from("finance_categories").insert({
    user_id: userId,
    name: name.trim(),
    direction,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/finance");
}

export async function deleteCategory(id: string) {
  const { supabase } = await auth();
  const { error } = await supabase.from("finance_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/finance");
}

export async function setMonthly(categoryId: string, month: string, amount: number) {
  const { supabase, userId } = await auth();
  const { error } = await supabase.from("finance_monthly").upsert(
    {
      user_id: userId,
      category_id: categoryId,
      month,
      amount: Number.isFinite(amount) ? amount : 0,
    },
    { onConflict: "category_id,month" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/finance");
}
