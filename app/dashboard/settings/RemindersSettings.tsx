"use client";

import { useState, useTransition } from "react";
import type { ResolvedReminder } from "@/lib/reminders";
import { setReminderPref } from "./actions";

export default function RemindersSettings({
  reminders,
}: {
  reminders: ResolvedReminder[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">🔔 Meldingen</h2>
      <p className="mt-1 text-xs text-muted">
        Zet elke melding aan/uit en kies het uur.
      </p>
      <div className="mt-3 divide-y divide-border">
        {reminders.map((r) => (
          <ReminderRow key={r.key} reminder={r} />
        ))}
      </div>
    </section>
  );
}

function ReminderRow({ reminder }: { reminder: ResolvedReminder }) {
  const [enabled, setEnabled] = useState(reminder.enabled);
  const [time, setTime] = useState(
    `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`,
  );
  const [pending, run] = useTransition();

  function save(nextEnabled: boolean, nextTime: string) {
    const [h, m] = nextTime.split(":").map(Number);
    run(() =>
      setReminderPref({
        key: reminder.key,
        enabled: nextEnabled,
        hour: h || 0,
        minute: m || 0,
      }),
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm">{reminder.title}</p>
        {reminder.isoWeekday === 1 && (
          <p className="text-[11px] text-muted">elke maandag</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={time}
          disabled={pending}
          onChange={(e) => setTime(e.target.value)}
          onBlur={() => save(enabled, time)}
          className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            save(next, time);
          }}
          disabled={pending}
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
    </div>
  );
}
