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
import type { DayPoint } from "@/lib/checkin";

interface LineDef {
  key: string;
  label: string;
  color: string;
}

const CHARTS: { title: string; lines: LineDef[] }[] = [
  {
    title: "⚡ Energie",
    lines: [
      { key: "energy_morning", label: "Ochtend", color: "#fbbf24" },
      { key: "energy_noon", label: "Middag", color: "#4f9dff" },
      { key: "energy_evening", label: "Avond", color: "#a78bfa" },
    ],
  },
  {
    title: "🧠 Vermoeidheid & brain fog",
    lines: [
      { key: "fatigue", label: "Vermoeidheid", color: "#f87171" },
      { key: "brain_fog", label: "Brain fog", color: "#fb923c" },
      { key: "tolerance", label: "Belastbaarheid", color: "#34d399" },
    ],
  },
  {
    title: "🙂 Gemoed",
    lines: [
      { key: "happiness", label: "Geluk", color: "#34d399" },
      { key: "stress", label: "Stress", color: "#f87171" },
      { key: "motivation", label: "Motivatie", color: "#4f9dff" },
    ],
  },
];

export default function CheckinCharts({ series }: { series: DayPoint[] }) {
  const hasData = series.some((p) =>
    CHARTS.some((c) => c.lines.some((l) => p[l.key] != null)),
  );

  if (!hasData) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-4 text-center text-sm text-muted">
        Je grafieken verschijnen zodra je een paar dagen hebt ingevuld.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {CHARTS.map((chart) => (
        <div
          key={chart.title}
          className="rounded-2xl border border-border bg-surface p-4"
        >
          <h3 className="text-sm font-medium">{chart.title}</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {chart.lines.map((l) => (
              <span key={l.key} className="flex items-center gap-1.5 text-xs text-muted">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: l.color }}
                />
                {l.label}
              </span>
            ))}
          </div>
          <div className="mt-2 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                />
                {chart.lines.map((l) => (
                  <Line
                    key={l.key}
                    type="monotone"
                    dataKey={l.key}
                    name={l.label}
                    stroke={l.color}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
