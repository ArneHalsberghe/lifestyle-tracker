"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MoodPoint {
  date: string;
  happiness: number | null;
  stress: number | null;
  motivation: number | null;
}

const lines = [
  { key: "happiness", label: "Geluk", color: "#34d399" },
  { key: "stress", label: "Stress", color: "#f87171" },
  { key: "motivation", label: "Motivatie", color: "#4f9dff" },
];

export default function MoodTrend({ series }: { series: MoodPoint[] }) {
  const has = series.some((p) => lines.some((l) => p[l.key as keyof MoodPoint] != null));
  if (!has) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-4 text-center text-sm text-muted">
        Je gemoed-grafiek verschijnt zodra je een paar check-ins hebt gedaan.
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Gemoed — laatste 30 dagen</h2>
      <div className="mt-2 flex flex-wrap gap-3">
        {lines.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
      <div className="mt-2 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--text)" }} />
            {lines.map((l) => (
              <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
