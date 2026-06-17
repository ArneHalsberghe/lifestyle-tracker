// Scheduled reminders. Times are in the Europe/Brussels zone.
// The cron endpoint checks the current Brussels time/weekday against these.

export interface Reminder {
  key: string;
  hour: number;
  minute: number;
  windowMin: number; // hoelang na de tijd nog mag versturen
  isoWeekday?: number; // optioneel: 1 = maandag ... 7 = zondag
  title: string;
  body: string;
  url: string;
}

export const REMINDERS: Reminder[] = [
  {
    key: "wake",
    hour: 9,
    minute: 0,
    windowMin: 40,
    title: "Goeiemorgen ☀️",
    body: "Tijd om op te staan en je dag te starten.",
    url: "/dashboard/sleep",
  },
  {
    key: "weight",
    hour: 10,
    minute: 0,
    windowMin: 40,
    isoWeekday: 1, // maandag
    title: "Wegen ⚖️",
    body: "Het is maandag — log even je gewicht.",
    url: "/dashboard/move",
  },
  {
    key: "nonap",
    hour: 15,
    minute: 0,
    windowMin: 40,
    title: "Even rechtstaan 🚶",
    body: "Geen dutje — sta even op, neem wat licht en beweeg kort.",
    url: "/dashboard",
  },
  {
    key: "work_hours",
    hour: 18,
    minute: 0,
    windowMin: 40,
    title: "Werkdag afsluiten 💼",
    body: "Hoeveel uur heb je vandaag gewerkt? Vul het in.",
    url: "/dashboard/work",
  },
  {
    key: "checkin",
    hour: 21,
    minute: 0,
    windowMin: 40,
    title: "Avond-check-in 📋",
    body: "Vul je avond-check-in in (gemoed, eten, uitgaven).",
    url: "/dashboard/checkin",
  },
  {
    key: "bedtime",
    hour: 22,
    minute: 45,
    windowMin: 40,
    title: "Leg je telefoon weg 📵",
    body: "Tijd om af te bouwen en te gaan slapen (venster 23–24u).",
    url: "/dashboard/sleep",
  },
];

export interface ReminderPref {
  reminder_key: string;
  enabled: boolean;
  hour: number;
  minute: number;
}

export type ResolvedReminder = Reminder & { enabled: boolean };

/** Merge the default reminders with the user's saved preferences. */
export function resolveReminders(prefs: ReminderPref[]): ResolvedReminder[] {
  const byKey = new Map(prefs.map((p) => [p.reminder_key, p]));
  return REMINDERS.map((r) => {
    const p = byKey.get(r.key);
    return {
      ...r,
      enabled: p ? p.enabled : true,
      hour: p ? p.hour : r.hour,
      minute: p ? p.minute : r.minute,
    };
  });
}

/** Reminders that are currently "due" given a Brussels time + weekday. */
export function dueReminders(
  list: ResolvedReminder[],
  h: number,
  m: number,
  isoWeekday: number,
): ResolvedReminder[] {
  const nowMin = h * 60 + m;
  return list.filter((r) => {
    if (!r.enabled) return false;
    if (r.isoWeekday && r.isoWeekday !== isoWeekday) return false;
    const start = r.hour * 60 + r.minute;
    return nowMin >= start && nowMin < start + r.windowMin;
  });
}
