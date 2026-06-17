# Apple Health koppelen via Shortcuts

Je iPhone stuurt dagelijks je **stappen** (en optioneel workouts) naar de app.
Geen native app of Mac nodig. Werkt pas zodra de app online staat (Vercel).

## 1. Token ophalen

In de app: **⚙️ Instellingen → ⌚ Apple Health → Sync aanzetten**. Kopieer de
**URL** en het **token** (je hebt ze zo nodig).

## 2. Automatisering maken (stappen)

Op je iPhone in de **Opdrachten**-app (Shortcuts):

1. Tabblad **Automatisering** → **+** → **Persoonlijke automatisering**.
2. Kies **Tijdstip** → bv. elke dag om **23:00** → Volgende.
3. Voeg deze acties toe (zoek ze bovenaan):
   - **Zoek gezondheidsmonsters** (Find Health Samples): Monster = **Stappen**,
     Filter: **Startdatum** is **Vandaag**.
   - **Bereken statistieken** (Calculate Statistics): **Som** van het resultaat.
     → dit is je aantal stappen.
   - **Woordenboek** (Dictionary) met twee velden:
     - `token` (Tekst) = je gekopieerde token
     - `steps` (Getal) = de uitkomst van de vorige stap
   - **Open URL ophalen** (Get Contents of URL):
     - URL = de gekopieerde URL (eindigt op `/api/health/ingest`)
     - **Methode**: POST
     - **Verzoektekst**: **JSON**
     - Body = het **Woordenboek** van hierboven
4. Zet **"Vraag voor uitvoeren"** uit (zodat het automatisch gebeurt).
5. Bewaar.

Test: open de automatisering en druk op ▶. Ga in de app naar **🏃 Beweging** —
je stappen van vandaag zouden moeten verschijnen.

## 3. (Optioneel) Workouts meesturen

Wil je ook je sportsessies automatisch? Voeg in dezelfde automatisering toe:

- **Zoek workouts** (Find Workouts), filter Startdatum = Vandaag.
- **Herhaal met elk** (Repeat with Each) → bouw per workout een woordenboek:
  `type` (bv. Activiteitstype), `duration_min`, `start` (Startdatum als tekst).
- Verzamel die in een lijst en stuur ze mee in het JSON-veld `workouts`.

Dit is wat meer gepruts in Shortcuts. Tot je dit instelt, log je een sessie
gewoon in de app (**🏃 Beweging → Sport loggen**) of via de **Coach**
(“net 90 min gepadeld”).

## Wat het endpoint accepteert

`POST /api/health/ingest` met JSON:

```json
{
  "token": "jouw-token",
  "date": "2026-06-17",
  "steps": 8421,
  "active_minutes": 45,
  "active_calories": 520,
  "workouts": [
    { "type": "padel", "duration_min": 90, "start": "2026-06-17T18:30:00Z" }
  ]
}
```

Alle velden behalve `token` zijn optioneel. `date` standaard = vandaag (Brussel).
Workouts met dezelfde `start`/`external_id` worden niet dubbel toegevoegd.
