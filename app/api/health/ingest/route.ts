import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function brusselsToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(new Date());
}

function getToken(req: NextRequest, body: Record<string, unknown>): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const header = req.headers.get("x-health-token");
  if (header) return header;
  const q = req.nextUrl.searchParams.get("token");
  if (q) return q;
  if (typeof body.token === "string") return body.token;
  return null;
}

const num = (v: unknown) =>
  v === null || v === undefined || v === "" ? undefined : Number(v);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const token = getToken(req, body);
  if (!token) return NextResponse.json({ error: "no token" }, { status: 401 });

  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("app_settings")
    .select("user_id")
    .eq("health_token", token)
    .maybeSingle();
  if (!owner) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const userId = owner.user_id as string;
  const date = (typeof body.date === "string" && body.date) || brusselsToday();

  // ---- daily activity (steps etc.) ----
  const activity: Record<string, unknown> = {
    user_id: userId,
    date,
    source: "apple_health",
  };
  let hasActivity = false;
  for (const [key, col] of [
    ["steps", "steps"],
    ["active_minutes", "active_minutes"],
    ["active_calories", "active_calories"],
    ["resting_hr", "resting_hr"],
    ["floors", "floors"],
  ] as const) {
    const v = num(body[key]);
    if (v !== undefined && !Number.isNaN(v)) {
      activity[col] = Math.round(v);
      hasActivity = true;
    }
  }
  if (hasActivity) {
    await admin
      .from("daily_activity")
      .upsert(activity, { onConflict: "user_id,date,source" });
  }

  // ---- workouts ----
  let workoutsAdded = 0;
  const workouts = Array.isArray(body.workouts) ? body.workouts : [];
  for (const raw of workouts) {
    const w = raw as Record<string, unknown>;
    const type = typeof w.type === "string" ? w.type : "workout";
    const startedAt =
      (typeof w.start === "string" && w.start) || new Date().toISOString();
    const externalId =
      (typeof w.external_id === "string" && w.external_id) ||
      (typeof w.start === "string" ? w.start : null);

    const row = {
      user_id: userId,
      started_at: startedAt,
      activity_type: type,
      duration_min: num(w.duration_min) ?? null,
      distance_km: num(w.distance_km) ?? null,
      calories: num(w.calories) ?? null,
      source: "apple_health",
      external_id: externalId,
    };

    if (externalId) {
      await admin.from("workouts").upsert(row, { onConflict: "source,external_id" });
    } else {
      await admin.from("workouts").insert(row);
    }
    workoutsAdded++;
  }

  return NextResponse.json({
    ok: true,
    date,
    activity: hasActivity,
    workouts: workoutsAdded,
  });
}
