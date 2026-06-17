import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ChatUI from "./ChatUI";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("role, content")
    .order("created_at", { ascending: true })
    .limit(100);

  const initial = (data ?? []) as { role: "user" | "assistant"; content: string }[];

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">💬 Coach</h1>
        <div className="flex gap-3 text-xs text-muted">
          <Link href="/dashboard/journal">📔 Dagboek</Link>
          <Link href="/dashboard">← Dashboard</Link>
        </div>
      </header>

      <ChatUI initial={initial} />
    </main>
  );
}
