"use client";

import { useState, useTransition } from "react";
import { HABITS } from "@/lib/checkin";
import { toggleHabit } from "./actions";

export default function HabitChecklist({
  initial,
  householdEnabled,
  householdMinutes,
}: {
  initial: Record<string, boolean>;
  householdEnabled: boolean;
  householdMinutes: number;
}) {
  const [state, setState] = useState<Record<string, boolean>>(initial);
  const [pending, run] = useTransition();

  const rows = [
    ...HABITS.map((h) => ({ key: h.key as string, label: h.label })),
    ...(householdEnabled
      ? [{ key: "household_done", label: `🧹 ${householdMinutes} min huishouden` }]
      : []),
  ];

  const done = rows.filter((r) => state[r.key]).length;

  function flip(key: string) {
    const next = !state[key];
    setState((s) => ({ ...s, [key]: next }));
    run(() => toggleHabit(key, next));
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">✅ Gewoontes vandaag</h2>
        <span className="text-xs text-muted">
          {done}/{rows.length}
        </span>
      </div>
      <ul className="mt-2">
        {rows.map((r) => (
          <li key={r.key}>
            <button
              onClick={() => flip(r.key)}
              disabled={pending}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm active:bg-bg disabled:opacity-60"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs ${
                  state[r.key]
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                    : "border-border text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={state[r.key] ? "" : "text-muted"}>{r.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
