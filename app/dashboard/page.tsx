import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function today() {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

const cards = [
  { title: "Slaap", emoji: "😴", hint: "Nog niet gelogd vandaag", href: "/dashboard/sleep" },
  { title: "Eten & drinken", emoji: "🍽️", hint: "Nog niets toegevoegd", href: "/dashboard/food" },
  { title: "Beweging", emoji: "🏃", hint: "Geen workout vandaag", href: "/dashboard/move" },
  { title: "Stemming", emoji: "🙂", hint: "Hoe voel je je?", href: "/dashboard/mood" },
  { title: "Gokken", emoji: "🎲", hint: "Start een sessie of bekijk stats", href: "/dashboard/gambling" },
  { title: "Werk & geld", emoji: "💼", hint: "Uren, projecten & verdiensten", href: "/dashboard/work" },
  { title: "Financiën", emoji: "💶", hint: "Inkomsten & uitgaven per maand", href: "/dashboard/finance" },
  { title: "Statistieken", emoji: "📊", hint: "Grafieken, cijfers & verbanden", href: "/dashboard/stats" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="px-4 pt-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm capitalize text-muted">{today()}</p>
          <h1 className="mt-1 text-2xl font-semibold">Goeiedag 👋</h1>
          <p className="mt-1 text-xs text-muted">{user?.email}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href="/dashboard/notifications"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted"
          >
            🔔 Meldingen
          </Link>
          <Link
            href="/dashboard/profile"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted"
          >
            👤 Profiel
          </Link>
          <Link
            href="/dashboard/settings"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted"
          >
            ⚙️ Instellingen
          </Link>
          <form action="/auth/signout" method="post">
            <button className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted">
              Uitloggen
            </button>
          </form>
        </div>
      </header>

      <Link
        href="/dashboard/checkin"
        className="mt-6 flex items-center justify-between rounded-2xl bg-accent px-5 py-4 text-white shadow-lg transition active:scale-[0.98]"
      >
        <span>
          <span className="block text-base font-semibold">
            📋 Vandaag inchecken
          </span>
          <span className="block text-xs text-white/80">
            Energie, vermoeidheid, gemoed & gewoontes
          </span>
        </span>
        <span className="text-2xl">→</span>
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/chat"
          className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 transition active:scale-[0.98]"
        >
          <span className="text-2xl">💬</span>
          <span className="text-sm font-medium">Coach</span>
        </Link>
        <Link
          href="/dashboard/journal"
          className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 transition active:scale-[0.98]"
        >
          <span className="text-2xl">📔</span>
          <span className="text-sm font-medium">Dagboek</span>
        </Link>
      </div>

      <section className="mt-4 grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="rounded-2xl border border-border bg-surface p-4 transition active:scale-[0.98]"
          >
            <div className="text-2xl">{c.emoji}</div>
            <h2 className="mt-2 text-sm font-medium">{c.title}</h2>
            <p className="mt-1 text-xs text-muted">{c.hint}</p>
          </Link>
        ))}
      </section>

      <p className="mt-8 text-center text-xs text-muted">
        Fase 0 staat ✓ — invoer-schermen en grafieken volgen in fase 1.
      </p>
    </main>
  );
}
