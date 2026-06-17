import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { resolveReminders, type ReminderPref } from "@/lib/reminders";
import SettingsForm from "./SettingsForm";
import RemindersSettings from "./RemindersSettings";
import HealthSync from "./HealthSync";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: app }, { data: fin }, { data: prefs }] = await Promise.all([
    supabase
      .from("app_settings")
      .select("household_enabled, household_minutes, health_token")
      .maybeSingle(),
    supabase.from("finance_settings").select("income_tax_rate").maybeSingle(),
    supabase
      .from("reminder_prefs")
      .select("reminder_key, enabled, hour, minute"),
  ]);

  const reminders = resolveReminders((prefs ?? []) as ReminderPref[]);

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">⚙️ Instellingen</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>

      <SettingsForm
        householdEnabled={app?.household_enabled ?? true}
        householdMinutes={app?.household_minutes ?? 10}
        taxRatePct={Math.round((Number(fin?.income_tax_rate ?? 0.5)) * 100)}
      />

      <div className="mt-4">
        <RemindersSettings reminders={reminders} />
      </div>

      <div className="mt-4">
        <HealthSync initialToken={app?.health_token ?? null} />
      </div>
    </main>
  );
}
