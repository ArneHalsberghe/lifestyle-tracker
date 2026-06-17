import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddNote from "./AddNote";

export const dynamic = "force-dynamic";

interface Entry {
  id: string;
  date: string;
  content: string;
  source: "bot" | "self";
}

export default async function JournalPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select("id, date, content, source")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const entries = (data ?? []) as Entry[];

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">📔 Dagboek</h1>
        <div className="flex gap-3 text-xs text-muted">
          <Link href="/dashboard/chat">💬 Coach</Link>
          <Link href="/dashboard">← Dashboard</Link>
        </div>
      </header>
      <p className="mt-1 text-sm text-muted">
        Automatische notities van je coach plus je eigen notities.
      </p>

      <div className="mt-4">
        <AddNote />
      </div>

      {entries.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          Nog geen dagboeknotities. Praat met je coach of voeg er zelf één toe.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  {new Intl.DateTimeFormat("nl-BE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(e.date))}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    e.source === "bot"
                      ? "bg-accent/15 text-accent"
                      : "border border-border text-muted"
                  }`}
                >
                  {e.source === "bot" ? "coach" : "jij"}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {e.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
