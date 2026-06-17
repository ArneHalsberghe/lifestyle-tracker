"use client";

import { useEffect, useState, useTransition } from "react";
import type { GameType, GamblingSessionWithEntries } from "@/lib/types";
import {
  GAME_TYPES,
  formatEUR,
  gameEmoji,
  gameLabel,
  sessionNet,
  sumIn,
  sumOut,
} from "@/lib/gambling";
import {
  addEntry,
  deleteEntry,
  endSession,
  startSession,
} from "@/app/dashboard/gambling/actions";

function elapsedLabel(startedAt: string, now: number) {
  const sec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function Tracker({
  active,
}: {
  active: GamblingSessionWithEntries | null;
}) {
  return active ? <ActiveSession session={active} /> : <StartForm />;
}

function StartForm() {
  const [gameType, setGameType] = useState<GameType>("poker");
  const [platform, setPlatform] = useState("");
  const [initialIn, setInitialIn] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    setError("");
    start(async () => {
      try {
        await startSession({
          gameType,
          platform,
          initialIn: initialIn ? Number(initialIn) : undefined,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium text-muted">Nieuwe sessie</h2>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {GAME_TYPES.map((g) => (
          <button
            key={g.value}
            onClick={() => setGameType(g.value)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs ${
              gameType === g.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted"
            }`}
          >
            <span className="text-xl">{g.emoji}</span>
            {g.label}
          </button>
        ))}
      </div>

      <input
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
        placeholder="Platform / locatie (optioneel)"
        className="mt-3 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
      />
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        value={initialIn}
        onChange={(e) => setInitialIn(e.target.value)}
        placeholder={gameType === "poker" ? "Buy-in (€, optioneel)" : "Inzet (€, optioneel)"}
        className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
      />

      <button
        onClick={submit}
        disabled={pending}
        className="mt-3 w-full rounded-xl bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Starten…" : "▶ Start sessie + timer"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ActiveSession({ session }: { session: GamblingSessionWithEntries }) {
  const [now, setNow] = useState(() => Date.now());
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [cashout, setCashout] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, run] = useTransition();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const inTotal = sumIn(session.gambling_entries);
  const outTotal = sumOut(session.gambling_entries);
  const net = sessionNet(session);

  function act(fn: () => Promise<void>) {
    setError("");
    run(async () => {
      try {
        await fn();
        setAmount("");
        setLabel("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-accent/40 bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{gameEmoji(session.game_type)}</span>
          <div>
            <p className="text-sm font-medium">{gameLabel(session.game_type)}</p>
            {session.platform && (
              <p className="text-xs text-muted">{session.platform}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl tabular-nums">
            {elapsedLabel(session.started_at, now)}
          </p>
          <p className="text-[11px] text-muted">sessie loopt</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Erin" value={formatEUR(inTotal)} />
        <Stat label="Eruit" value={formatEUR(outTotal)} />
        <Stat
          label="Netto"
          value={formatEUR(net)}
          tone={net > 0 ? "good" : net < 0 ? "bad" : "neutral"}
        />
      </div>

      {/* Add an entry */}
      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Bedrag €"
            className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (rebuy, winst…)"
            className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-2">
          <button
            disabled={pending || !amount}
            onClick={() =>
              act(() =>
                addEntry({
                  sessionId: session.id,
                  kind: "in",
                  amount: Number(amount),
                  label,
                }),
              )
            }
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-red-400 disabled:opacity-40"
          >
            − Geld erin
          </button>
          <button
            disabled={pending || !amount}
            onClick={() =>
              act(() =>
                addEntry({
                  sessionId: session.id,
                  kind: "out",
                  amount: Number(amount),
                  label,
                }),
              )
            }
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-emerald-400 disabled:opacity-40"
          >
            + Cashout
          </button>
        </div>
      </div>

      {/* Entries list */}
      {session.gambling_entries.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {session.gambling_entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="text-muted">
                {e.label || (e.kind === "in" ? "erin" : "eruit")}
              </span>
              <span className="flex items-center gap-3">
                <span
                  className={e.kind === "in" ? "text-red-400" : "text-emerald-400"}
                >
                  {e.kind === "in" ? "−" : "+"}
                  {formatEUR(Number(e.amount))}
                </span>
                <button
                  onClick={() => act(() => deleteEntry(e.id))}
                  className="text-xs text-muted hover:text-red-400"
                  aria-label="verwijderen"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* End session */}
      <div className="mt-4 rounded-xl border border-border p-3">
        <p className="text-xs text-muted">Sessie afsluiten</p>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={cashout}
          onChange={(e) => setCashout(e.target.value)}
          placeholder="Eind-cashout € (optioneel)"
          className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notitie (optioneel)"
          className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          disabled={pending}
          onClick={() =>
            act(() =>
              endSession({
                sessionId: session.id,
                cashout: cashout ? Number(cashout) : undefined,
                notes,
              }),
            )
          }
          className="mt-2 w-full rounded-xl bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          ⏹ Stop & bewaar sessie
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-red-400"
        : "text-text";
  return (
    <div className="rounded-xl border border-border bg-bg p-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}
