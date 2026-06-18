import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { brusselsToday } from "@/lib/food";
import type { FoodDay, Snack } from "@/lib/types";
import DateNav from "@/components/DateNav";
import FoodLogger from "./FoodLogger";

export const dynamic = "force-dynamic";

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const today = brusselsToday();
  const sp = await searchParams;
  const date = sp.date && sp.date <= today ? sp.date : today;

  const [{ data: food }, { data: snacks }] = await Promise.all([
    supabase.from("food_days").select("*").eq("date", date).maybeSingle(),
    supabase
      .from("snacks")
      .select("*")
      .eq("date", date)
      .order("eaten_at", { ascending: true }),
  ]);

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">🍽️ Eten & drinken</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>
      <p className="mt-1 text-sm text-muted">
        Geen calorieën tellen — gewoon aanduiden wat je at en hoe gezond het was.
      </p>

      <DateNav date={date} basePath="/dashboard/food" />

      <FoodLogger
        key={date}
        food={(food as FoodDay) ?? null}
        snacks={(snacks as Snack[]) ?? []}
        date={date}
      />
    </main>
  );
}
