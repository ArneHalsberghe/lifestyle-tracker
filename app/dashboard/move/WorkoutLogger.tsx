"use client";

import { useState, useTransition } from "react";
import { logWorkout } from "./actions";

const SPORTS = ["lopen", "fietsen", "wandelen", "padel", "zwemmen"] as const;

const EMOJI: Record<string, string> = {
  lopen: "🏃",
  fietsen: "🚴",
  wandelen: "🚶",
  padel: "🎾",
  zwemmen: "🏊",
};

export default function WorkoutLogger() {
  const [sport, setSport] = useState<string>("padel");
  const [duration, setDuration] = useState("");
  const [pending, run] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function save() {
    setError("");
    run(async () => {
      try {
        await logWorkout({ activity_type: sport, duration_min: Number(duration) || 0 });
        setDone(true);
        setDuration("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">🏅 Sport loggen</h2>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {SPORTS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSport(s);
              setDone(false);
            }}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] ${
              sport === s
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted"
            }`}
          >
            <span className="text-lg">{EMOJI[s]}</span>
            {s}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          step="5"
          value={duration}
          onChange={(e) => {
            setDuration(e.target.value);
            setDone(false);
          }}
          placeholder="duur (min)"
          className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          disabled={pending || !duration}
          onClick={save}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Loggen
        </button>
        {done && <span className="text-sm text-emerald-400">✓</span>}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </section>
  );
}
