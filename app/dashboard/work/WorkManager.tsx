"use client";

import { useState, useTransition } from "react";
import type { WorkProject } from "@/lib/types";
import { formatEUR } from "@/lib/gambling";
import { addProject, logHours, setMonthlyFixedCosts, updateProject } from "./actions";

export default function WorkManager({
  today,
  projects,
  todayHours,
  stats,
  fixedCosts,
  monthSpending,
  netMonth,
  taxRatePct,
}: {
  today: string;
  projects: WorkProject[];
  todayHours: Record<string, number>;
  stats: { today: number; week: number; month: number };
  fixedCosts: number | null;
  monthSpending: number;
  netMonth: number;
  taxRatePct: number;
}) {
  const [pending, run] = useTransition();
  const active = projects.filter((p) => p.active);
  const factor = 1 - taxRatePct / 100;

  return (
    <div className="mt-4 space-y-4">
      {/* Summary */}
      <section className="grid grid-cols-2 gap-3">
        <Card label="Vandaag (netto)" value={formatEUR(stats.today)} tone="good" />
        <Card label="Deze week" value={formatEUR(stats.week)} />
        <Card label="Deze maand" value={formatEUR(stats.month)} />
        <Card
          label="Over deze maand"
          value={formatEUR(netMonth)}
          tone={netMonth >= 0 ? "good" : "bad"}
        />
      </section>
      <p className="text-[11px] text-muted">
        Verdiensten zijn netto, na ~{taxRatePct}% belasting. Over = verdiensten −
        vaste maandkosten ({formatEUR(fixedCosts ?? 0)}) − uitgaven deze maand (
        {formatEUR(monthSpending)}).
      </p>

      {/* Hours today */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium">Uren vandaag</h2>
        {active.length === 0 ? (
          <p className="mt-2 text-xs text-muted">
            Voeg eerst een project toe (hieronder).
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {active.map((p) => (
              <HoursRow
                key={p.id}
                project={p}
                today={today}
                initial={todayHours[p.id] ?? 0}
                factor={factor}
                pending={pending}
                run={run}
              />
            ))}
          </div>
        )}
      </section>

      {/* Projects management */}
      <ProjectManager projects={projects} pending={pending} run={run} />

      {/* Fixed costs */}
      <FixedCosts current={fixedCosts} pending={pending} run={run} />
    </div>
  );
}

function HoursRow({
  project,
  today,
  initial,
  factor,
  pending,
  run,
}: {
  project: WorkProject;
  today: string;
  initial: number;
  factor: number;
  pending: boolean;
  run: (fn: () => Promise<void>) => void;
}) {
  const [hours, setHours] = useState(initial ? String(initial) : "");
  const earned = (Number(hours) || 0) * Number(project.hourly_rate) * factor;

  function save() {
    const h = Number(hours) || 0;
    if (h !== initial) run(() => logHours(project.id, today, h));
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm">{project.name}</p>
        <p className="text-[11px] text-muted">
          {formatEUR(Number(project.hourly_rate))}/u · {formatEUR(earned)} vandaag
        </p>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          step="0.25"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={save}
          placeholder="0"
          disabled={pending}
          className="w-20 rounded-xl border border-border bg-bg px-3 py-2 text-right text-sm outline-none focus:border-accent"
        />
        <span className="text-xs text-muted">u</span>
      </div>
    </div>
  );
}

function ProjectManager({
  projects,
  pending,
  run,
}: {
  projects: WorkProject[];
  pending: boolean;
  run: (fn: () => Promise<void>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [newRate, setNewRate] = useState("");

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-medium"
      >
        Projecten beheren
        <span className="text-muted">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <input
                defaultValue={p.name}
                onBlur={(e) =>
                  e.target.value.trim() &&
                  e.target.value !== p.name &&
                  run(() => updateProject(p.id, { name: e.target.value.trim() }))
                }
                className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
              <input
                type="number"
                step="1"
                defaultValue={Number(p.hourly_rate)}
                onBlur={(e) =>
                  Number(e.target.value) !== Number(p.hourly_rate) &&
                  run(() =>
                    updateProject(p.id, { hourly_rate: Number(e.target.value) }),
                  )
                }
                className="w-16 rounded-lg border border-border bg-bg px-2 py-1.5 text-right text-sm outline-none focus:border-accent"
              />
              <span className="text-xs text-muted">€/u</span>
              <button
                onClick={() => run(() => updateProject(p.id, { active: !p.active }))}
                disabled={pending}
                className={`rounded-lg border px-2 py-1.5 text-xs ${
                  p.active ? "border-border text-muted" : "border-accent text-accent"
                }`}
              >
                {p.active ? "actief" : "uit"}
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nieuw project"
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
            <input
              type="number"
              step="1"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="€/u"
              className="w-16 rounded-lg border border-border bg-bg px-2 py-1.5 text-right text-sm outline-none focus:border-accent"
            />
            <button
              disabled={pending || !name.trim()}
              onClick={() =>
                run(async () => {
                  await addProject(name, Number(newRate) || 0);
                  setName("");
                  setNewRate("");
                })
              }
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function FixedCosts({
  current,
  pending,
  run,
}: {
  current: number | null;
  pending: boolean;
  run: (fn: () => Promise<void>) => void;
}) {
  const [value, setValue] = useState(current != null ? String(current) : "");
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Vaste maandkosten</h2>
      <p className="mt-1 text-xs text-muted">
        Huur, gas, elektriciteit… (vast per maand).
      </p>
      <div className="mt-2 flex gap-2">
        <input
          type="number"
          step="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="bv. 1200"
          className="w-32 rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          disabled={pending}
          onClick={() =>
            run(() =>
              setMonthlyFixedCosts(value.trim() === "" ? null : Number(value)),
            )
          }
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted disabled:opacity-50"
        >
          Bewaren
        </button>
      </div>
    </section>
  );
}

function Card({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-red-400"
        : "text-text";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
