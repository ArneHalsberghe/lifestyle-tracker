"use client";

import { useState, useTransition } from "react";
import { saveProfile, type ProfileInput } from "./actions";

const labelCls = "text-xs font-medium text-muted";
const inputCls =
  "mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent";

export default function ProfileForm({
  initial,
  saved,
}: {
  initial: ProfileInput;
  saved: boolean;
}) {
  const [form, setForm] = useState<ProfileInput>(initial);
  const [pending, run] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDone(false);
  }

  function submit() {
    setError("");
    run(async () => {
      try {
        await saveProfile(form);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    });
  }

  return (
    <div className="mt-4 space-y-4">
      {!saved && (
        <p className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2.5 text-xs text-accent">
          Je profiel is vooraf ingevuld op basis van je rapport. Controleer het
          en klik op <strong>Bewaren</strong> om het in de app op te slaan.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block">
          <span className={labelCls}>Naam</span>
          <input
            className={inputCls}
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Geboortedatum</span>
          <input
            type="date"
            className={inputCls}
            value={form.birthdate ?? ""}
            onChange={(e) => set("birthdate", e.target.value || null)}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Lengte (cm)</span>
          <input
            type="number"
            className={inputCls}
            value={form.height_cm ?? ""}
            onChange={(e) =>
              set("height_cm", e.target.value ? Number(e.target.value) : null)
            }
          />
        </label>
        <label className="col-span-2 block">
          <span className={labelCls}>Woonplaats</span>
          <input
            className={inputCls}
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </label>
        <label className="col-span-2 block">
          <span className={labelCls}>Beroep</span>
          <input
            className={inputCls}
            value={form.occupation}
            onChange={(e) => set("occupation", e.target.value)}
          />
        </label>
        <label className="col-span-2 block">
          <span className={labelCls}>Talen</span>
          <input
            className={inputCls}
            value={form.languages}
            onChange={(e) => set("languages", e.target.value)}
          />
        </label>
      </div>

      <Textarea
        label="Medische achtergrond"
        rows={5}
        value={form.medical_notes}
        onChange={(v) => set("medical_notes", v)}
      />
      <Textarea
        label="Levensdoelen"
        rows={6}
        value={form.goals}
        onChange={(v) => set("goals", v)}
      />
      <Textarea
        label="Belangrijkste KPI's"
        rows={6}
        value={form.kpis}
        onChange={(v) => set("kpis", v)}
      />
      <Textarea
        label="Volledig rapport / missie"
        rows={10}
        value={form.report}
        onChange={(v) => set("report", v)}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-xl bg-accent px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Bewaren…" : "Bewaren"}
        </button>
        {done && <span className="text-sm text-emerald-400">Opgeslagen ✓</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <textarea
        rows={rows}
        className={`${inputCls} resize-y leading-relaxed`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
