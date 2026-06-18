import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { FinanceCategory, FinanceMonthly } from "@/lib/types";
import FinanceClient, { type CatWithAmount } from "./FinanceClient";

export const dynamic = "force-dynamic";

function currentMonth() {
  const t = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(
    new Date(),
  );
  return t.slice(0, 8) + "01";
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}-01$/.test(sp.month ?? "")
    ? (sp.month as string)
    : currentMonth();

  const [{ data: catsData }, { data: monthlyData }] = await Promise.all([
    supabase
      .from("finance_categories")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase.from("finance_monthly").select("*").eq("month", month),
  ]);

  const cats = (catsData ?? []) as FinanceCategory[];
  const monthly = (monthlyData ?? []) as FinanceMonthly[];
  const amountByCat = new Map(monthly.map((m) => [m.category_id, Number(m.amount)]));

  const withAmounts: CatWithAmount[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    direction: c.direction,
    amount: amountByCat.get(c.id) ?? 0,
  }));

  return (
    <main className="px-4 pb-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">💶 Financiën</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>
      <p className="mt-1 text-sm text-muted">
        Inkomsten en uitgaven per maand, met je eigen categorieën.
      </p>

      <FinanceClient month={month} categories={withAmounts} />
    </main>
  );
}
