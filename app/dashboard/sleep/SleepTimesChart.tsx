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

export interface SleepTimePoint {
  date: string;
  bedtime: number | null; // decimale uren; na middernacht = 24+
  wake: number | null;
}

function fmtHour(v: number) {
  const x = ((v % 24) + 24) % 24;
  const h = Math.floor(x);
  const m = Math.round((x - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function SleepTimesChart({ series }: { series: SleepTimePoint[] }) {
  const has = series.some((p) => p.bedtime != null || p.wake != null);
  if (!has) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-4 text-center text-sm text-muted">
        Je slaaptijden-grafiek verschijnt zodra je een paar nachten hebt
        gelogd met de knoppen.
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Slaaptijden</h2>
      <div className="mt-2 flex flex-wrap gap-3">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#818cf8" }} />
          Naar bed
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#fbbf24" }} />
          Opgestaan
        </span>
      </div>
      <div className="mt-2 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={20} />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={fmtHour}
            />
            <Tooltip
              formatter={(v: number) => fmtHour(v)}
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--text)" }}
            />
            <Line type="monotone" dataKey="bedtime" name="Naar bed" stroke="#818cf8" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            <Line type="monotone" dataKey="wake" name="Opgestaan" stroke="#fbbf24" strokeWidth={2} dot={{ r: 2 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
