import type { ProfileInput } from "@/app/dashboard/profile/actions";

// Pre-filled from the personal profile. Used when no profile is saved yet,
// so it can be persisted with one click.
export const PROFILE_DEFAULTS: ProfileInput = {
  full_name: "Arne Halsberghe",
  birthdate: "1997-02-22",
  height_cm: 171,
  location: "Regio Aalst, België",
  occupation: "Zelfstandig ondernemer — HALCO Services",
  languages: "Nederlands (moedertaal), Engels (vloeiend), Frans (goed), Spaans (begrijpend)",
  medical_notes: [
    "FABRY (late-onset): extreme vermoeidheid, brain fog, concentratieproblemen, wisselende belastbaarheid. Behandeling: maandelijkse Elfabrio-infusie.",
    "EPILEPSIE: >7 jaar aanvalsvrij. Medicatie: Keppra.",
    "MENTAAL: gevoelig voor stress, angst, overprikkeling, slaaponregeling. Medicatie: Sertraline.",
  ].join("\n\n"),
  goals: [
    "Gezondheid: voldoende energie, gezond slaapritme, gewicht onder controle, regelmatig bewegen, vermoeidheid begrijpen, goed leven met Fabry.",
    "Mentaal: minder stress en piekeren, meer rust en structuur, stabiel positief gemoed.",
    "Werk: HALCO uitbouwen, financiële onafhankelijkheid, meer omzet, efficiënter werken, nieuwe klanten.",
    "Persoonlijk: meer regelmaat, gezonde gewoontes, sociale contacten, op termijn een stabiele relatie.",
  ].join("\n\n"),
  kpis: [
    "Energie gemiddeld boven 7/10",
    "Vast slaapritme",
    "Gezond gewicht behouden",
    "Positief gemoed",
    "Financiële groei",
    "Beperkte stress",
    "Regelmatige beweging",
    "Controle over gokken",
    "Groei van HALCO",
    "Hoge levenskwaliteit ondanks Fabry",
  ]
    .map((k, i) => `${i + 1}. ${k}`)
    .join("\n"),
  report: `MISSIE
Een persoonlijk dashboard dat alle belangrijke aspecten van mijn leven bijhoudt, zodat ik meer inzicht krijg in mijn gezondheid en vermoeidheid, patronen ontdek tussen slaap, voeding, stress en energie, financieel overzicht houd, mijn doelen opvolg en mijn levenskwaliteit verbeter ondanks Fabry.

BELANGRIJKSTE INZICHTEN DIE DE APP MOET GENEREREN
- Welke factoren verhogen mijn energie / veroorzaken vermoeidheid?
- Welke invloed heeft slaap op mijn Fabry-klachten?
- Welke invloed heeft alcohol op mijn energie?
- Welke invloed heeft beweging op mijn gemoed?
- Welke invloed heeft stress op mijn vermoeidheid?
- Welke invloed heeft voeding op mijn gewicht?
- Welke invloed heeft sociale activiteit op mijn welzijn?

Het doel is niet alleen cijfers verzamelen, maar begrijpen hoe ik optimaal kan functioneren ondanks Fabry, vermoeidheid en de uitdagingen van het dagelijkse leven.`,
};
