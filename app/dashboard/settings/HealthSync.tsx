"use client";

import { useEffect, useState, useTransition } from "react";
import { generateHealthToken } from "./actions";

export default function HealthSync({ initialToken }: { initialToken: string | null }) {
  const [token, setToken] = useState(initialToken);
  const [origin, setOrigin] = useState("");
  const [pending, run] = useTransition();
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}/api/health/ingest` : "/api/health/ingest";

  function copy(text: string, what: string) {
    navigator.clipboard?.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">⌚ Apple Health (via Shortcuts)</h2>
      <p className="mt-1 text-xs text-muted">
        Laat je iPhone dagelijks stappen en sportsessies hierheen sturen. Zie{" "}
        <strong>SETUP-HEALTH.md</strong> voor de Shortcut-stappen.
      </p>

      {token ? (
        <div className="mt-3 space-y-2">
          <Field label="URL" value={url} onCopy={() => copy(url, "url")} copied={copied === "url"} />
          <Field label="Token" value={token} onCopy={() => copy(token, "token")} copied={copied === "token"} mask />
          <button
            disabled={pending}
            onClick={() => run(async () => setToken(await generateHealthToken()))}
            className="text-xs text-accent"
          >
            Nieuw token genereren (oude vervalt)
          </button>
        </div>
      ) : (
        <button
          disabled={pending}
          onClick={() => run(async () => setToken(await generateHealthToken()))}
          className="mt-3 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Genereren…" : "Sync aanzetten (token genereren)"}
        </button>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onCopy,
  copied,
  mask,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  mask?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <div className="mt-0.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-bg px-2 py-1.5 text-xs">
          {mask ? value.slice(0, 8) + "…" + value.slice(-4) : value}
        </code>
        <button
          onClick={onCopy}
          className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted"
        >
          {copied ? "✓" : "kopieer"}
        </button>
      </div>
    </div>
  );
}
