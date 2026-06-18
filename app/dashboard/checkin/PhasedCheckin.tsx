"use client";

import { useState, useTransition } from "react";
import {
  ALL_METRICS,
  MEAL_COLS,
  MEAL_LABELS,
  PHASES,
  habitLabel,
  type CheckinMetricKey,
  type Phase,
} from "@/lib/checkin";
import { savePhase } from "./actions";

type Metrics = Record<string, number | null>;
type Habits = Record<string, boolean>;
type Food = Record<string, boolean | null>;

export default function PhasedCheckin({
  initialPhase,
  date,
  metrics: metrics0,
  habits: habits0,
  food: food0,
  alcohol: alcohol0,
  spending: spending0,
  householdEnabled,
  householdMinutes,
  household: household0,
  hrv: hrv0,
  weight: weight0,
  done,
}: {
  initialPhase: Phase;
  date: string;
  metrics: Metrics;
  habits: Habits;
  food: Food;
  alcohol: number;
  spending: number;
  householdEnabled: boolean;
  householdMinutes: number;
  household: boolean | null;
  hrv: number | null;
  weight: number | null;
  done: Record<Phase, boolean>;
}) {
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [metrics, setMetrics] = useState<Metrics>(metrics0);
  const [habits, setHabits] = useState<Habits>(habits0);
  const [food, setFood] = useState<Food>(food0);
  const [alcohol, setAlcohol] = useState(alcohol0);
  const [spending, setSpending] = useState(spending0 ? String(spending0) : "");
  const [householdDone, setHouseholdDone] = useState<boolean | null>(household0);
  const [hrv, setHrv] = useState(hrv0 ? String(hrv0) : "");
  const [weight, setWeight] = useState(weight0 ? String(weight0) : "");
  const [notes, setNotes] = useState("");
  const [pending, run] = useTransition();
  const [doneMsg, setDoneMsg] = useState(false);
  const [error, setError] = useState("");

  const cfg = PHASES.find((p) => p.phase === phase)!;

  function submit() {
    setError("");
    run(async () => {
      try {
        const mSubset: Partial<Record<CheckinMetricKey, number | null>> = {};
        for (const k of cfg.metricKeys) mSubset[k] = metrics[k] ?? 5;

        const hSubset: Habits = {};
        for (const k of cfg.habitKeys) hSubset[k] = Boolean(habits[k]);
        if (phase === "evening" && householdEnabled && householdDone !== null) {
          hSubset.household_done = householdDone;
        }

        const fSubset: Food = {};
        for (const mk of cfg.mealKeys) {
          const cols = MEAL_COLS[mk];
          fSubset[cols.eaten] = food[cols.eaten] ?? null;
          fSubset[cols.healthy] = food[cols.healthy] ?? null;
        }

        await savePhase({
          phase,
          date,
          metrics: mSubset,
          habits: hSubset,
          food: fSubset,
          alcohol: cfg.showAlcohol ? alcohol : undefined,
          spending: cfg.showSpending
            ? spending.trim() === ""
              ? null
              : Number(spending)
            : undefined,
          hrv: cfg.showHrv ? (hrv.trim() === "" ? null : Number(hrv)) : undefined,
          weight: cfg.showWeight
            ? weight.trim() === ""
              ? null
              : Number(weight)
            : undefined,
          notes: cfg.showNotes ? notes : undefined,
        });
        setDoneMsg(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    });
  }

  return (
    <div className="mt-4">
      {/* Phase tabs */}
      <div className="flex gap-2">
        {PHASES.map((p) => (
          <button
            key={p.phase}
            onClick={() => {
              setPhase(p.phase);
              setDoneMsg(false);
            }}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl border px-2 py-3 text-xs ${
              phase === p.phase
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted"
            }`}
          >
            <span className="text-xl">{p.emoji}</span>
            {p.label}
            {done[p.phase] && <span className="text-emerald-400">✓</span>}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted">{cfg.intro}</p>

      <div className="mt-3 space-y-4">
        {/* Habits (Ja/Nee) */}
        {cfg.habitKeys.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <div className="space-y-3">
              {cfg.habitKeys.map((k) => (
                <YesNo
                  key={k}
                  label={habitLabel(k)}
                  value={habits[k] ?? null}
                  onChange={(v) => {
                    setHabits((h) => ({ ...h, [k]: v }));
                    setDoneMsg(false);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Huishouden (avond) */}
        {phase === "evening" && householdEnabled && (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <YesNo
              label={`🧹 ${householdMinutes} min huishouden gedaan?`}
              value={householdDone}
              onChange={(v) => {
                setHouseholdDone(v);
                setDoneMsg(false);
              }}
            />
          </section>
        )}

        {/* Meals */}
        {cfg.mealKeys.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-sm font-medium">Maaltijden</h2>
            <div className="mt-3 space-y-4">
              {cfg.mealKeys.map((mk) => {
                const cols = MEAL_COLS[mk];
                const eaten = food[cols.eaten];
                const healthy = food[cols.healthy];
                const meta = MEAL_LABELS[mk];
                return (
                  <div key={mk}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {meta.emoji} {meta.label} gegeten?
                      </span>
                      <div className="flex gap-1.5">
                        <Pill
                          active={eaten === true}
                          tone="good"
                          onClick={() => {
                            setFood((f) => ({ ...f, [cols.eaten]: true }));
                            setDoneMsg(false);
                          }}
                        >
                          Ja
                        </Pill>
                        <Pill
                          active={eaten === false}
                          tone="bad"
                          onClick={() => {
                            setFood((f) => ({
                              ...f,
                              [cols.eaten]: false,
                              [cols.healthy]: null,
                            }));
                            setDoneMsg(false);
                          }}
                        >
                          Nee
                        </Pill>
                      </div>
                    </div>
                    {eaten === true && (
                      <div className="mt-2 flex items-center justify-end gap-1.5">
                        <span className="mr-auto text-xs text-muted">Gezond?</span>
                        <Pill
                          active={healthy === true}
                          tone="good"
                          onClick={() => {
                            setFood((f) => ({ ...f, [cols.healthy]: true }));
                            setDoneMsg(false);
                          }}
                        >
                          Gezond
                        </Pill>
                        <Pill
                          active={healthy === false}
                          tone="bad"
                          onClick={() => {
                            setFood((f) => ({ ...f, [cols.healthy]: false }));
                            setDoneMsg(false);
                          }}
                        >
                          Niet
                        </Pill>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Metric sliders */}
        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="space-y-4">
            {cfg.metricKeys.map((k) => {
              const def = ALL_METRICS.find((m) => m.key === k)!;
              return (
                <Slider
                  key={k}
                  label={def.label}
                  value={metrics[k] ?? 5}
                  positive={def.positive}
                  onChange={(v) => {
                    setMetrics((m) => ({ ...m, [k]: v }));
                    setDoneMsg(false);
                  }}
                />
              );
            })}
          </div>
        </section>

        {/* HRV + gewicht (ochtend) */}
        {(cfg.showHrv || cfg.showWeight) && (
          <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
            {cfg.showHrv && (
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">❤️ HRV (ms)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={hrv}
                  onChange={(e) => {
                    setHrv(e.target.value);
                    setDoneMsg(false);
                  }}
                  placeholder="bv. 45"
                  className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
            )}
            {cfg.showWeight && (
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">⚖️ Gewicht (kg)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value);
                    setDoneMsg(false);
                  }}
                  placeholder="bv. 72.5"
                  className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
            )}
          </section>
        )}

        {/* Alcohol (evening) */}
        {cfg.showAlcohol && (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">🍺 Alcohol vandaag</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setAlcohol((a) => Math.max(0, a - 1));
                    setDoneMsg(false);
                  }}
                  className="h-9 w-9 rounded-full border border-border text-lg"
                >
                  −
                </button>
                <span className="w-10 text-center text-lg font-semibold tabular-nums">
                  {alcohol}
                </span>
                <button
                  onClick={() => {
                    setAlcohol((a) => a + 1);
                    setDoneMsg(false);
                  }}
                  className="h-9 w-9 rounded-full border border-border text-lg"
                >
                  +
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Spending (evening) */}
        {cfg.showSpending && (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-sm font-medium">💸 Uitgaven vandaag</h2>
            <p className="mt-1 text-xs text-muted">
              Ongeveer, buiten je vaste maandkosten (huur, gas, elektriciteit…).
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-muted">€</span>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                value={spending}
                onChange={(e) => {
                  setSpending(e.target.value);
                  setDoneMsg(false);
                }}
                placeholder="0"
                className="w-32 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
          </section>
        )}

        {/* Notes (evening) */}
        {cfg.showNotes && (
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-sm font-medium">Notitie</h2>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDoneMsg(false);
              }}
              placeholder="Hoe was je dag?"
              className="mt-2 w-full resize-y rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </section>
        )}
      </div>

      <div className="sticky bottom-24 z-10 mt-4">
        <button
          onClick={submit}
          disabled={pending}
          className="w-full rounded-xl bg-accent px-4 py-3.5 font-medium text-white shadow-lg disabled:opacity-50"
        >
          {pending ? "Bewaren…" : `${cfg.label}-check-in bewaren`}
        </button>
        {doneMsg && (
          <p className="mt-2 text-center text-sm text-emerald-400">Opgeslagen ✓</p>
        )}
        {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1.5">
        <Pill active={value === true} tone="good" onClick={() => onChange(true)}>
          Ja
        </Pill>
        <Pill active={value === false} tone="bad" onClick={() => onChange(false)}>
          Nee
        </Pill>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  positive,
  onChange,
}: {
  label: string;
  value: number;
  positive: boolean;
  onChange: (v: number) => void;
}) {
  const good = positive ? value >= 7 : value <= 4;
  const bad = positive ? value <= 4 : value >= 7;
  const color = good ? "text-emerald-400" : bad ? "text-red-400" : "text-text";
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${color}`}>
          {value}
          <span className="text-xs text-muted">/10</span>
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-[var(--accent)]"
      />
    </div>
  );
}

function Pill({
  children,
  active,
  tone = "neutral",
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  tone?: "good" | "bad" | "neutral";
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
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active ? activeCls : "border-border text-muted"
      }`}
    >
      {children}
    </button>
  );
}
