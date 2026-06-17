# Lokaal aan de praat krijgen (stap voor stap)

Je Supabase-project en sleutels staan al in `.env.local`. Je moet nu nog twee
dingen doen: de tabellen aanmaken en je inloggebruiker.

## Stap 1 — Tabellen aanmaken in Supabase

1. Ga naar [supabase.com](https://supabase.com) en open je project.
2. Klik links op **SQL Editor**.
3. Klik **+ New query**.
4. Open in Cursor het bestand **`supabase/setup_all.sql`**, selecteer alles
   (Ctrl+A) en kopieer (Ctrl+C).
5. Plak het in de SQL Editor en klik **Run** (rechtsonder).
6. Je zou onderaan "Success" moeten zien. Dit maakt alle tabellen +
   beveiligingsregels aan.

## Stap 2 — Je inloggebruiker aanmaken

1. In Supabase, klik links op **Authentication**.
2. Klik op **Users** → **Add user** → **Create new user**.
3. Vul je **e-mail** en een **wachtwoord** in.
4. Vink **Auto Confirm User** aan (zodat je geen bevestigingsmail nodig hebt).
5. Klik **Create user**.

Dit e-mailadres + wachtwoord is voortaan je login voor de app.

## Stap 3 — App herstarten

In de Cursor-terminal:

1. Stop de server met **Ctrl + C**.
2. Wis de cache en herstart:

   ```powershell
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

3. Open de URL die in de terminal staat (bv. `http://localhost:3001`).
4. Log in met je e-mail + wachtwoord uit stap 2.

## Klaar 🎉

Nu werkt alles lokaal: je dagelijkse check-in, slaap-knoppen, gokken en je
profiel worden echt opgeslagen in Supabase.

> **Meldingen** (push naar je iPhone) werken pas ná een Vercel-deploy — dat is
> een aparte stap, zie `SETUP-PUSH.md`. Niet nodig om lokaal te testen.
