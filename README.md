# Lifestyle Tracker

<!-- live op Vercel (public repo) -->

Persoonlijke PWA om je levensstijl te tracken: slaap & energie, eten & drinken,
beweging & sport, en stemming & gewoontes. Gebouwd met **Next.js 15** +
**Supabase**, installeerbaar op je iPhone-beginscherm.

> Dit is **Fase 0**: werkend project met database, login en PWA-skelet.
> Invoer-schermen, grafieken en integraties (Garmin / Apple Health) volgen in
> de volgende fases.

---

## 1. Vereisten

- [Node.js 20+](https://nodejs.org)
- Een gratis [Supabase](https://supabase.com)-account
- (Later, voor deploy) een [Vercel](https://vercel.com)-account

## 2. Installeren

```bash
cd lifestyle-tracker
npm install
```

## 3. Supabase opzetten

1. Maak een nieuw project op [supabase.com](https://supabase.com).
2. Ga naar **SQL Editor → New query**, plak de inhoud van
   `supabase/migrations/0001_init.sql` en klik **Run**. Doe daarna hetzelfde met
   `supabase/migrations/0002_gambling.sql` (de gok-module) en
   `supabase/migrations/0003_full_profile.sql` (profiel + alle dashboards:
   energie, vermoeidheid, gemoed, voeding, Fabry, werk, financieel, crypto,
   sociaal, gewoontes) en `supabase/migrations/0004_sleep_buttons.sql`
   (slaap-knoppen + dutjes), `supabase/migrations/0005_push.sql` (meldingen) en
   `supabase/migrations/0006_food_phases.sql` (eten & drinken + check-in fases)
   `supabase/migrations/0007_bot_journal.sql` (coach + dagboek) en
   `supabase/migrations/0008_work_finance.sql` (werk & geld),
   `supabase/migrations/0009_settings.sql` (instellingen + belasting + huishouden)
   `supabase/migrations/0010_reminder_prefs.sql` (instelbare meldingen) en
   `supabase/migrations/0011_health_token.sql` (Apple Health-sync).
   Dit maakt alle tabellen + Row Level Security aan.

   > Sneller: plak in één keer `supabase/setup_all.sql` (bevat alle migraties).
3. Ga naar **Settings → API** en kopieer de **Project URL** en de **anon public
   key**.

## 4. Environment-variabelen

Kopieer het voorbeeldbestand en vul je sleutels in:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://JOUW-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 5. Je account aanmaken (eenmalig)

Deze app gebruikt **e-mail + wachtwoord**. Omdat jij de enige gebruiker bent,
maak je je account één keer aan in het Supabase-dashboard:

1. Ga naar **Authentication → Users → Add user → Create new user**.
2. Vul je e-mail en wachtwoord in en vink **"Auto Confirm User"** aan
   (zo hoef je geen bevestigingsmail af te wachten).
3. Klaar — met deze gegevens log je in de app in.

> Geen registratiescherm in de app: dat houdt 'm dicht. Wil je je wachtwoord
> wijzigen, dan kan dat in het Supabase-dashboard.

## 6. Draaien

```bash
npm run dev
```

Open <http://localhost:3000>. Log in met je e-mail + wachtwoord → dashboard.

## 7. Op je iPhone installeren (PWA)

De service worker draait alleen in een **production build** (niet in `dev`):

```bash
npm run build && npm run start
```

Om hem écht op je telefoon te zetten, deploy je naar Vercel (gratis):

1. Push deze map naar een GitHub-repo.
2. Importeer de repo op [vercel.com](https://vercel.com).
3. Zet dezelfde env-variabelen in Vercel (met je Vercel-URL als
   `NEXT_PUBLIC_SITE_URL`, en voeg `.../auth/confirm` toe aan de Supabase
   Redirect URLs).
4. Open de Vercel-URL op je iPhone in **Safari** → deelknop → **"Zet op
   beginscherm"**. Nu staat de app als icoon op je toestel.

---

## Projectstructuur

```
lifestyle-tracker/
├── app/
│   ├── layout.tsx            # root layout + PWA meta-tags
│   ├── manifest.ts           # PWA manifest
│   ├── sw.ts                 # service worker (Serwist)
│   ├── page.tsx              # redirect naar /login of /dashboard
│   ├── login/page.tsx        # e-mail + wachtwoord login
│   ├── auth/confirm/route.ts # optioneel e-maillink-handler (reset etc.)
│   ├── auth/signout/route.ts # uitloggen
│   └── dashboard/            # beveiligd gedeelte + categorie-pagina's
├── components/BottomNav.tsx  # mobiele tab-balk
├── lib/
│   ├── supabase/             # client / server / middleware
│   └── types.ts              # datamodel-types
├── supabase/migrations/      # database-schema + RLS
└── public/icons/             # app-iconen
```

## Gok-module

Onder **🎲 Gokken** (`/dashboard/gambling`):

- **Sessie-timer**: start een sessie per type (poker, sportweddenschap, casino,
  online, andere); de timer loopt live.
- **Geld erin / eruit**: log buy-ins, rebuys, stortingen en cashouts los — werkt
  voor elk soort spel. Netto = eruit − erin.
- **Statistieken**: netto totaal, win-ratio, tijd, en een grafiek netto-per-week.
- **Weekbudget**: stel een max. wekelijks verlies in; de app waarschuwt je als je
  in de buurt komt of eroverheen gaat, met een discrete verwijzing naar hulp.

## Check-in (3x per dag)

Onder **📋 Check-in** (`/dashboard/checkin`) — opgedeeld in **ochtend, middag en
avond**, met de juiste vragen per moment (de app opent automatisch de juiste
fase):

- **Ochtend**: op tijd geslapen?, op tijd op?, ochtendenergie, vermoeidheid,
  brain fog, angst, motivatie.
- **Middag**: ontbijt & middagmaal (gegeten + gezond?), middagenergie,
  concentratie, belastbaarheid, overprikkeling, geen dutje.
- **Avond**: avondmaal, alcohol, avondenergie, geluk, stress, sociale batterij,
  eenzaamheid, de resterende gewoontes en een notitie.
- **Trendgrafieken** (30 dagen) + **inzichten/correlaties** (bv. stress ↔
  vermoeidheid, motivatie ↔ energie).

## Eten & drinken

Onder **🍽️ Eten & drinken** (`/dashboard/food`) — geen calorieën tellen:

- Per maaltijd aanduiden of je at **en of het gezond was**.
- **Snacks** loggen met tijdstip + gezond/ongezond.
- **Alcohol** (aantal glazen) en je **eerste/laatste cafeïne** van de dag.

## Slaap

Onder **😴 Slaap** (`/dashboard/sleep`):

- Twee grote knoppen: **📵 Telefoon weg — slapen** en **☀️ Dag starten — gsm
  nemen**. Daaruit berekent de app je bedtijd, opstaan en slaapduur.
- **Doelcheck**: bedtijd binnen 23–24u en opstaan rond 9u (groen/amber/rood).
- **Dutjes melden** (doel: 0 overdag) met duur en notitie.
- Overzicht van je recente nachten.

## Meldingen (web push)

Onder **🔔 Meldingen** (`/dashboard/notifications`) zet je push-meldingen aan.
Vaste herinneringen: check-in (21:00), telefoon weg (22:45), opstaan (09:00) en
een namiddag-nudge (15:00).

Push werkt op iPhone alleen vanuit de **op het beginscherm geïnstalleerde** app
(iOS 16.4+) en vereist een Vercel-deploy + VAPID-sleutels. Zie **SETUP-PUSH.md**
voor de volledige instellingen.

## Werk & geld

Onder **💼 Werk & geld** (`/dashboard/work`): maak freelance-projecten aan met
een **uurtarief**, log je uren per project per dag, en de app berekent je
verdiensten (vandaag/week/maand). Stel je **vaste maandkosten** in; samen met je
dagelijkse uitgaven (avond-check-in) toont de app je **netto deze maand**. Je
krijgt om **18:00** een melding om je uren in te vullen.

## Beweging & gewicht

Onder **🏃 Beweging** (`/dashboard/move`): log je **gewicht** (wekelijks, met
maandag-melding) en je **sportsessies** (lopen, fietsen, wandelen, padel,
zwemmen + duur). **Stappen** komen uit **Apple Health** via een iPhone-Shortcut
die dagelijks naar `/api/health/ingest` post — zie **SETUP-HEALTH.md**. (De
volledige native koppeling via Capacitor kan later.)

## Coach & dagboek

Onder **💬 Coach** (`/dashboard/chat`) praat je op elk moment met een
Claude-gestuurde gezondheids- en levenscoach. Hij kent je profiel en recente
data, onthoudt je mood en waar je mee bezig bent, en maakt na elk gesprek een
notitie in **📔 Dagboek** (`/dashboard/journal`), waar je ook eigen notities kunt
typen. Vereist een Anthropic API-sleutel — zie **SETUP-BOT.md**.

## Instellingen

Onder **⚙️ Instellingen** (`/dashboard/settings`):

- **Dagelijks huishouden**: doel aan/uit + duur (min/dag); vink je af in de
  avond-check-in.
- **Belasting**: percentage dat naar belasting gaat (standaard ~50%); je
  werk-verdiensten worden netto getoond.
- **Meldingen**: per melding aan/uit en het uur instellen.

## Profiel

Onder **👤 Profiel** (`/dashboard/profile`) staat je persoonlijk profiel,
medische achtergrond, doelen en KPI's — vooraf ingevuld, met één klik te bewaren.

## Roadmap

- **Fase 0 — Fundament** ✅
- **Gok-module** ✅
- **Profiel + volledig datamodel** ✅
- **Dagelijkse check-in (energie/vermoeidheid/gemoed/gewoontes)** ✅
- **Volgende** — slaap & lichaam, voeding & beweging, werk/geld/crypto; daarna
  cross-domein inzichten (slaap ↔ Fabry, alcohol ↔ energie, beweging ↔ gemoed)
- **Fase 2** — PWA-afwerking (offline, snelinvoer, herinneringen)
- **Fase 3** — Capacitor-wrapper + Apple Health
- **Fase 4** — Garmin (via Apple Health, bestandsimport, of Health API)
