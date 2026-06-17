# Meldingen (web push) instellen

Push werkt op je iPhone **alleen** als:

1. de app via **https** draait (dus gedeployed op Vercel — niet localhost),
2. je de app **op je beginscherm** hebt gezet (Safari → deelknop → “Zet op
   beginscherm”) en je ‘m van daaruit opent (iOS 16.4 of hoger),
3. je in de app op **Meldingen → Aanzetten** toestemming geeft.

Volg deze stappen.

## 1. VAPID-sleutels genereren

VAPID-sleutels identificeren jouw server bij de push-dienst. Genereer ze één
keer:

```bash
npx web-push generate-vapid-keys
```

Je krijgt een **Public Key** en een **Private Key**.

## 2. Environment-variabelen

Zet deze in `.env.local` (lokaal) én in **Vercel → Project → Settings →
Environment Variables**:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key uit stap 1>
VAPID_PRIVATE_KEY=<private key uit stap 1>
VAPID_SUBJECT=mailto:arne@halcoservices.be

# Supabase service-role key: Supabase > Settings > API > service_role
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# Verzin zelf een lange willekeurige string
CRON_SECRET=<bv. 32 willekeurige tekens>
```

> De `SUPABASE_SERVICE_ROLE_KEY` is geheim en geeft volledige toegang. Zet hem
> nooit in client-code of in een `NEXT_PUBLIC_`-variabele.

## 3. Database

Draai `supabase/migrations/0005_push.sql` in de Supabase SQL Editor (maakt
`push_subscriptions` en `reminder_log`).

## 4. Deployen + abonneren

1. Deploy naar Vercel.
2. Open je Vercel-URL op je iPhone in **Safari** → **Zet op beginscherm**.
3. Open de app via dat icoon → **Meldingen** → **Aanzetten** → geef toestemming.
4. Klik **Stuur een testmelding** om te checken dat het werkt.

## 5. De herinneringen plannen

De server stuurt de herinneringen via `/api/push/cron`. Die endpoint kijkt zelf
naar de Brusselse tijd en verstuurt de juiste melding (en maar één keer per dag).
Je moet die endpoint alleen **regelmatig laten oproepen**.

### Aanbevolen: cron-job.org (gratis, precies)

1. Maak een gratis account op [cron-job.org](https://cron-job.org).
2. Nieuwe cronjob:
   - **URL**: `https://JOUW-APP.vercel.app/api/push/cron?secret=JOUW_CRON_SECRET`
   - **Schema**: elke 10 minuten (`*/10 * * * *`)
3. Opslaan. Klaar — je krijgt je meldingen rond:
   - **21:00** check-in reminder
   - **22:45** telefoon weg / slapen
   - **09:00** opstaan
   - **15:00** even rechtstaan (geen dutje)

### Alternatief: Vercel Cron

Vercel Hobby laat crons enkel **per uur** toe en kan binnen dat uur op een
willekeurig moment vuren — te onnauwkeurig voor 22:45. Gebruik dit alleen op een
**Pro**-plan. Voeg dan een `vercel.json` toe:

```json
{
  "crons": [{ "path": "/api/push/cron", "schedule": "*/10 * * * *" }]
}
```

Met Vercel Cron stuurt Vercel automatisch de `Authorization: Bearer <CRON_SECRET>`
header mee, dus de `?secret=`-parameter is dan niet nodig.

## Herinneringen aanpassen

Tijden en teksten staan in `lib/reminders.ts`. Pas ze aan en deploy opnieuw.
