import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_DEFAULTS } from "@/lib/profileDefaults";
import type { ProfileInput } from "./actions";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profile")
    .select("*")
    .maybeSingle();

  const saved = Boolean(data);
  const initial: ProfileInput = saved
    ? {
        full_name: data!.full_name ?? "",
        birthdate: data!.birthdate ?? null,
        height_cm: data!.height_cm ?? null,
        location: data!.location ?? "",
        occupation: data!.occupation ?? "",
        languages: data!.languages ?? "",
        medical_notes: data!.medical_notes ?? "",
        goals: data!.goals ?? "",
        kpis: data!.kpis ?? "",
        report: data!.report ?? "",
      }
    : PROFILE_DEFAULTS;

  return (
    <main className="px-4 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">👤 Profiel</h1>
        <Link href="/dashboard" className="text-xs text-muted">
          ← Dashboard
        </Link>
      </header>
      <p className="mt-1 text-sm text-muted">
        Wie je bent, je medische achtergrond, doelen en KPI's — de basis waar de
        app je data tegen afzet.
      </p>

      <ProfileForm initial={initial} saved={saved} />
    </main>
  );
}
