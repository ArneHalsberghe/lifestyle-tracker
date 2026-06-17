import type { createClient } from "@/lib/supabase/server";
import type { ToolDef } from "@/lib/anthropic";

type DB = Awaited<ReturnType<typeof createClient>>;

function brusselsToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(new Date());
}

// Tool definitions exposed to Claude.
export const TOOLS: ToolDef[] = [
  {
    name: "log_nap",
    description:
      "Registreer een dutje (overdag slapen). Gebruik dit als Arne zegt dat hij een dutje deed en bevestigt dat hij het wil registreren.",
    input_schema: {
      type: "object",
      properties: {
        duration_min: { type: "number", description: "Duur in minuten" },
        note: { type: "string" },
      },
    },
  },
  {
    name: "log_workout",
    description:
      "Registreer een sport-/bewegingssessie (bv. padel, wandelen, fitness).",
    input_schema: {
      type: "object",
      properties: {
        activity_type: { type: "string", description: "bv. padel, wandelen, fitness" },
        duration_min: { type: "number" },
        distance_km: { type: "number" },
        note: { type: "string" },
      },
      required: ["activity_type"],
    },
  },
  {
    name: "log_gambling",
    description:
      "Registreer een afgesloten goksessie met inzet en cashout.",
    input_schema: {
      type: "object",
      properties: {
        game_type: {
          type: "string",
          enum: ["poker", "sportweddenschap", "casino", "online", "andere"],
        },
        stake: { type: "number", description: "Totaal ingezet (€)" },
        cashout: { type: "number", description: "Totaal uitbetaald (€)" },
        duration_min: { type: "number" },
        note: { type: "string" },
      },
      required: ["game_type"],
    },
  },
  {
    name: "log_work",
    description: "Registreer werk-activiteit van vandaag (uren, leads, deals, ...).",
    input_schema: {
      type: "object",
      properties: {
        hours_worked: { type: "number" },
        leads_called: { type: "number" },
        conversations: { type: "number" },
        appointments: { type: "number" },
        demos: { type: "number" },
        deals: { type: "number" },
        revenue: { type: "number" },
        note: { type: "string" },
      },
    },
  },
  {
    name: "log_meal",
    description:
      "Registreer of Arne een maaltijd at en of die gezond was.",
    input_schema: {
      type: "object",
      properties: {
        meal: { type: "string", enum: ["breakfast", "lunch", "dinner"] },
        eaten: { type: "boolean" },
        healthy: { type: "boolean" },
      },
      required: ["meal", "eaten"],
    },
  },
  {
    name: "log_snack",
    description: "Registreer een snack, met of die gezond was.",
    input_schema: {
      type: "object",
      properties: {
        healthy: { type: "boolean" },
        note: { type: "string" },
      },
    },
  },
  {
    name: "log_alcohol",
    description: "Voeg alcoholische consumpties van vandaag toe (aantal glazen).",
    input_schema: {
      type: "object",
      properties: { units: { type: "number" } },
      required: ["units"],
    },
  },
];

type Input = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" ? v : undefined);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

const MEAL_COLS: Record<string, { eaten: string; healthy: string }> = {
  breakfast: { eaten: "breakfast_eaten", healthy: "breakfast_healthy" },
  lunch: { eaten: "lunch_eaten", healthy: "lunch_healthy" },
  dinner: { eaten: "dinner_eaten", healthy: "dinner_healthy" },
};

/** Executes a tool call. Returns a short result string for the model. */
export async function runTool(
  supabase: DB,
  userId: string,
  name: string,
  input: Input,
): Promise<string> {
  const today = brusselsToday();

  switch (name) {
    case "log_nap": {
      const { error } = await supabase.from("naps").insert({
        user_id: userId,
        date: today,
        duration_min: num(input.duration_min) ?? null,
        note: str(input.note) ?? null,
      });
      if (error) return `Fout: ${error.message}`;
      return `Dutje geregistreerd${num(input.duration_min) ? ` (${num(input.duration_min)} min)` : ""}.`;
    }

    case "log_workout": {
      const { error } = await supabase.from("workouts").insert({
        user_id: userId,
        started_at: new Date().toISOString(),
        activity_type: str(input.activity_type) ?? "sport",
        duration_min: num(input.duration_min) ?? null,
        distance_km: num(input.distance_km) ?? null,
        source: "manueel",
        notes: str(input.note) ?? null,
      });
      if (error) return `Fout: ${error.message}`;
      return `Sportsessie geregistreerd: ${str(input.activity_type)}.`;
    }

    case "log_gambling": {
      const duration = num(input.duration_min);
      const now = Date.now();
      const startedAt = duration
        ? new Date(now - duration * 60000).toISOString()
        : new Date(now).toISOString();
      const { data: session, error } = await supabase
        .from("gambling_sessions")
        .insert({
          user_id: userId,
          game_type: str(input.game_type) ?? "andere",
          started_at: startedAt,
          ended_at: new Date(now).toISOString(),
        })
        .select("id")
        .single();
      if (error || !session) return `Fout: ${error?.message ?? "geen sessie"}`;

      const stake = num(input.stake);
      const cashout = num(input.cashout);
      const entries = [];
      if (stake && stake > 0)
        entries.push({ user_id: userId, session_id: session.id, kind: "in", amount: stake, label: "inzet" });
      if (cashout && cashout > 0)
        entries.push({ user_id: userId, session_id: session.id, kind: "out", amount: cashout, label: "cashout" });
      if (entries.length) await supabase.from("gambling_entries").insert(entries);

      const net = (cashout ?? 0) - (stake ?? 0);
      return `Goksessie geregistreerd (${str(input.game_type)}), netto ${net >= 0 ? "+" : ""}${net}€.`;
    }

    case "log_work": {
      const patch: Input = { user_id: userId, date: today };
      for (const k of [
        "hours_worked",
        "leads_called",
        "conversations",
        "appointments",
        "demos",
        "deals",
        "revenue",
      ]) {
        if (num(input[k]) !== undefined) patch[k] = num(input[k]);
      }
      if (str(input.note)) patch.notes = str(input.note);
      const { error } = await supabase
        .from("work_days")
        .upsert(patch, { onConflict: "user_id,date" });
      if (error) return `Fout: ${error.message}`;
      return "Werk-activiteit geregistreerd voor vandaag.";
    }

    case "log_meal": {
      const meal = str(input.meal) ?? "";
      const cols = MEAL_COLS[meal];
      if (!cols) return "Onbekende maaltijd.";
      const patch: Input = {
        user_id: userId,
        date: today,
        [cols.eaten]: bool(input.eaten) ?? true,
      };
      if (bool(input.healthy) !== undefined) patch[cols.healthy] = bool(input.healthy);
      const { error } = await supabase
        .from("food_days")
        .upsert(patch, { onConflict: "user_id,date" });
      if (error) return `Fout: ${error.message}`;
      return `${meal} geregistreerd.`;
    }

    case "log_snack": {
      const { error } = await supabase.from("snacks").insert({
        user_id: userId,
        date: today,
        healthy: bool(input.healthy) ?? null,
        note: str(input.note) ?? null,
      });
      if (error) return `Fout: ${error.message}`;
      return "Snack geregistreerd.";
    }

    case "log_alcohol": {
      const add = num(input.units) ?? 0;
      const { data: current } = await supabase
        .from("food_days")
        .select("alcohol_units")
        .eq("date", today)
        .maybeSingle();
      const total = (Number(current?.alcohol_units) || 0) + add;
      const { error } = await supabase
        .from("food_days")
        .upsert(
          { user_id: userId, date: today, alcohol_units: total },
          { onConflict: "user_id,date" },
        );
      if (error) return `Fout: ${error.message}`;
      return `Alcohol bijgewerkt: ${total} vandaag.`;
    }

    default:
      return "Onbekende tool.";
  }
}
