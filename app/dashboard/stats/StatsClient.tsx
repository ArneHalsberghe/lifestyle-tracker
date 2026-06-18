"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  correlate,
  countNonNull,
  mean,
  strength,
  sum,
  type DayRow,
} from "@/lib/stats";
import { formatEUR } from "@/lib/gambling";

const RANGES = [
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "180d", value: 180 },
];

function fmtShort(iso: string) {
  return new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short" }).format(
    new Date(iso + "T12:00:00Z"),
  );
}
function weekKey(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
function toWeekly(rows: DayRow[], key: keyof DayRow) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = Number(r[key]);
    if (!r[key] && r[key] !== 0) continue;
    const k = weekKey(r.date);
    m.set(k, (m.get(k) ?? 0) + (Number.isNaN(v) ? 0 : v));
  }
  return [...m.entries()]
    .sort()
    .map(([k, v]) => ({ week: fmtShort(k), value: Math.round(v * 10) / 10 }));
}
function round1(n: number | null) {
  return n == null ? null : Math.round(n * 10) / 10;
}
function firstLast(rows: DayRow[], key: keyof DayRow): [number | null, number | null] {
  let first: number | null = null;
  let last: number | null = null;
  for (const r of rows) {
    const v = r[key] as number | null;
    if (v != null) {
      if (first == null) first = v;
      last = v;
    }
  }
  return [first, last];
}

export default function StatsClient({ days }: { days: DayRow[] }) {
  const [range, setRange] = useState(30);
  const rows = useMemo(() => days.slice(-range), [days, range]);

  const energy = round1(mean(rows, "energyAvg"));
  const sleep = round1(mean(rows, "sleepH"));
  const stress = round1(mean(rows, "stress"));
  const fatigue = round1(mean(rows, "fatigue"));
  const restingHr = round1(mean(rows, "restingHr"));
  const hrv = round1(mean(rows, "hrv"));
  const onTimeUp = mean(rows, "upBefore9");
  const beforeMidnight = mean(rows, "sleptOnTime");
  const habit = mean(rows, "habitPct");
  const [w0, w1] = firstLast(rows, "weight");
  const weightDelta = w0 != null && w1 != null ? Math.round((w1 - w0) * 10) / 10 : null;
  const earnings = sum(rows, "earnings");
  const gambling = sum(rows, "gamblingNet");
  const spending = sum(rows, "spending");
  const workoutMin = sum(rows, "workoutMin");
  const workoutDays = rows.filter((r) => (r.workoutMin ?? 0) > 0).length;
  const checkedDays = countNonNull(rows, "energyAvg");

  const corrs = useMemo(() => buildCorrelations(rows), [rows]);

  return (
    <div className="mt-3">
      {/* Range */}
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              range === r.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Gem. energie" value={energy != null ? `${energy}/10` : "—"} tone={energy != null && energy >= 7 ? "good" : "neutral"} />
        <Kpi label="Gem. slaap" value={sleep != null ? `${sleep} u` : "—"} />
        <Kpi
          label="Op tijd op (9u)"
          value={onTimeUp != null ? `${Math.round(onTimeUp * 100)}%` : "—"}
          tone={onTimeUp != null && onTimeUp >= 0.7 ? "good" : "neutral"}
        />
        <Kpi
          label="Voor middernacht"
          value={beforeMidnight != null ? `${Math.round(beforeMidnight * 100)}%` : "—"}
          tone={beforeMidnight != null && beforeMidnight >= 0.7 ? "good" : "neutral"}
        />
        <Kpi label="Gem. stress" value={stress != null ? `${stress}/10` : "—"} tone={stress != null && stress >= 6 ? "bad" : "neutral"} />
        <Kpi label="Gem. vermoeidheid" value={fatigue != null ? `${fatigue}/10` : "—"} />
        <Kpi label="Rusthartslag" value={restingHr != null ? `${restingHr}` : "—"} />
        <Kpi label="HRV" value={hrv != null ? `${hrv}` : "—"} />
        <Kpi label="Gewicht Δ" value={weightDelta != null ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg` : "—"} />
        <Kpi label="Gewoontes" value={habit != null ? `${Math.round(habit)}%` : "—"} />
        <Kpi label="Verdiend (netto)" value={formatEUR(earnings)} tone="good" />
        <Kpi label="Gok-netto" value={formatEUR(gambling)} tone={gambling >= 0 ? "good" : "bad"} />
        <Kpi label="Uitgaven" value={formatEUR(spending)} />
        <Kpi label="Sport" value={`${workoutDays}× · ${Math.round(workoutMin / 60)}u`} />
        <Kpi label="Dagen ingecheckt" value={`${checkedDays}/${rows.length}`} />
      </section>

      {/* Correlations */}
      {corrs.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-medium">🔗 Verbanden in je data</h2>
          <ul className="mt-2 space-y-1.5">
            {corrs.map((c, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted">
                <span className="text-accent">•</span>
                <span>
                  {c.text}{" "}
                  <span className="text-muted/70">(r = {c.r.toFixed(2)})</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-muted/70">
            Verbanden, geen oorzaken — en betrouwbaarder naarmate je meer dagen
            invult.
          </p>
        </section>
      )}

      {/* Charts */}
      <div className="mt-4 space-y-4">
        <LineCard title="⚡ Energie" rows={rows} domain={[0, 10]} lines={[
          { key: "energyM", label: "Ochtend", color: "#fbbf24" },
          { key: "energyN", label: "Middag", color: "#4f9dff" },
          { key: "energyE", label: "Avond", color: "#a78bfa" },
        ]} />
        <LineCard title="🧠 Vermoeidheid & Fabry" rows={rows} domain={[0, 10]} lines={[
          { key: "fatigue", label: "Vermoeidheid", color: "#f87171" },
          { key: "brainFog", label: "Brain fog", color: "#fb923c" },
          { key: "tolerance", label: "Belastbaarheid", color: "#34d399" },
        ]} />
        <LineCard title="🙂 Gemoed" rows={rows} domain={[0, 10]} lines={[
          { key: "happiness", label: "Geluk", color: "#34d399" },
          { key: "stress", label: "Stress", color: "#f87171" },
          { key: "motivation", label: "Motivatie", color: "#4f9dff" },
        ]} />
        <BarCard title="😴 Slaap (uren)" data={rows.map((r) => ({ week: r.label, value: r.sleepH ?? 0 }))} color="#818cf8" />
        <LineCard title="❤️ Rusthartslag & HRV" rows={rows} lines={[
          { key: "restingHr", label: "Rusthartslag", color: "#f87171" },
          { key: "hrv", label: "HRV", color: "#34d399" },
        ]} />
        <LineCard title="⚖️ Gewicht (kg)" rows={rows} lines={[{ key: "weight", label: "Gewicht", color: "#4f9dff" }]} />
        <BarWeekCard title="🏃 Sport (min/week)" rows={rows} metric="workoutMin" color="#34d399" />
        <BarWeekCard title="💼 Netto verdiend (/week)" rows={rows} metric="earnings" color="#34d399" money />
        <BarWeekCard title="🎲 Gok-netto (/week)" rows={rows} metric="gamblingNet" color="#34d399" money signed />
        <LineCard title="✅ Gewoontes (%)" rows={rows} domain={[0, 100]} lines={[{ key: "habitPct", label: "Afgevinkt", color: "#a78bfa" }]} />
      </div>
    </div>
  );
}

interface Corr {
  text: string;
  r: number;
}
function buildCorrelations(rows: DayRow[]): Corr[] {
  const defs: { a: keyof DayRow; b: keyof DayRow; lag?: number; pos: string; neg: string }[] = [
    { a: "sleepH", b: "energyAvg", pos: "Meer slaap gaat samen met meer energie", neg: "Meer slaap gaat samen met minder energie" },
    { a: "stress", b: "fatigue", pos: "Meer stress gaat samen met meer vermoeidheid", neg: "Meer stress gaat samen met minder vermoeidheid" },
    { a: "sleepH", b: "brainFog", pos: "Meer slaap gaat samen met meer brain fog", neg: "Meer slaap gaat samen met minder brain fog" },
    { a: "workoutMin", b: "happiness", pos: "Meer bewegen gaat samen met meer geluk", neg: "Meer bewegen gaat samen met minder geluk" },
    { a: "alcohol", b: "energyAvg", lag: 1, pos: "Meer alcohol gaat samen met meer energie de dag erna", neg: "Meer alcohol gaat samen met minder energie de dag erna" },
    { a: "workoutMin", b: "sleepH", pos: "Meer bewegen gaat samen met meer slaap", neg: "Meer bewegen gaat samen met minder slaap" },
    { a: "habitPct", b: "energyAvg", pos: "Meer gewoontes afvinken gaat samen met meer energie", neg: "Meer gewoontes afvinken gaat samen met minder energie" },
    { a: "overstim", b: "fatigue", pos: "Meer overprikkeling gaat samen met meer vermoeidheid", neg: "Meer overprikkeling gaat samen met minder vermoeidheid" },
    { a: "restingHr", b: "fatigue", pos: "Hogere rusthartslag gaat samen met meer vermoeidheid", neg: "Hogere rusthartslag gaat samen met minder vermoeidheid" },
    { a: "hrv", b: "energyAvg", pos: "Hogere HRV gaat samen met meer energie", neg: "Hogere HRV gaat samen met minder energie" },
    { a: "hrv", b: "fatigue", pos: "Hogere HRV gaat samen met meer vermoeidheid", neg: "Hogere HRV gaat samen met minder vermoeidheid" },
    { a: "restingHr", b: "stress", pos: "Hogere rusthartslag gaat samen met meer stress", neg: "Hogere rusthartslag gaat samen met minder stress" },
    { a: "sleepH", b: "restingHr", pos: "Meer slaap gaat samen met hogere rusthartslag", neg: "Meer slaap gaat samen met lagere rusthartslag" },
  ];
  const out: Corr[] = [];
  for (const d of defs) {
    const r = correlate(rows, d.a, d.b, d.lag ?? 0);
    if (r != null && Math.abs(r) >= 0.3) {
      const dir = r > 0 ? d.pos : d.neg;
      out.push({ text: `${dir} (${strength(r)} verband)`, r });
    }
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-text";
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--text)",
};

function LineCard({
  title,
  rows,
  lines,
  domain,
}: {
  title: string;
  rows: DayRow[];
  lines: { key: keyof DayRow; label: string; color: string }[];
  domain?: [number, number];
}) {
  const has = rows.some((r) => lines.some((l) => r[l.key] != null));
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-3">
        {lines.map((l) => (
          <span key={String(l.key)} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
      {has ? (
        <div className="mt-2 h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
              <YAxis domain={domain ?? ["auto", "auto"]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              {lines.map((l) => (
                <Line key={String(l.key)} type="monotone" dataKey={l.key as string} name={l.label} stroke={l.color} strokeWidth={2} dot={{ r: 2 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">Nog geen data in deze periode.</p>
      )}
    </div>
  );
}

function BarCard({ title, data, color }: { title: string; data: { week: string; value: number }[]; color: string }) {
  const has = data.some((d) => d.value !== 0);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {has ? (
        <div className="mt-2 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--border)", opacity: 0.3 }} />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">Nog geen data in deze periode.</p>
      )}
    </div>
  );
}

function BarWeekCard({
  title,
  rows,
  metric,
  color,
  money,
  signed,
}: {
  title: string;
  rows: DayRow[];
  metric: keyof DayRow;
  color: string;
  money?: boolean;
  signed?: boolean;
}) {
  const data = toWeekly(rows, metric);
  const has = data.some((d) => d.value !== 0);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {has ? (
        <div className="mt-2 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={48} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--border)", opacity: 0.3 }}
                formatter={(v: number) => [money ? formatEUR(v) : v, ""]}
              />
              {signed && <ReferenceLine y={0} stroke="var(--border)" />}
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={signed ? (d.value >= 0 ? "#34d399" : "#f87171") : color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">Nog geen data in deze periode.</p>
      )}
    </div>
  );
}
