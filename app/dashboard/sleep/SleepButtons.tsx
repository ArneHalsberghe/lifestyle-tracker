"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/sleep";
import { cancelSleep, goToSleep, wakeUp } from "./actions";

function elapsed(startIso: string, now: number) {
  const min = Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}u ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export default function SleepButtons({
  openSince,
}: {
  openSince: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [pending, run] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function startSleep() {
    setError("");
    run(async () => {
      try {
        await goToSleep();
        // Avond-check-in van de juiste dag: ga je ná middernacht slapen,
        // dan hoort de avond bij de dag ervoor.
        const now = new Date();
        const todayStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Brussels",
        }).format(now);
        const hour = Number(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Brussels",
            hour: "2-digit",
            hour12: false,
          })
            .format(now)
            .replace(/\D/g, ""),
        );
        let day = todayStr;
        if (hour < 12) {
          const x = new Date(todayStr + "T12:00:00Z");
          x.setUTCDate(x.getUTCDate() - 1);
          day = x.toISOString().slice(0, 10);
        }
        router.push(`/dashboard/checkin?date=${day}&phase=evening`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    });
  }

  useEffect(() => {
    if (!openSince) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [openSince]);

  function act(fn: () => Promise<void>) {
    setError("");
    run(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    });
  }

  if (!openSince) {
    return (
      <div>
        <button
          onClick={startSleep}
          disabled={pending}
          className="flex w-full flex-col items-center gap-1 rounded-3xl bg-indigo-600 px-6 py-8 text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50"
        >
          <span className="text-4xl">📵</span>
          <span className="text-lg font-semibold">Telefoon weg — slapen</span>
          <span className="text-xs text-white/80">
            Start je nacht en doe je avond-check-in
          </span>
        </button>
        {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-3xl border border-indigo-500/40 bg-indigo-500/10 px-6 py-5 text-center">
        <p className="text-sm text-muted">Aan het slapen sinds</p>
        <p className="mt-0.5 text-2xl font-semibold">{formatTime(openSince)}</p>
        <p className="mt-0.5 text-xs text-muted">{elapsed(openSince, now)} geleden</p>
      </div>

      <button
        onClick={() => act(wakeUp)}
        disabled={pending}
        className="mt-3 flex w-full flex-col items-center gap-1 rounded-3xl bg-amber-500 px-6 py-8 text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50"
      >
        <span className="text-4xl">☀️</span>
        <span className="text-lg font-semibold">Dag starten — gsm nemen</span>
        <span className="text-xs text-white/90">Sluit je nacht af</span>
      </button>

      <button
        onClick={() => act(cancelSleep)}
        disabled={pending}
        className="mt-2 w-full text-center text-xs text-muted underline-offset-2 hover:underline disabled:opacity-50"
      >
        Per ongeluk gedrukt? Annuleer deze nacht
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
