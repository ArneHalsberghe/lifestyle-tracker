# Gezondheidsbot + dagboek instellen

De **Coach** (`/dashboard/chat`) is een chat met Claude die je profiel en je
recente data kent, onthoudt in welke mood je zit en waar je mee bezig bent, en
na elk gesprek automatisch een **dagboeknotitie** (`/dashboard/journal`) maakt.

## 1. Database

Draai `supabase/migrations/0007_bot_journal.sql` in de Supabase SQL Editor
(of plak opnieuw `supabase/setup_all.sql`, dat alles bevat).

## 2. Anthropic API-sleutel

1. Ga naar [console.anthropic.com](https://console.anthropic.com).
2. Maak een account en zet er een klein tegoed op (je betaalt per gebruik —
   doorgaans enkele centen per gesprek).
3. **Settings → API Keys → Create Key**, kopieer de sleutel.

## 3. Environment-variabele

Zet in `.env.local` (lokaal) én in **Vercel → Settings → Environment
Variables**:

```env
ANTHROPIC_API_KEY=sk-ant-...
# optioneel:
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001
```

> De API-sleutel is geheim. Niet in een `NEXT_PUBLIC_`-variabele zetten.

## 4. Herstarten

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

Open **💬 Coach** in de app en begin te praten. Na je gesprek verschijnt er een
notitie in **📔 Dagboek**.

## Hoe de bot je context gebruikt

- **Profiel** (uit `/dashboard/profile`): naam, medische achtergrond, doelen.
- **Recente check-ins**: energie, vermoeidheid, brain fog, stress, geluk.
- **Eten vandaag**: maaltijden + alcohol.
- **Geheugen**: een lopend overzicht dat de bot zelf bijwerkt (mood + waar je
  mee bezig bent). Dit verbetert naarmate je meer praat.

Tijden, toon en gedrag staan in `app/api/chat/route.ts` als je iets wil
aanpassen.

## Registreren via de chat

Vertel de coach gewoon wat je deed — bv. "ik heb een dutje van 30 min gedaan",
"net gepadeld", "2 uur gewerkt en 3 demo's gedaan", "50 euro verloren met
poker", of "ik heb gezond geluncht". Hij vraagt of je het wil registreren en
slaat het na je bevestiging op in de juiste plek (dutjes, sport, gokken, werk,
maaltijden, snacks, alcohol). De logica/tools staan in `lib/chatTools.ts`.
