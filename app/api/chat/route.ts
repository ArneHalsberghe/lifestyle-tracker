import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  callClaude,
  callClaudeRaw,
  textOf,
  parseJsonReply,
  CHAT_MODEL,
  FAST_MODEL,
  type ChatMessage,
  type ContentBlock,
} from "@/lib/anthropic";
import { TOOLS, runTool } from "@/lib/chatTools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function brusselsToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(new Date());
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "geen bericht" }, { status: 400 });
  }

  const today = brusselsToday();

  // ---- gather context ----
  const [{ data: profile }, { data: memory }, { data: recent }, { data: history }, { data: food }] =
    await Promise.all([
      supabase.from("user_profile").select("*").maybeSingle(),
      supabase.from("assistant_memory").select("content").maybeSingle(),
      supabase
        .from("daily_checkins")
        .select("*")
        .order("date", { ascending: false })
        .limit(3),
      supabase
        .from("chat_messages")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(20),
      supabase.from("food_days").select("*").eq("date", today).maybeSingle(),
    ]);

  const system = buildSystemPrompt({ profile, memory: memory?.content, recent, food, today });

  const messages: ChatMessage[] = [
    ...((history ?? []) as ChatMessage[]),
    { role: "user", content: message },
  ];

  let reply = "";
  let usedTool = false;
  try {
    // Tool-use loop: keep going until Claude stops requesting tools.
    for (let i = 0; i < 5; i++) {
      const res = await callClaudeRaw({
        system,
        messages,
        tools: TOOLS,
        model: CHAT_MODEL,
        maxTokens: 1024,
      });

      if (res.stop_reason === "tool_use") {
        usedTool = true;
        messages.push({ role: "assistant", content: res.content });

        const toolResults: ContentBlock[] = [];
        for (const block of res.content) {
          if (block.type === "tool_use") {
            const result = await runTool(supabase, user.id, block.name, block.input);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          }
        }
        messages.push({ role: "user", content: toolResults });
        continue; // let Claude respond to the tool results
      }

      reply = textOf(res.content);
      break;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Claude-fout" },
      { status: 500 },
    );
  }

  if (usedTool) {
    // data changed -> refresh the relevant pages on next navigation
    for (const p of [
      "/dashboard",
      "/dashboard/sleep",
      "/dashboard/food",
      "/dashboard/gambling",
      "/dashboard/checkin",
    ]) {
      revalidatePath(p);
    }
  }

  if (!reply) reply = usedTool ? "Genoteerd 👍" : "Sorry, ik kon even niet antwoorden.";

  // ---- persist the exchange ----
  await supabase.from("chat_messages").insert([
    { user_id: user.id, role: "user", content: message },
    { user_id: user.id, role: "assistant", content: reply },
  ]);

  // ---- reflect: update memory + today's journal (best effort) ----
  try {
    await reflect(supabase, user.id, today, memory?.content ?? "", message, reply);
  } catch {
    // niet kritisch
  }

  return NextResponse.json({ reply });
}

function buildSystemPrompt(ctx: {
  profile: Record<string, unknown> | null;
  memory: string | null | undefined;
  recent: Record<string, unknown>[] | null;
  food: Record<string, unknown> | null;
  today: string;
}): string {
  const p = ctx.profile;
  const profileBlock = p
    ? [
        `Naam: ${p.full_name ?? "Arne"}`,
        p.birthdate ? `Geboren: ${p.birthdate}` : "",
        p.medical_notes ? `Medisch: ${p.medical_notes}` : "",
        p.goals ? `Doelen: ${p.goals}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "Naam: Arne";

  const recentBlock =
    (ctx.recent ?? [])
      .map((c) => {
        const e = [c.energy_morning, c.energy_noon, c.energy_evening].filter(
          (v) => v != null,
        ) as number[];
        const energy = e.length ? Math.round(e.reduce((a, b) => a + b, 0) / e.length) : null;
        const bits = [
          energy != null ? `energie ${energy}/10` : "",
          c.fatigue != null ? `vermoeidheid ${c.fatigue}/10` : "",
          c.brain_fog != null ? `brain fog ${c.brain_fog}/10` : "",
          c.stress != null ? `stress ${c.stress}/10` : "",
          c.happiness != null ? `geluk ${c.happiness}/10` : "",
        ].filter(Boolean);
        return bits.length ? `- ${c.date}: ${bits.join(", ")}` : "";
      })
      .filter(Boolean)
      .join("\n") || "(nog geen recente check-ins)";

  const f = ctx.food;
  const foodBlock = f
    ? [
        f.breakfast_eaten != null ? `ontbijt: ${f.breakfast_eaten ? "ja" : "nee"}` : "",
        f.lunch_eaten != null ? `lunch: ${f.lunch_eaten ? "ja" : "nee"}` : "",
        f.dinner_eaten != null ? `avond: ${f.dinner_eaten ? "ja" : "nee"}` : "",
        f.alcohol_units ? `alcohol: ${f.alcohol_units}` : "",
      ]
        .filter(Boolean)
        .join(", ") || "(niets gelogd)"
    : "(niets gelogd)";

  return `Je bent de persoonlijke gezondheids- en levenscoach van Arne, in zijn eigen app. Je praat Vlaams-Nederlands, warm, menselijk en concreet — als een betrokken vriend die hem goed kent. Je mag over alles praten: gezondheid, gevoel, kwaaltjes, business (HALCO), relaties, twijfels.

ZO GEDRAAG JE JE:
- Empathisch en niet-oordelend. Luister eerst, stel gerichte vragen, geef praktische, haalbare suggesties.
- Hou het beknopt en in gesprekstoon (geen lange lijsten tenzij gevraagd).
- Onthoud zijn mood en waar hij mee bezig is, en verwijs er natuurlijk naar.
- Je bent GEEN arts. Geef algemene info over welzijn, maar bij medische beslissingen, nieuwe of ernstige klachten verwijs je hem vriendelijk naar zijn arts/specialist. Speel Fabry- of epilepsie-symptomen niet weg en stel geen diagnoses.
- Als hij ernstige somberheid of gedachten aan zelfbeschadiging uit, reageer dan met zorg en moedig hem aan om contact op te nemen met iemand die hij vertrouwt of professionele hulp.

REGISTREREN IN DE APP (tools):
- Je hebt tools om dingen in de app te registreren: een dutje, sportsessie, goksessie, werk, maaltijd, snack en alcohol.
- Wanneer Arne iets vermeldt wat hierin past (bv. "ik heb een dutje gedaan", "ik heb gepadeld", "ik heb 2u gewerkt", "ik heb 50 euro verloren met poker", "ik heb ontbeten"), VRAAG dan eerst kort en natuurlijk of hij het wil registreren.
- Roep de tool PAS aan nadat hij bevestigt (bv. "ja", "doe maar"). Vraag indien nuttig kort naar ontbrekende details (duur, bedrag, gezond of niet), maar dring niet aan — registreer gerust met wat je hebt.
- Bevestig daarna kort en menselijk dat het geregistreerd is, en ga door met het gesprek.

WAT JE OVER ARNE WEET:
${profileBlock}

WAT JE TOT NU TOE ONTHOUDT (mood, focus, terugkerende dingen):
${ctx.memory?.trim() || "(nog niets — leer hem kennen)"}

RECENTE METINGEN:
${recentBlock}

ETEN VANDAAG (${ctx.today}): ${foodBlock}

Gebruik deze context subtiel; dreun ze niet op. Antwoord nu op zijn bericht.`;
}

async function reflect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  today: string,
  currentMemory: string,
  userMsg: string,
  assistantMsg: string,
) {
  const { data: existing } = await supabase
    .from("journal_entries")
    .select("content")
    .eq("date", today)
    .eq("source", "bot")
    .maybeSingle();

  const system = `Je werkt het geheugen en dagboek van Arne bij. Geef UITSLUITEND geldige JSON terug, niets anders:
{"memory": "<beknopt, herschreven geheugen: huidige mood, waar hij mee bezig is, terugkerende zorgen/voorkeuren — max ~200 woorden>", "journal": "<dagboeknotitie voor vandaag in de ik-vorm, beknopt, op basis van het gesprek — max ~120 woorden>"}`;

  const content = `HUIDIG GEHEUGEN:
${currentMemory || "(leeg)"}

DAGBOEK VANDAAG TOT NU TOE:
${existing?.content || "(leeg)"}

LAATSTE UITWISSELING:
Arne: ${userMsg}
Coach: ${assistantMsg}

Werk het geheugen bij en herschrijf de dagboeknotitie van vandaag zodat ze dit gesprek meeneemt.`;

  const raw = await callClaude({
    system,
    messages: [{ role: "user", content }],
    model: FAST_MODEL,
    maxTokens: 700,
  });

  const parsed = parseJsonReply<{ memory?: string; journal?: string }>(raw);
  if (!parsed) return;

  if (parsed.memory) {
    await supabase
      .from("assistant_memory")
      .upsert({ user_id: userId, content: parsed.memory }, { onConflict: "user_id" });
  }
  if (parsed.journal) {
    // upsert today's bot journal entry
    if (existing) {
      await supabase
        .from("journal_entries")
        .update({ content: parsed.journal })
        .eq("date", today)
        .eq("source", "bot");
    } else {
      await supabase.from("journal_entries").insert({
        user_id: userId,
        date: today,
        content: parsed.journal,
        source: "bot",
      });
    }
  }
}
