"use client";

import { useState, useTransition } from "react";
import type { FoodDay, Snack } from "@/lib/types";
import { MEALS, formatTime } from "@/lib/food";
import {
  addSnack,
  clearCaffeine,
  deleteSnack,
  markCaffeine,
  saveFoodNotes,
  setAlcohol,
  setMealEaten,
  setMealHealthy,
} from "./actions";

export default function FoodLogger({
  food,
  snacks,
}: {
  food: FoodDay | null;
  snacks: Snack[];
}) {
  const [pending, run] = useTransition();
  const act = (fn: () => Promise<void>) => run(() => fn());

  return (
    <div className="mt-4 space-y-4">
      {/* Meals */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium">Maaltijden</h2>
        <div className="mt-3 space-y-4">
          {MEALS.map((m) => {
            const eaten = food?.[m.eatenCol] as boolean | null | undefined;
            const healthy = food?.[m.healthyCol] as boolean | null | undefined;
            return (
              <div key={m.key}>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {m.emoji} {m.label}
                  </span>
                  <div className="flex gap-1.5">
                    <Pill
                      active={eaten === true}
                      tone="good"
                      disabled={pending}
                      onClick={() => act(() => setMealEaten(m.key, true))}
                    >
                      Gegeten
                    </Pill>
                    <Pill
                      active={eaten === false}
                      tone="bad"
                      disabled={pending}
                      onClick={() => act(() => setMealEaten(m.key, false))}
                    >
                      Niet
                    </Pill>
                  </div>
                </div>
                {eaten === true && (
                  <div className="mt-2 flex items-center justify-end gap-1.5">
                    <span className="mr-auto text-xs text-muted">Was het gezond?</span>
                    <Pill
                      active={healthy === true}
                      tone="good"
                      disabled={pending}
                      onClick={() => act(() => setMealHealthy(m.key, true))}
                    >
                      Gezond
                    </Pill>
                    <Pill
                      active={healthy === false}
                      tone="bad"
                      disabled={pending}
                      onClick={() => act(() => setMealHealthy(m.key, false))}
                    >
                      Niet gezond
                    </Pill>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Snacks */}
      <SnackSection snacks={snacks} pending={pending} run={run} />

      {/* Caffeine */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium">☕ Cafeïne</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <CaffeineBox
            label="Eerste vandaag"
            time={food?.first_caffeine_at ?? null}
            disabled={pending}
            onMark={() => act(() => markCaffeine("first"))}
            onClear={() => act(() => clearCaffeine("first"))}
          />
          <CaffeineBox
            label="Laatste vandaag"
            time={food?.last_caffeine_at ?? null}
            disabled={pending}
            onMark={() => act(() => markCaffeine("last"))}
            onClear={() => act(() => clearCaffeine("last"))}
          />
        </div>
      </section>

      {/* Alcohol */}
      <AlcoholSection
        units={food?.alcohol_units ?? 0}
        pending={pending}
        onChange={(u) => act(() => setAlcohol(u))}
      />

      {/* Notes */}
      <NotesSection initial={food?.notes ?? ""} pending={pending} run={run} />
    </div>
  );
}

function SnackSection({
  snacks,
  pending,
  run,
}: {
  snacks: Snack[];
  pending: boolean;
  run: (fn: () => Promise<void>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [note, setNote] = useState("");

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">🍫 Snacks vandaag</h2>

      {snacks.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {snacks.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-muted">
                {formatTime(s.eaten_at)}
                {s.healthy === true && " · 🟢 gezond"}
                {s.healthy === false && " · 🔴 ongezond"}
                {s.note ? ` · ${s.note}` : ""}
              </span>
              <button
                onClick={() => run(() => deleteSnack(s.id))}
                disabled={pending}
                className="text-xs text-muted hover:text-red-400"
                aria-label="verwijderen"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="mt-3 space-y-2">
          <div className="flex gap-1.5">
            <Pill active={healthy === true} tone="good" onClick={() => setHealthy(true)}>
              Gezond
            </Pill>
            <Pill active={healthy === false} tone="bad" onClick={() => setHealthy(false)}>
              Ongezond
            </Pill>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Wat at je? (optioneel)"
            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await addSnack({ healthy, note });
                  setOpen(false);
                  setHealthy(null);
                  setNote("");
                })
              }
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Snack opslaan
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted"
            >
              Annuleer
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-muted"
        >
          + Snack loggen
        </button>
      )}
    </section>
  );
}

function AlcoholSection({
  units,
  pending,
  onChange,
}: {
  units: number;
  pending: boolean;
  onChange: (u: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">🍺 Alcohol vandaag</h2>
        <div className="flex items-center gap-3">
          <button
            disabled={pending || units <= 0}
            onClick={() => onChange(Math.max(0, units - 1))}
            className="h-9 w-9 rounded-full border border-border text-lg disabled:opacity-40"
          >
            −
          </button>
          <span className="w-10 text-center text-lg font-semibold tabular-nums">
            {units}
          </span>
          <button
            disabled={pending}
            onClick={() => onChange(units + 1)}
            className="h-9 w-9 rounded-full border border-border text-lg disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">Aantal glazen/consumpties.</p>
    </section>
  );
}

function NotesSection({
  initial,
  pending,
  run,
}: {
  initial: string;
  pending: boolean;
  run: (fn: () => Promise<void>) => void;
}) {
  const [notes, setNotes] = useState(initial);
  const [done, setDone] = useState(false);
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Notitie</h2>
      <textarea
        rows={2}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setDone(false);
        }}
        placeholder="Iets over je eten/drinken vandaag?"
        className="mt-2 w-full resize-y rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
      />
      <button
        disabled={pending}
        onClick={() =>
          run(async () => {
            await saveFoodNotes(notes);
            setDone(true);
          })
        }
        className="mt-2 rounded-xl border border-border px-4 py-2 text-sm text-muted disabled:opacity-50"
      >
        {done ? "Bewaard ✓" : "Notitie bewaren"}
      </button>
    </section>
  );
}

function CaffeineBox({
  label,
  time,
  disabled,
  onMark,
  onClear,
}: {
  label: string;
  time: string | null;
  disabled?: boolean;
  onMark: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <p className="text-[11px] text-muted">{label}</p>
      {time ? (
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-semibold">{formatTime(time)}</span>
          <button
            onClick={onClear}
            disabled={disabled}
            className="text-xs text-muted hover:text-red-400 disabled:opacity-50"
          >
            reset
          </button>
        </div>
      ) : (
        <button
          onClick={onMark}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-border py-1.5 text-xs text-accent disabled:opacity-50"
        >
          Markeer nu
        </button>
      )}
    </div>
  );
}

function Pill({
  children,
  active,
  tone = "neutral",
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  tone?: "good" | "bad" | "neutral";
  disabled?: boolean;
  onClick: () => void;
}) {
  const activeCls =
    tone === "good"
      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
      : tone === "bad"
        ? "border-red-500 bg-red-500/15 text-red-400"
        : "border-accent bg-accent/15 text-accent";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        active ? activeCls : "border-border text-muted"
      }`}
    >
      {children}
    </button>
  );
}
