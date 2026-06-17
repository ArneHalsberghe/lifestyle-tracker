"use client";

import { useState, useTransition } from "react";
import type { Nap } from "@/lib/sleep";
import { formatTime } from "@/lib/sleep";
import { deleteNap, logNap } from "./actions";

export default function NapLogger({ naps }: { naps: Nap[] }) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [pending, run] = useTransition();
  const [error, setError] = useState("");

  function add() {
    setError("");
    run(async () => {
      try {
        await logNap({
          durationMin: duration ? Number(duration) : undefined,
          note,
        });
        setOpen(false);
        setDuration("");
        setNote("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">😴 Dutjes vandaag</h2>
        <span className={`text-sm font-semibold ${naps.length ? "text-amber-400" : "text-emerald-400"}`}>
          {naps.length} {naps.length === 0 && "✓"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">Doel: geen dutjes overdag.</p>

      {naps.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {naps.map((n) => (
            <li key={n.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-muted">
                {formatTime(n.started_at)}
                {n.duration_min ? ` · ${n.duration_min}m` : ""}
                {n.note ? ` · ${n.note}` : ""}
              </span>
              <button
                onClick={() => run(() => deleteNap(n.id))}
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
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duur (min)"
              className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notitie (optioneel)"
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={add}
              disabled={pending}
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Dutje opslaan
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
          + Dutje melden
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
