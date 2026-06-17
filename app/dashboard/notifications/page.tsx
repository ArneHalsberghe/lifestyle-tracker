import Link from "next/link";
import { REMINDERS } from "@/lib/reminders";
import NotificationToggle from "./NotificationToggle";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">🔔 Meldingen</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>
      <p className="mt-1 text-sm text-muted">
        Zet meldingen aan op dit toestel. Werkt op je iPhone enkel vanuit de app
        op je beginscherm (iOS 16.4+).
      </p>

      <div className="mt-5">
        <NotificationToggle />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-medium">Geplande herinneringen</h2>
        <ul className="mt-2 space-y-2">
          {REMINDERS.map((r) => (
            <li key={r.key} className="flex gap-3 text-sm">
              <span className="font-mono tabular-nums text-accent">
                {String(r.hour).padStart(2, "0")}:
                {String(r.minute).padStart(2, "0")}
              </span>
              <span>
                <span className="font-medium">{r.title}</span>
                <span className="block text-xs text-muted">{r.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted">
          De herinneringen worden door de server verstuurd (zie SETUP-PUSH.md
          voor het instellen van de planner).
        </p>
      </section>
    </main>
  );
}
