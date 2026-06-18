"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEUR } from "@/lib/gambling";
import { addCategory, deleteCategory, setMonthly } from "./actions";

export interface CatWithAmount {
  id: string;
  name: string;
  direction: "in" | "out";
  amount: number;
}

function shiftMonth(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 8) + "01";
}
function monthLabel(iso: string) {
  return new Intl.DateTimeFormat("nl-BE", { month: "long", year: "numeric" }).format(
    new Date(iso + "T12:00:00Z"),
  );
}

export default function FinanceClient({
  month,
  categories,
}: {
  month: string;
  categories: CatWithAmount[];
}) {
  const router = useRouter();
  const income = categories.filter((c) => c.direction === "in");
  const expense = categories.filter((c) => c.direction === "out");
  const incomeTotal = income.reduce((s, c) => s + c.amount, 0);
  const expenseTotal = expense.reduce((s, c) => s + c.amount, 0);
  const net = incomeTotal - expenseTotal;

  const go = (n: number) => router.push(`/dashboard/finance?month=${shiftMonth(month, n)}`);

  return (
    <div className="mt-3">
      {/* Month nav */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-2 py-1.5">
        <button onClick={() => go(-1)} className="rounded-lg px-3 py-1.5 text-lg text-muted active:bg-bg">‹</button>
        <span className="text-sm font-medium capitalize">{monthLabel(month)}</span>
        <button onClick={() => go(1)} className="rounded-lg px-3 py-1.5 text-lg text-muted active:bg-bg">›</button>
      </div>

      {/* Totals */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        <Card label="Inkomsten" value={formatEUR(incomeTotal)} tone="good" />
        <Card label="Uitgaven" value={formatEUR(expenseTotal)} tone="bad" />
        <Card label="Netto" value={formatEUR(net)} tone={net >= 0 ? "good" : "bad"} />
      </section>

      <CategoryGroup title="💰 Inkomsten" cats={income} month={month} empty="Nog geen inkomsten-categorieën." />
      <CategoryGroup title="💸 Uitgaven" cats={expense} month={month} empty="Nog geen uitgaven-categorieën." />

      <AddCategory />
    </div>
  );
}

function CategoryGroup({
  title,
  cats,
  month,
  empty,
}: {
  title: string;
  cats: CatWithAmount[];
  month: string;
  empty: string;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {cats.length === 0 ? (
        <p className="mt-2 text-xs text-muted">{empty}</p>
      ) : (
        <div className="mt-2 divide-y divide-border">
          {cats.map((c) => (
            <CatRow key={c.id} cat={c} month={month} />
          ))}
        </div>
      )}
    </section>
  );
}

function CatRow({ cat, month }: { cat: CatWithAmount; month: string }) {
  const [value, setValue] = useState(cat.amount ? String(cat.amount) : "");
  const [pending, run] = useTransition();

  function save() {
    const n = Number(value) || 0;
    if (n !== cat.amount) run(() => setMonthly(cat.id, month, n));
  }

  return (
    <div className="flex items-center justify-between gap-2 py-2.5">
      <span className="min-w-0 flex-1 truncate text-sm">{cat.name}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted">€</span>
        <input
          type="number"
          inputMode="decimal"
          step="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          disabled={pending}
          placeholder="0"
          className="w-24 rounded-xl border border-border bg-bg px-3 py-2 text-right text-sm outline-none focus:border-accent"
        />
      </div>
      <button
        onClick={() => {
          if (confirm(`Categorie "${cat.name}" verwijderen?`)) run(() => deleteCategory(cat.id));
        }}
        disabled={pending}
        className="text-xs text-muted hover:text-red-400"
        aria-label="verwijderen"
      >
        ✕
      </button>
    </div>
  );
}

function AddCategory() {
  const [name, setName] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [pending, run] = useTransition();

  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Categorie toevoegen</h2>
      <div className="mt-3 flex gap-1.5">
        <button
          onClick={() => setDirection("in")}
          className={`flex-1 rounded-xl border py-2 text-sm ${
            direction === "in" ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : "border-border text-muted"
          }`}
        >
          Inkomst
        </button>
        <button
          onClick={() => setDirection("out")}
          className={`flex-1 rounded-xl border py-2 text-sm ${
            direction === "out" ? "border-red-500 bg-red-500/15 text-red-400" : "border-border text-muted"
          }`}
        >
          Uitgave
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bv. Huurinkomsten, Hypotheek, Auto…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          disabled={pending || !name.trim()}
          onClick={() =>
            run(async () => {
              await addCategory(name, direction);
              setName("");
            })
          }
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          +
        </button>
      </div>
    </section>
  );
}

function Card({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-text";
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 text-base font-semibold ${color}`}>{value}</p>
    </div>
  );
}
