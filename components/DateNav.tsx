"use client";

import { useRouter } from "next/navigation";

const TZ = "Europe/Brussels";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}
function shift(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function label(iso: string) {
  const t = today();
  if (iso === t) return "Vandaag";
  if (iso === shift(t, -1)) return "Gisteren";
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso + "T12:00:00Z"));
}

export default function DateNav({
  date,
  basePath,
}: {
  date: string;
  basePath: string;
}) {
  const router = useRouter();
  const atToday = date >= today();

  const go = (days: number) => {
    const next = shift(date, days);
    if (next > today()) return;
    router.push(`${basePath}?date=${next}`);
  };

  return (
    <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface px-2 py-1.5">
      <button
        onClick={() => go(-1)}
        className="rounded-lg px-3 py-1.5 text-lg text-muted active:bg-bg"
        aria-label="vorige dag"
      >
        ‹
      </button>
      <span className="text-sm font-medium">{label(date)}</span>
      <button
        onClick={() => go(1)}
        disabled={atToday}
        className="rounded-lg px-3 py-1.5 text-lg text-muted active:bg-bg disabled:opacity-30"
        aria-label="volgende dag"
      >
        ›
      </button>
    </div>
  );
}
