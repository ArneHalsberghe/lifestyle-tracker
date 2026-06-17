"use client";

import { useState, useTransition } from "react";
import { setWeeklyBudget } from "@/app/dashboard/gambling/actions";

export default function BudgetSettings({
  current,
}: {
  current: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current?.toString() ?? "");
  const [error, setError] = useState("");
  const [pending, run] = useTransition();

  function save() {
    setError("");
    run(async () => {
      try {
        const num = value.trim() === "" ? null : Number(value);
        await setWeeklyBudget(num);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-accent underline-offset-2 hover:underline"
      >
        {current ? "Weekbudget aanpassen" : "Weekbudget instellen"}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <p className="text-xs text-muted">
        Max. netto verlies per week (€). Leeg laten = geen limiet.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="bv. 100"
          className="w-28 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={save}
          disabled={pending}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Bewaren
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl border border-border px-3 py-2 text-sm text-muted"
        >
          Annuleer
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
