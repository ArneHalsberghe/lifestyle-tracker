"use client";

import { useState, useTransition } from "react";
import { logWeight } from "./actions";

export default function WeightLogger({ lastWeight }: { lastWeight: number | null }) {
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [more, setMore] = useState(false);
  const [pending, run] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function save() {
    setError("");
    run(async () => {
      try {
        await logWeight({
          weight_kg: Number(weight),
          body_fat_pct: fat ? Number(fat) : null,
          muscle_mass_kg: muscle ? Number(muscle) : null,
        });
        setDone(true);
        setWeight("");
        setFat("");
        setMuscle("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">⚖️ Gewicht</h2>
        {lastWeight != null && (
          <span className="text-xs text-muted">laatst: {lastWeight} kg</span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">Wekelijks (maandag) wegen.</p>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={weight}
          onChange={(e) => {
            setWeight(e.target.value);
            setDone(false);
          }}
          placeholder="kg"
          className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          disabled={pending || !weight}
          onClick={save}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Bewaren
        </button>
        {done && <span className="text-sm text-emerald-400">✓</span>}
      </div>

      <button
        onClick={() => setMore((m) => !m)}
        className="mt-2 text-xs text-accent"
      >
        {more ? "− minder" : "+ vetpercentage / spiermassa"}
      </button>
      {more && (
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            step="0.1"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            placeholder="vet %"
            className="w-24 rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            type="number"
            step="0.1"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
            placeholder="spier kg"
            className="w-24 rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </section>
  );
}
