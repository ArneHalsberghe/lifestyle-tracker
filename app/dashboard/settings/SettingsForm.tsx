"use client";

import { useState, useTransition } from "react";
import { setHousehold, setTaxRate } from "./actions";

export default function SettingsForm({
  householdEnabled,
  householdMinutes,
  taxRatePct,
}: {
  householdEnabled: boolean;
  householdMinutes: number;
  taxRatePct: number;
}) {
  const [enabled, setEnabled] = useState(householdEnabled);
  const [minutes, setMinutes] = useState(String(householdMinutes));
  const [tax, setTax] = useState(String(taxRatePct));
  const [pending, run] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="mt-4 space-y-4">
      {/* Huishouden */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">🧹 Dagelijks huishouden</h2>
          <button
            onClick={() => {
              const next = !enabled;
              setEnabled(next);
              run(async () => {
                await setHousehold(next, Number(minutes) || 10);
                setMsg("Opgeslagen ✓");
              });
            }}
            className={`relative h-7 w-12 rounded-full transition ${
              enabled ? "bg-accent" : "bg-border"
            }`}
            aria-label="aan/uit"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                enabled ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Een dagelijks doel om kort op te ruimen. Vink je af in de avond-check-in.
        </p>
        {enabled && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm">Duur:</span>
            <input
              type="number"
              step="5"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              onBlur={() =>
                run(async () => {
                  await setHousehold(true, Number(minutes) || 10);
                  setMsg("Opgeslagen ✓");
                })
              }
              className="w-20 rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <span className="text-sm text-muted">min/dag</span>
          </div>
        )}
      </section>

      {/* Belasting */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium">💰 Belasting op inkomsten</h2>
        <p className="mt-1 text-xs text-muted">
          Als zelfstandige gaat ongeveer dit deel naar belasting. Je verdiensten
          worden netto (na belasting) getoond.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            step="1"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            className="w-20 rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <span className="text-sm text-muted">%</span>
          <button
            disabled={pending}
            onClick={() =>
              run(async () => {
                await setTaxRate(Number(tax) || 0);
                setMsg("Opgeslagen ✓");
              })
            }
            className="rounded-xl border border-border px-4 py-2 text-sm text-muted disabled:opacity-50"
          >
            Bewaren
          </button>
        </div>
      </section>

      {msg && <p className="text-center text-sm text-emerald-400">{msg}</p>}
    </div>
  );
}
