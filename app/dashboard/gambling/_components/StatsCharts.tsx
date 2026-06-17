"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekPoint } from "@/lib/gambling";
import { formatEUR } from "@/lib/gambling";

export default function StatsCharts({ weekly }: { weekly: WeekPoint[] }) {
  const hasData = weekly.some((w) => w.net !== 0);

  if (!hasData) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-4 text-center text-sm text-muted">
        Nog geen afgesloten sessies — je grafiek verschijnt zodra je data hebt.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Netto resultaat per week</h2>
      <div className="mt-3 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekly} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              formatter={(v: number) => [formatEUR(v), "Netto"]}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--text)",
              }}
              cursor={{ fill: "var(--border)", opacity: 0.3 }}
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar dataKey="net" radius={[4, 4, 0, 0]}>
              {weekly.map((w, i) => (
                <Cell key={i} fill={w.net >= 0 ? "#34d399" : "#f87171"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
